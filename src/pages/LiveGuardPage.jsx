import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { useLiveAccount } from '../hooks/useLiveAccount';
import { sessionOf, fmtMoney, splitDecimal, ruleConfig } from '../lib/session';
import { computeRule } from '../components/dashboard/RuleStatusCards';
import { fetchJournalTrades } from '../api/tradesApi';
import { armLockout, LOCKOUT_HOUR_OPTIONS } from '../api/userApi';
import { setRuleLockDays } from '../api/tradingAccountsApi';
import { RULE_GLYPH, ruleAccent } from '../components/dashboard/shell/icons';
import { sx } from '../components/dashboard/shell/sx';
import { formatRemaining } from '../components/dashboard/shell/format';
import { ruleLockNow } from '../lib/guard';

/**
 * Live guard — transcribed from the reference (lines 686–1009).
 * Session hero · cooldown (rule-triggered, its own section) · Commitment
 * controls (manual killswitch + rule lock, inline) · Open positions · Rule panel.
 * The demo-only "Simulate three losses" / "Clear (demo only)" affordances are
 * not built: the app runs on real state.
 */

const POLL_MS = 15_000;
const MONO_LABEL = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-faint)";
const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const HOUR_ON = "flex:1;padding:11px;border-radius:11px;font:600 13px/1 'Space Grotesk',sans-serif;border:1px solid var(--ink);background:var(--ink);color:var(--surface)";
const HOUR_OFF = "flex:1;padding:11px;border-radius:11px;font:600 13px/1 'Space Grotesk',sans-serif;border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2)";
const DAY_ON = "padding:11px 4px;border-radius:11px;font:600 13px/1 'Space Grotesk',sans-serif;border:1px solid var(--ink);background:var(--ink);color:var(--surface)";
const DAY_OFF = "padding:11px 4px;border-radius:11px;font:600 13px/1 'Space Grotesk',sans-serif;border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2)";

function clockAt(t, tz) {
  if (!t) return '—';
  return `${new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })} IST`;
}
function dayAt(t, tz) {
  if (!t) return '';
  const d = new Date(t).toLocaleDateString('en-IN', { timeZone: tz });
  const n = new Date().toLocaleDateString('en-IN', { timeZone: tz });
  return d === n ? 'today' : 'tomorrow';
}
function pick(o, ...keys) { for (const k of keys) if (o && o[k] != null) return o[k]; return null; }

export default function LiveGuardPage() {
  const { session } = useAuth();
  const { selectedAccount, selectedTradingAccountId, accountsLoading } = useTradingAccounts();
  const { selected: g, refresh, now, subscribeTick } = useGuard();
  const toast = useToast();
  const navigate = useNavigate();
  const accessToken = session?.access_token;
  const tz = selectedAccount?.timezone || 'Asia/Kolkata';
  const live = useLiveAccount({ accessToken, tradingAccountId: selectedTradingAccountId, initial: selectedAccount });
  const s = useMemo(() => sessionOf(live, g.rules), [live, g.rules]);
  const cur = s.currency;
  const fmt0 = (v) => fmtMoney(v, cur, { decimals: 0 });

  // ── positions ───────────────────────────────────────────────────────
  const [positions, setPositions] = useState(null);
  const loadPositions = useCallback(async (signal) => {
    if (!accessToken || !selectedTradingAccountId) return;
    try {
      const t = await fetchJournalTrades({ accessToken, tradingAccountId: selectedTradingAccountId, limit: 50, signal });
      const open = (Array.isArray(t) ? t : []).filter((x) => String(pick(x, 'status') || '').toUpperCase() === 'OPEN');
      setPositions(open);
    } catch { /* keep last */ }
  }, [accessToken, selectedTradingAccountId]);
  useEffect(() => {
    const ctrl = new AbortController();
    loadPositions(ctrl.signal);
    const id = setInterval(() => loadPositions(ctrl.signal), POLL_MS);
    return () => { ctrl.abort(); clearInterval(id); };
  }, [loadPositions]);
  const posOpen = (positions?.length ?? 0) > 0;

  // ── kill switch (inline) ────────────────────────────────────────────
  const [hours, setHours] = useState(3);
  const [rlHelp, setRlHelp] = useState(false);
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const armed = g.guard === 'locked';
  // Lockout needs a key that can act — not rules. See canLockOutOf in guard.js.
  const noEnforce = !armed && !g.canLockOut;
  const ksGap = g.gap && g.gap.key !== 'alerts' && g.gap.key !== 'rules' ? g.gap : null;
  const armable = !armed && !noEnforce && !blocked && !posOpen;
  const arm = async () => {
    setBusy(true);
    try {
      await armLockout({ accessToken, tradingAccountId: selectedTradingAccountId, hours });
      await refresh();
      toast.success(`Locked out for ${hours} hours`, 'Orders placed anywhere in the meantime get closed on sight.');
      setStage(0);
    } catch (err) {
      const code = err?.details?.error?.code;
      if (code === 'POSITION_OPEN') { setBlocked(true); setStage(0); }
      else toast.error('Could not start the lockout', err?.details?.error?.message || err?.message || 'Please try again.');
    } finally { setBusy(false); }
  };
  const noEnforceBody = g.readOnly ? 'The key on this account is read-only, so we could not close anything the lockout was meant to stop.' : ksGap ? ksGap.body : 'Connect a key that can act and the lockout has something to hold it.';
  const noEnforceCta = g.readOnly ? 'Replace the key' : ksGap ? ksGap.cta : 'Connect a key';
  const noEnforceTo = g.readOnly ? '/dashboard/connect' : ksGap ? ksGap.to : '/dashboard/connect';
  const armedBody = g.readOnly
    ? 'Clears on its own, then the account trades again. Rule and key changes are blocked so you cannot undo it — but the key here is read-only, so we cannot close anything you open in the meantime. This one holds because you decided it does.'
    : 'Clears on its own, then the account trades again. Support can lift it early if something real happens — you cannot.';
  const manual = g.lockReason === 'manual';
  // TODO(api): the lockout carries no armed-at; elapsed is estimated from the longest window.
  const lockPct = g.lockUntil ? `${Math.max(0, Math.min(100, (1 - g.lockRemainingMs / (12 * 3600_000)) * 100)).toFixed(1)}%` : '0%';

  // ── cooldown (rule-triggered) ───────────────────────────────────────
  const cdRule = ruleConfig(g.rules, 'close-after-losses');
  const cdActive = g.guard === 'locked' && g.lockReason === 'consecutive_losses' && !!cdRule;
  const cdHours = Number(cdRule?.cooldownHours) || 3;
  const cdPct = cdActive ? `${Math.max(0, Math.min(100, (1 - g.lockRemainingMs / (cdHours * 3600_000)) * 100)).toFixed(1)}%` : '0%';

  // ── rule lock ───────────────────────────────────────────────────────
  const rl = ruleLockNow(g.rules?.ruleLock ?? null, now);
  const rlSettling = Boolean(rl?.settling);
  // Tick every second while the rule lock or its setup window runs, so the timer moves.
  useEffect(() => (rl?.locked || rl?.settling ? subscribeTick() : undefined), [rl?.locked, rl?.settling, subscribeTick]);
  const [pick_, setPick] = useState(null);
  const rlPick = pick_ ?? rl?.days ?? 7;
  const rlLocked = Boolean(rl?.locked);
  const [rlBusy, setRlBusy] = useState(false);
  const applyLock = async () => {
    setRlBusy(true);
    try {
      await setRuleLockDays({ accessToken, accountId: selectedTradingAccountId, days: rlPick });
      await refresh();
      toast.success(rlPick === 0 ? 'Rule lock off' : `Rule lock set to ${rlPick} days`, rlPick === 0 ? 'Rules are editable until your first trade each day.' : 'From your next save, every rule locks for that long.');
    } catch (e) {
      const code = e?.details?.error?.code ?? e?.code;
      if (code === 'RULES_LOCKED' || e?.status === 423) { await refresh(); toast.error('The lock is already running', 'The window cannot be changed until it lifts — the countdown is above.'); }
      else toast.error('Could not change the lock', e?.message || 'Try again.');
    }
    finally { setRlBusy(false); }
  };

  // ── session ─────────────────────────────────────────────────────────
  const pnlSign = s.pnl == null ? 0 : Math.sign(s.pnl);
  const fg = pnlSign < 0 ? 'var(--red)' : pnlSign > 0 ? 'var(--mint)' : 'var(--ink)';
  const glow = pnlSign < 0 ? 'var(--red-tint)' : pnlSign > 0 ? 'var(--mint-tint)' : 'transparent';
  const pnlStr = fmtMoney(s.pnl ?? 0, cur, { sign: true });
  const [pnlMain, pnlDec] = splitDecimal(pnlStr);
  const usedPct = s.budgetPct ?? 0;
  const towardTarget = s.target && s.pnl > 0 ? Math.min(100, (s.pnl / s.target) * 100) : 0;
  const hasLimits = g.setupDone && !!(s.lossLimit || s.target);
  const budgetLeft = s.lossLimit ? fmt0(Math.max(0, s.lossLimit - s.budgetUsed)) : '—';
  const lossLimit = s.lossLimit ? fmt0(-s.lossLimit) : '—';
  const target = s.target ? fmt0(s.target) : '—';
  const summary = !hasLimits
    ? 'No trades yet, and no limits to show. Your loss limit and daily target appear here once setup is finished.'
    : g.readOnly
      ? `You are ${Math.round(usedPct)}% into today's loss budget. The key on this account is read-only, so at 100% we alert you and log it — we cannot close anything. Replace the key to make these limits enforceable.`
      : pnlSign < 0
        ? `You are ${Math.round(usedPct)}% into today's loss budget. At 100% the guard closes everything and locks the day.`
        : pnlSign === 0
          ? `Flat so far. The guard closes the day at ${lossLimit} down, or locks it in at ${target} up.`
          : `Banked so far today. The day locks itself at ${target} so the gain survives the afternoon.`;
  const pips = [0, 1, 2, 3].map((i) => {
    const on = usedPct > i * 25;
    const c = usedPct > 70 ? 'var(--red-solid)' : 'var(--amber-solid)';
    return { bg: on ? c : 'var(--surface-3)', glow: on ? `0 0 12px -2px ${c}` : 'none' };
  });
  const fillLeft = pnlSign < 0 ? `${50 - usedPct / 2}%` : '50%';
  const fillWidth = pnlSign < 0 ? `${usedPct / 2}%` : `${towardTarget / 2}%`;
  const fillBg = pnlSign < 0 ? 'var(--red-solid)' : 'var(--mint-solid)';
  const markerLeft = pnlSign < 0 ? `${50 - usedPct / 2}%` : `${50 + towardTarget / 2}%`;
  /**
   * The right half of the hero used to be an equity sparkline. There is no
   * intraday equity series behind it, so it drew a hardcoded flat line —
   * `M0 48 L320 48` — which read as "nothing is happening" when something
   * was. A chart that cannot move is worse than no chart.
   *
   * What we DO have, live and per fill, is every rule the user switched on
   * and how close each one is to firing. That is the more useful question
   * anyway: not "what did equity do" but "what stops me next".
   */

  // ── live rules ──────────────────────────────────────────────────────
  const templates = new Map((g.rules?.templates ?? []).map((t) => [t.slug, t]));
  const onRules = (g.rules?.instances ?? []).filter((r) => r.enabled !== false);
  const liveRules = onRules.map((r) => {
    const t = templates.get(r.templateSlug);
    const gl = RULE_GLYPH[r.templateSlug] ?? ['M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z', ''];
    const acc = ruleAccent(r.templateSlug);
    let st;
    if (!g.loaded) st = { label: '…', bg: 'var(--surface-3)', fg: 'var(--ink-3)', live: 'Checking this account', bar: '0%' };
    else if (g.guard === 'unprotected') st = { label: 'Not enforcing', bg: 'var(--surface-3)', fg: 'var(--ink-3)', live: 'Nothing is watching this rule yet', bar: '0%' };
    else if (g.guard === 'watching') st = { label: 'Alert only', bg: 'var(--amber-tint)', fg: 'var(--amber)', live: 'Evaluated, but the key cannot act', bar: '0%' };
    else {
      const c = live ? computeRule(r.templateSlug, r.config, live, live.accountSize, fmt0) : null;
      const label = c?.tone === 'danger' ? 'Triggered' : c?.tone === 'warn' ? 'Close' : c?.tone === 'target' ? 'Target hit' : 'Armed';
      const pctRaw = c?.bar ? c.bar.pct : c?.pips ? (c.pips.filled / c.pips.total) * 100 : 0;
      const bar = `${Math.max(2, pctRaw)}%`;
      const tone = label === 'Triggered' ? { bg: 'var(--red-tint)', fg: 'var(--red)' } : label === 'Close' ? { bg: 'var(--amber-tint)', fg: 'var(--amber)' } : { bg: 'var(--mint-tint)', fg: 'var(--mint)' };
      st = { label, live: c?.status || c?.trigger || t?.description || '', bar, pct: Number.isFinite(pctRaw) ? pctRaw : 0, headline: c?.headline ?? c?.value ?? null, ...tone };
    }
    return { slug: r.templateSlug, name: t?.name ?? r.templateSlug, d1: gl[0], d2: gl[1], accent: acc.color, tint: acc.tint, ...st };
  });

  /**
   * The three closest to firing, worst first. Three because the hero is a
   * glance, not the Rule panel below — that one lists everything.
   */
  const nearest = [...liveRules].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 3);

  const tradeCap = Number(ruleConfig(g.rules, 'max-trades-day')?.maxTrades);
  const tradesUsed = live?.tradeCountToday ?? 0;
  const atTradeCap = tradeCap > 0 && tradesUsed >= tradeCap;

  if (!accountsLoading && !selectedAccount) {
    return (
      <div>
        <div style={sx('margin-bottom:18px')}>
          <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Live guard</h1>
          <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>The screen to keep open while you trade. Everything here updates as fills land.</p>
        </div>
        <section style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);padding:21px')}>
          <p style={sx('margin:0 0 14px;font-size:13.5px;line-height:1.55;color:var(--ink-2)')}>Add a trading account and this page becomes the live view of your session.</p>
          <button type="button" onClick={() => navigate('/dashboard/account/trading')} style={sx('padding:10px 14px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>Add an account</button>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div style={sx('margin-bottom:18px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Live guard</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>The screen to keep open while you trade. Everything here updates as fills land.</p>
      </div>

      {/* ── Session ─────────────────────────────────────────────────── */}
      <section style={sx('position:relative;margin-bottom:18px;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-lift);overflow:hidden')}>
        <div style={sx('position:absolute;inset:0;background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:38px 38px;mask-image:radial-gradient(90% 120% at 20% 0%,#000,transparent 70%);-webkit-mask-image:radial-gradient(90% 120% at 20% 0%,#000,transparent 70%);pointer-events:none')} />
        <div style={sx('position:relative;padding:26px 28px 30px')}>
          <div style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:26px;flex-wrap:wrap')}>
            <div style={sx('min-width:min(280px,100%)')}>
              <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint)")}>Today · session P&amp;L</div>
              <div style={sx("margin-top:12px;font:700 62px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.05em", { color: fg, textShadow: `0 0 48px ${glow}` })}>{pnlMain}{pnlDec != null && <span style={sx('font-size:.52em;letter-spacing:-.02em;opacity:.55')}>.{pnlDec}</span>}</div>
              <div style={sx('margin-top:12px;font-size:13px;line-height:1.55;color:var(--ink-2);max-width:52ch;text-wrap:pretty')}>{summary}</div>
            </div>
            {/* What stops you next — your rules, ranked by how close each is. */}
            <div style={sx('flex:1;min-width:min(280px,100%);max-width:430px')}>
              {nearest.length > 0 ? (
                <>
                  <div style={sx("display:flex;align-items:baseline;justify-content:space-between;gap:10px;font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint)")}>
                    <span>What stops you next</span>
                    <span style={sx('letter-spacing:.1em')}>{onRules.length} on</span>
                  </div>
                  <div style={sx('display:flex;flex-direction:column;gap:9px;margin-top:13px')}>
                    {nearest.map((r) => (
                      <div key={r.slug} style={sx('padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)', r.pct >= 100 ? { borderColor: 'var(--red-line)', background: 'var(--red-tint)' } : r.pct >= 70 ? { borderColor: 'var(--amber-line)' } : null)}>
                        <div style={sx('display:flex;align-items:center;gap:8px')}>
                          <span style={sx('flex:none;width:6px;height:6px;border-radius:999px', { background: r.accent })} />
                          <span style={sx('flex:1;min-width:0;font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{r.name}</span>
                          <span style={sx("flex:none;font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;padding:3px 6px;border-radius:5px", { background: r.bg, color: r.fg })}>{r.label}</span>
                        </div>
                        <div style={sx('margin-top:8px;height:5px;border-radius:999px;background:var(--surface-3);overflow:hidden')}>
                          <div style={sx('height:100%;border-radius:999px;transition:width .4s ease', { width: r.bar, background: r.fg })} />
                        </div>
                        {r.live && <div style={sx('margin-top:7px;font-size:11.5px;line-height:1.45;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{r.live}</div>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={sx('display:flex;flex-direction:column;justify-content:center;height:100%;min-height:118px;padding:16px 18px;border:1px dashed var(--line-strong);border-radius:14px;background:var(--surface-2)')}>
                  <div style={sx('font-size:12.5px;font-weight:600')}>No rules switched on</div>
                  <p style={sx('margin:6px 0 11px;font-size:12px;line-height:1.5;color:var(--ink-3)')}>Nothing is watching this session yet. Turn one on and its live headroom shows here.</p>
                  <button type="button" onClick={() => navigate('/dashboard/rules')} style={sx('align-self:flex-start;padding:7px 12px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700')}>Choose rules</button>
                </div>
              )}
            </div>
          </div>

          <div style={sx('display:flex;gap:30px;flex-wrap:wrap;margin-top:26px;padding-top:22px;border-top:1px solid var(--line)')}>
            <div>
              <div style={sx(MONO_LABEL)}>Loss budget left</div>
              <div style={sx("margin-top:8px;font:600 22px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.025em")}>{budgetLeft}</div>
            </div>
            <div>
              <div style={sx(MONO_LABEL)}>Trades</div>
              <div style={sx("margin-top:8px;font:600 22px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.025em", atTradeCap ? { color: 'var(--red)' } : null)}>{tradesUsed}{tradeCap > 0 ? ` / ${tradeCap}` : ''}</div>
              {atTradeCap && <div style={sx('margin-top:5px;font-size:11px;font-weight:600;color:var(--red)')}>At your cap</div>}
            </div>
            <div>
              <div style={sx(MONO_LABEL)}>Budget used</div>
              {/* Four empty pips at 0% read as an unloaded skeleton rather than
                  as "none of it spent". The number says which it is. */}
              <div style={sx('display:flex;align-items:center;gap:10px;margin-top:8px')}>
                <span style={sx("font:600 22px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.025em", usedPct > 70 ? { color: 'var(--red)' } : usedPct > 0 ? { color: 'var(--amber)' } : null)}>{Math.round(usedPct)}%</span>
                <span style={sx('display:flex;gap:4px')}>
                  {pips.map((p, i) => <span key={i} style={sx('width:18px;height:7px;border-radius:3px', { background: p.bg, boxShadow: p.glow })} />)}
                </span>
              </div>
            </div>
          </div>

          {!hasLimits ? (
            <div style={sx('display:flex;align-items:center;gap:11px;flex-wrap:wrap;margin-top:24px;padding:14px 16px;border:1px dashed var(--line-strong);border-radius:13px;background:var(--surface-2)')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.8" strokeLinecap="round" style={{ flex: 'none' }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
              <span style={sx('flex:1;min-width:min(220px,100%);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>No limits yet. Every threshold is a percentage of your account balance, so the loss and target scale appears once setup is finished.</span>
              <button type="button" onClick={() => navigate(g.setupDone ? '/dashboard/rules' : '/dashboard/account/trading')} style={sx('flex:none;padding:8px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700')}>{g.setupDone ? 'Choose rules' : 'Finish setup'}</button>
            </div>
          ) : (
            <div style={sx('margin-top:28px')}>
              <div style={sx('position:relative;height:14px;border-radius:999px;background:var(--surface-3);box-shadow:inset 0 1px 3px rgba(0,0,0,.4);overflow:hidden')}>
                <div style={sx('position:absolute;top:0;bottom:0;left:0;width:50%;background:var(--red-tint)')} />
                <div style={sx('position:absolute;top:0;bottom:0;right:0;width:50%;background:var(--mint-tint)')} />
                <div style={sx('position:absolute;top:0;bottom:0;left:50%;width:1px;background:var(--line-strong)')} />
                <div style={sx('position:absolute;top:0;bottom:0;border-radius:999px', { background: fillBg, left: fillLeft, width: fillWidth, boxShadow: `0 0 18px -2px ${fillBg}` })} />
              </div>
              <div style={sx('position:relative;height:20px')}>
                <div style={sx('position:absolute;top:-7px;transform:translateX(-50%);width:3px;height:22px;border-radius:2px', { left: markerLeft, background: fg, boxShadow: `0 0 0 3px var(--surface),0 0 16px ${glow}` })} />
              </div>
              <div style={sx('display:flex;justify-content:space-between;gap:14px;font-size:11.5px;color:var(--ink-3)')}>
                <span><strong style={sx('color:var(--red);font-weight:700;font-variant-numeric:tabular-nums')}>{lossLimit}</strong> {g.readOnly ? 'loss limit — we alert you, we cannot close' : 'loss limit — guard closes everything'}</span>
                <span style={sx("font:500 10px/1.6 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)")}>breakeven</span>
                <span style={sx('text-align:right')}><strong style={sx('color:var(--mint);font-weight:700;font-variant-numeric:tabular-nums')}>{target}</strong> {g.readOnly ? 'target — we alert you, nothing locks' : 'target — day locks, gains kept'}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Cooldown — rule-triggered ─────────────────────────────────── */}
      {cdActive && (
        <section style={sx('margin-bottom:18px;padding:18px 20px;border:1px solid var(--amber-line);border-radius:16px;background:var(--amber-tint);box-shadow:var(--shadow-card)')}>
          <div style={sx('display:flex;align-items:center;gap:8px')}>
            <span style={sx('width:7px;height:7px;border-radius:50%;background:var(--amber-solid);animation:tgxPulse 2s ease-in-out infinite')} />
            <span style={sx('font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--amber);font-weight:700')}>Cooldown running — a rule stopped you, not you</span>
          </div>
          <div style={sx('display:flex;align-items:baseline;gap:12px;margin-top:11px;flex-wrap:wrap')}>
            <span style={sx("font:700 38px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.035em;color:var(--ink)")}>{formatRemaining(g.lockRemainingMs)}</span>
            <span style={sx('font-size:12.5px;color:var(--ink-2)')}>until you can open again</span>
          </div>
          <div style={sx('margin-top:13px;height:5px;border-radius:999px;background:var(--surface-3);overflow:hidden')}><div style={sx('height:100%;border-radius:999px;background:var(--amber-solid)', { width: cdPct })} /></div>
          <div style={sx('display:flex;justify-content:space-between;gap:12px;margin-top:9px;font-size:11.5px;color:var(--ink-3);flex-wrap:wrap')}>
            <span>Triggered by your Close-after-N-losses rule</span>
            <span style={sx('text-align:right;white-space:nowrap')}>New orders allowed from <strong style={sx('color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums')}>{clockAt(g.lockUntil, tz)}</strong></span>
          </div>
          <p style={sx('margin:12px 0 0;padding-top:12px;border-top:1px solid var(--amber-line);font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:92ch')}>Existing positions are untouched — you can still manage or close what is open. Only new entries are blocked, because the third loss in a row is where revenge trading starts. The clock runs down on its own; there is nothing to cancel.</p>
        </section>
      )}

      {/* ── Commitment controls ───────────────────────────────────────── */}
      <section style={sx('margin-bottom:18px;border:1px solid var(--line-strong);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:11px;flex-wrap:wrap')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v7" /><path d="M6.4 6.8a8 8 0 1011.2 0" /></svg>
          <h3 style={sx("margin:0;font:600 16px/1.2 'Space Grotesk',sans-serif")}>Commitment controls</h3>
          <span style={sx('font-size:11.5px;color:var(--ink-3)')}>Separate from your rules. Both are switches you throw while calm, and neither has an undo.</span>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))')}>

          <div style={sx('padding:19px 20px;border-right:1px solid var(--line);display:flex;flex-direction:column')}>
            <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:5px')}>
              <span style={sx('width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--red-tint);color:var(--red)')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 4v7" /><path d="M6.8 7.4a7.4 7.4 0 1010.4 0" /></svg>
              </span>
              <h4 style={sx("margin:0;font:600 14.5px/1.2 'Space Grotesk',sans-serif")}>Manual killswitch</h4>
            </div>
            {!armed && (
              <p style={sx('margin:0 0 13px;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>Lock yourself out of this account for a window you choose. <strong style={sx('color:var(--ink);font-weight:700')}>You can&rsquo;t call it off yourself</strong> — there is no off button, only the clock. Support can lift it if something real happens.</p>
            )}

            {noEnforce && (
              <div style={sx('padding:13px 14px;border:1px solid var(--amber-line);border-radius:11px;background:var(--amber-tint)')}>
                <div style={sx('font-size:12.5px;font-weight:700;color:var(--amber)')}>Nothing could enforce a lockout yet</div>
                <p style={sx('margin:5px 0 10px;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{noEnforceBody} A lockout you can walk around is not a commitment, so we would rather not offer it here.</p>
                <button type="button" onClick={() => navigate(noEnforceTo)} style={sx('padding:7px 11px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700')}>{noEnforceCta}</button>
              </div>
            )}

            {!armed && !noEnforce && (blocked || posOpen) && (
              <div style={sx('padding:13px 14px;border:1px solid var(--amber-line);border-radius:11px;background:var(--amber-tint)')}>
                <div style={sx('font-size:12.5px;font-weight:700;color:var(--amber)')}>Can&rsquo;t arm while a position is open</div>
                <p style={sx('margin:5px 0 10px;font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>Locking you out now would leave you holding {positions?.length === 1 ? 'a position' : `${positions?.length ?? ''} positions`} you could neither manage nor close through us. Flatten first, then arm.</p>
                <a href="#positions" style={sx('display:inline-block;padding:7px 11px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700;text-decoration:none')}>View open positions</a>
              </div>
            )}

            {armable && (
              <div style={sx('margin-top:auto')}>
                <div style={sx('display:flex;align-items:center;min-height:15px;margin-bottom:10px')}>
                  <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-faint)")}>Lock duration</span>
                </div>
                <div style={sx('min-height:9px;margin-bottom:4px')} aria-hidden />
                <div style={sx('display:flex;gap:8px;margin-bottom:12px')} role="radiogroup" aria-label="Lock duration">
                  {LOCKOUT_HOUR_OPTIONS.map((h) => <button key={h} type="button" role="radio" aria-checked={hours === h} onClick={() => setHours(h)} style={sx(hours === h ? HOUR_ON : HOUR_OFF)}>{h}h</button>)}
                </div>
                {stage === 0 && <button type="button" className="ks-arm" onClick={() => setStage(1)} style={sx('width:100%;padding:11px;border:1px solid var(--red-line);border-radius:10px;background:var(--red-tint);color:var(--red);font-size:13px;font-weight:700')}>Arm the lockout</button>}
                {stage === 1 && (
                  <div style={sx('padding:13px 14px;border:1px solid var(--red-line);border-radius:11px;background:var(--red-tint)')}>
                    <div style={sx('font-size:12.5px;font-weight:700;color:var(--red)')}>Read this before you confirm</div>
                    <p style={sx('margin:5px 0 11px;font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>You will not be able to trade this account for {hours} hours. There is no cancel. Orders placed anywhere in the meantime get closed on sight.</p>
                    <div style={sx('display:flex;gap:8px')}>
                      <button type="button" disabled={busy} onClick={arm} style={sx('flex:1;padding:10px;border:1px solid var(--red-solid);border-radius:9px;background:var(--red-solid);color:#fff;font-size:12.5px;font-weight:700')}>{busy ? 'Arming…' : `Lock me out for ${hours} hours`}</button>
                      <button type="button" disabled={busy} onClick={() => setStage(0)} style={sx('padding:10px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600')}>Back</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {armed && (
              <div style={sx('padding:16px 17px;border:1px solid var(--red-line);border-radius:12px;background:var(--red-tint)')}>
                <div style={sx('display:flex;align-items:center;gap:8px')}>
                  <span style={sx('width:7px;height:7px;border-radius:50%;background:var(--red-solid);animation:tgxPulse 2s ease-in-out infinite')} />
                  <span style={sx('font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--red);font-weight:700')}>{manual ? 'Manual lockout — armed by you' : 'Lockout — armed by a rule'}</span>
                </div>
                <div style={sx('display:flex;align-items:baseline;gap:12px;margin-top:11px;flex-wrap:wrap')}>
                  <span style={sx("font:700 38px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.035em;color:var(--ink)")}>{formatRemaining(g.lockRemainingMs)}</span>
                  <span style={sx('font-size:12.5px;color:var(--ink-2)')}>until release</span>
                </div>
                <div style={sx('margin-top:13px;height:5px;border-radius:999px;background:var(--surface-3);overflow:hidden')}><div style={sx('height:100%;border-radius:999px;background:var(--red-solid)', { width: lockPct })} /></div>
                <div style={sx('display:flex;justify-content:space-between;gap:12px;margin-top:9px;font-size:11.5px;color:var(--ink-3);flex-wrap:wrap')}>
                  <span>{manual ? 'Armed by you' : 'Armed by a rule'}</span>
                  <span style={sx('text-align:right;white-space:nowrap')}>Trading resumes {dayAt(g.lockUntil, tz)} at <strong style={sx('color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums')}>{clockAt(g.lockUntil, tz)}</strong></span>
                </div>
                <p style={sx('margin:12px 0 0;padding-top:12px;border-top:1px solid var(--red-line);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{armedBody}</p>
              </div>
            )}
          </div>

          <div style={sx('padding:19px 20px;display:flex;flex-direction:column')}>
            <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:5px')}>
              <span style={sx('width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--mint-tint);color:var(--mint)')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6 11V8.4a6 6 0 1112 0V11" /><path d="M5 11h14v9H5z" /></svg>
              </span>
              <h4 style={sx("margin:0;font:600 14.5px/1.2 'Space Grotesk',sans-serif")}>Rule lock</h4>
            </div>
            <p style={sx('margin:0 0 13px;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>How long your active rules hold before you can edit them. <strong style={sx('color:var(--ink);font-weight:700')}>Tightening is frozen too</strong> — the fiddling is the behaviour we&rsquo;re stopping, not the direction. Defaults to 7 days.</p>

            {rlLocked && (
              <div style={sx('padding:15px 16px;border:1px solid var(--mint-line);border-radius:11px;background:var(--mint-tint)')}>
                <div style={sx('font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mint);font-weight:700')}>Rules frozen</div>
                <div style={sx("margin-top:8px;font:700 26px/1 'Space Grotesk',sans-serif;letter-spacing:-.02em;color:var(--ink)")}>{rl?.lockedUntil ? formatRemaining(new Date(rl.lockedUntil).getTime() - now) : `${rl?.days} days`}</div>
                <p style={sx('margin:9px 0 0;font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>{rl?.mode === 'day' ? 'Set for today’s session' : `Armed for ${rl?.days} days`}. You can&rsquo;t shorten the window while it runs — that would make 30 days a two-click escape. Releasing early is a conversation with <a href="mailto:support@tradeguardx.com">support</a>.</p>
              </div>
            )}

            {!rlLocked && noEnforce && (
              <div style={sx('padding:13px 14px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2)')}>
                <div style={sx('font-size:12.5px;font-weight:700')}>No rules to lock yet</div>
                <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>A freeze window only means something once rules are switched on and something can enforce them. Finish setup and this becomes your commitment.</p>
              </div>
            )}

            {!rlLocked && !noEnforce && (
              <div style={sx('margin-top:auto')}>
                {rlSettling && (
                  <div style={sx('display:flex;align-items:center;gap:12px;padding:11px 13px;margin-bottom:12px;border:1px solid var(--amber-line);border-radius:10px;background:var(--amber-tint)')}>
                    <span style={sx("flex:none;font:700 20px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.02em;color:var(--amber)")}>{formatRemaining(Date.parse(rl.locksAt) - now)}</span>
                    <span style={sx('font-size:12px;line-height:1.5;color:var(--ink-2)')}><strong style={sx('color:var(--amber);font-weight:700')}>Setup window running.</strong> You can still change the length now; when it closes your active rules freeze for {rl.days} days.</span>
                  </div>
                )}
                <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:15px;margin-bottom:10px')}>
                  <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-faint)")}>Choose your commitment</span>
                  <button type="button" onClick={() => setRlHelp((v) => !v)} aria-expanded={rlHelp} aria-controls="rl-help" style={sx('display:inline-flex;align-items:center;gap:6px;padding:0;border:0;background:none;font-size:11.5px;font-weight:600;color:var(--ink-3)')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.6" /></svg>
                    {rlHelp ? 'Hide' : 'What each option means'}
                  </button>
                </div>
                <div style={sx('display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:4px')} aria-hidden>
                  {[0, 3, 7, 30].map((d) => <span key={d} style={sx("text-align:center;font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);min-height:9px")}>{d === 7 ? 'Default' : ''}</span>)}
                </div>
                <div style={sx('display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px')} role="radiogroup" aria-label="Rule lock window">
                  {[0, 3, 7, 30].map((d) => <button key={d} type="button" role="radio" aria-checked={rlPick === d} onClick={() => setPick(d)} style={sx(rlPick === d ? DAY_ON : DAY_OFF)}>{d === 0 ? 'Off' : `${d}d`}</button>)}
                </div>
                {rlHelp && (
                  <div id="rl-help" style={sx('display:grid;gap:7px;margin-bottom:13px;padding:11px 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);animation:tgxDrawer .16s ease-out')}>
                    {[['Off', 'Editable until your first trade of the day. After that they hold until the daily reset.'], ['3 days', 'Active rules lock for three days.'], ['7 days', 'Active rules lock for a week. This is the default.'], ['30 days', 'Active rules lock for a month.']].map(([k, v]) => (
                      <div key={k} style={sx('display:flex;gap:9px;font-size:12px;line-height:1.5;color:var(--ink-3)')}><span style={sx('flex:none;width:48px;font-weight:700;color:var(--ink-2)')}>{k}</span><span>{v}</span></div>
                    ))}
                    <p style={sx('margin:4px 0 0;padding-top:9px;border-top:1px solid var(--line);font-size:12px;color:var(--ink-2);line-height:1.5')}>{rlPick === 0 ? 'Off does not mean always editable. Rules stay editable until your first trade of the day — after that they hold until the next daily reset.' : `Active rules lock for ${rlPick} days. You cannot shorten the window once it is running, and you cannot edit a rule until it expires.`}</p>
                  </div>
                )}
                <button type="button" className="rl-arm" disabled={rlBusy || rlPick === (rl?.days ?? 7)} onClick={applyLock} style={sx('width:100%;padding:11px;border:1px solid var(--mint-line);border-radius:10px;background:var(--mint-tint);color:var(--mint);font-size:13px;font-weight:700')}>{rlBusy ? 'Saving…' : rlPick === 0 ? 'Use the daily setting' : `Lock active rules for ${rlPick} days`}</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Open positions ────────────────────────────────────────────── */}
      <section id="positions" style={sx('margin-bottom:18px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('padding:15px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px')}>
          <h3 style={sx(H3)}>Open positions</h3>
          <span style={sx('font-size:11.5px;color:var(--ink-3)')}>{posOpen ? `${positions.length} open · unrealised counts toward your loss budget` : 'flat'}</span>
        </div>
        {posOpen ? (
          <div>
            <div style={sx('display:grid;grid-template-columns:1.1fr .7fr .8fr .8fr .9fr .9fr;gap:12px;padding:10px 18px;border-bottom:1px solid var(--line);background:var(--surface-2);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>
              <span>Symbol</span><span>Side</span><span>Size</span><span>Entry</span><span>Stop</span><span style={{ textAlign: 'right' }}>Unrealised</span>
            </div>
            {positions.map((p) => {
              const side = String(pick(p, 'side') || '').toUpperCase();
              const long = side === 'BUY' || side === 'LONG';
              const stop = pick(p, 'stopLoss', 'stop_loss', 'stopPrice');
              /**
               * `pnl` on an OPEN journal row is the realised result, which is
               * null until the position closes — Number(null) is 0, so every
               * open position rendered a confident "$0.00" that was not a
               * reading at all. The engine does track unrealised P&L (it is
               * inside currentEquity, which is how the loss budget sees it),
               * but nothing persists it per position, so the row genuinely
               * does not know. Say so instead of inventing a zero.
               */
              const upnlRaw = pick(p, 'unrealizedPnl', 'unrealisedPnl');
              const upnl = upnlRaw == null || upnlRaw === '' ? NaN : Number(upnlRaw);
              return (
                <div key={pick(p, 'tradeUid', 'trade_uid') || p.id} style={sx('display:grid;grid-template-columns:1.1fr .7fr .8fr .8fr .9fr .9fr;gap:12px;padding:13px 18px;border-bottom:1px solid var(--line);font-size:13px;align-items:center;font-variant-numeric:tabular-nums')}>
                  <span style={sx('font-weight:600')}>{pick(p, 'symbol') || '—'}</span>
                  <span style={sx('font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase', { color: long ? 'var(--mint)' : 'var(--red)' })}>{long ? 'Long' : 'Short'}</span>
                  <span>{pick(p, 'quantity', 'volume') ?? '—'}</span>
                  <span>{pick(p, 'entryPrice', 'entry_price') ?? '—'}</span>
                  <span style={{ color: stop ? 'var(--ink-2)' : 'var(--amber)' }}>{stop ?? 'none set'}</span>
                  <span style={sx('text-align:right;font-weight:600', { color: Number.isFinite(upnl) ? (upnl < 0 ? 'var(--red)' : 'var(--mint)') : 'var(--ink-3)' })}>{Number.isFinite(upnl) ? fmtMoney(upnl, cur, { sign: true }) : '—'}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={sx('padding:30px 18px;text-align:center;color:var(--ink-3);font-size:13px')}>{positions === null ? 'Loading…' : 'Flat. Nothing open on this account right now.'}</div>
        )}
      </section>

      {/* ── Rule panel ────────────────────────────────────────────────── */}
      <section style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('padding:15px 18px;border-bottom:1px solid var(--line)')}>
          <h3 style={sx(H3)}>Rule panel</h3>
          <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Only the rules you switched on. Each one&rsquo;s live status against this account, recomputed on every fill.</p>
        </div>
        {liveRules.length === 0 && (
          <div style={sx('padding:34px 20px;text-align:center')}>
            <div style={sx('font-size:13.5px;font-weight:600')}>No rules switched on</div>
            <p style={sx('margin:6px auto 13px;font-size:12.5px;line-height:1.55;color:var(--ink-3);max-width:44ch')}>Nothing is being enforced on this account. Switch on a rule and its live status appears here.</p>
            <button type="button" onClick={() => navigate('/dashboard/rules')} style={sx('padding:8px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700')}>Choose rules</button>
          </div>
        )}
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr))')}>
          {liveRules.map((r) => (
            <div key={r.slug} style={sx('padding:15px 17px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)')}>
              <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:10px')}>
                <span style={sx('width:26px;height:26px;border-radius:8px;display:grid;place-items:center', { background: r.tint, color: r.accent })}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={r.d1} /><path d={r.d2} /></svg>
                </span>
                <span style={sx('font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 8px;border-radius:999px', { background: r.bg, color: r.fg })}>{r.label}</span>
              </div>
              <div style={sx('font-size:13.5px;font-weight:600')}>{r.name}</div>
              <div style={sx('margin-top:5px;font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums')}>{r.live}</div>
              <div style={sx('margin-top:10px;height:4px;border-radius:999px;background:var(--surface-3);overflow:hidden')}><div style={sx('height:100%;border-radius:999px', { background: r.fg, width: r.bar })} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
