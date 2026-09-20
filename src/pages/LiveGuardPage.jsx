import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useLiveAccount } from '../hooks/useLiveAccount';
import { sessionOf, fmtMoney, splitDecimal, ruleConfig } from '../lib/session';
import { computeRule } from '../components/dashboard/RuleStatusCards';
import OpenPositions from '../components/dashboard/OpenPositions';
import ManualKillswitchCard from '../components/dashboard/ManualKillswitchCard';
import RuleLockCard from '../components/dashboard/RuleLockCard';
import PageHead from '../components/dashboard/shell/PageHead';
import { ruleGlyph, ruleAccent, IcArrow, IcClock } from '../components/dashboard/shell/icons';
import { formatRemaining, formatResumes, lockReasonLabel } from '../components/dashboard/shell/format';

/**
 * Live guard — the screen a trader keeps open.
 *
 *   session P&L (62px, split decimals) + summary sentence
 *   limit scale: loss limit ← breakeven → target, enforcement-accurate labels
 *   open positions
 *   live rule list
 *   cooldown panel (rule-triggered) — its own section, outside commitment controls
 *   commitment controls: kill switch + rule lock — switches you throw while calm
 *
 * Before setup completes every threshold reads "No limits yet" rather than
 * an em-dash interpolated into a sentence.
 */

const TONE_MAP = { ok: 'mint', warn: 'amber', danger: 'red', target: 'mint', muted: null };
const TONE_WORD = { ok: 'Armed', warn: 'Close', danger: 'Triggered', target: 'Target hit', muted: 'Configured' };

export default function LiveGuardPage() {
  const { session } = useAuth();
  const { selectedAccount, selectedTradingAccountId, accountsLoading } = useTradingAccounts();
  const g = useGuard().selected;
  const accessToken = session?.access_token;
  const live = useLiveAccount({ accessToken, tradingAccountId: selectedTradingAccountId, initial: selectedAccount });
  const s = useMemo(() => sessionOf(live, g.rules), [live, g.rules]);
  const cur = s.currency;
  const tz = selectedAccount?.timezone || 'Asia/Kolkata';

  if (!accountsLoading && !selectedAccount) {
    return (
      <>
        <PageHead title="Live guard" sub="Nothing to watch yet." />
        <div className="dsh-card" style={{ padding: 22 }}>
          <p className="dsh-body">Add a trading account and this page becomes the live view of your session.</p>
          <Link to="/dashboard/account/trading" className="dsh-btn dsh-btn--primary" style={{ marginTop: 14 }}>Add an account</Link>
        </div>
      </>
    );
  }

  const enforcing = g.enforcement === 'armed';
  const armedRules = (g.rules?.instances ?? g.rules?.rules ?? []).filter((r) => r.enabled !== false);
  const templates = new Map((g.rules?.templates ?? []).map((t) => [t.slug, t]));
  const fmt = (v) => fmtMoney(v, cur, { decimals: 0 });

  // ── P&L hero ────────────────────────────────────────────────────────
  const pnlStr = s.pnl == null ? null : fmtMoney(s.pnl, cur, { sign: true });
  const [pnlInt, pnlDec] = pnlStr ? splitDecimal(pnlStr) : ['—', null];
  const pnlTone = s.pnl == null ? '' : s.pnl < 0 ? 'red' : s.pnl > 0 ? 'mint' : '';

  let summary;
  if (!g.setupDone) summary = 'No limits yet — every threshold is a percentage of your balance, and setup is not finished.';
  else if (s.pnl == null) summary = 'No fills yet today. Limits are armed and waiting.';
  else if (s.lossLimit && s.budgetPct >= 100) summary = enforcing ? 'Loss limit hit. The day is closed and locked.' : 'Loss limit hit. We alerted you — this key cannot close anything.';
  else if (s.lossLimit) summary = `${fmtMoney(s.lossLimit - s.budgetUsed, cur)} of today's loss budget left${s.target ? `, ${fmtMoney(Math.max(0, s.target - Math.max(0, s.pnl)), cur)} to target` : ''}.`;
  else summary = 'No daily loss rule is on. Nothing bounds today.';

  // Limit scale: 0% = loss limit, 50% = breakeven, 100% = target.
  let marker = 50;
  if (s.pnl != null) {
    if (s.pnl < 0 && s.lossLimit) marker = Math.max(0, 50 - (Math.min(-s.pnl, s.lossLimit) / s.lossLimit) * 50);
    else if (s.pnl > 0 && s.target) marker = Math.min(100, 50 + (Math.min(s.pnl, s.target) / s.target) * 50);
  }

  // ── Cooldown (rule-triggered) ───────────────────────────────────────
  const manualLock = g.guard === 'locked' && g.lockReason === 'manual';
  const cooldownRule = ruleConfig(g.rules, 'close-after-losses');
  const showCooldown = g.guard === 'locked' && g.lockReason === 'consecutive_losses' && cooldownRule && !manualLock;

  return (
    <div className="dlg">
      <PageHead
        title="Live guard"
        sub={`${selectedAccount?.name ?? ''} · ${g.describe.title}`}
        right={<Link to="/dashboard/rules" className="dsh-btn">Edit rules</Link>}
      />

      {/* ── Session ────────────────────────────────────────────────── */}
      <section className="dsh-card">
        <div className="dlg-session__top">
          <div>
            <div className="dsh-mono">Session P&amp;L</div>
            <div className={`dsh-hero-figure dlg-pnl${pnlTone ? ` dlg-pnl--${pnlTone}` : ''}`}>
              {pnlInt}{pnlDec != null && <span className="dec">.{pnlDec}</span>}
            </div>
            <p className="dsh-body dlg-summary">{summary}</p>
          </div>
          <span className={`dsh-pill dsh-pill--${g.describe.tone}`}><span className={`dot${g.guard === 'armed' ? ' dot--pulse' : ''}`} />{g.describe.pill}</span>
        </div>

        {g.setupDone && (s.lossLimit || s.target) ? (
          <div className="dlg-scale">
            <div className="dlg-scale__track" aria-hidden>
              <span className="dlg-scale__zero" />
              <span className="dlg-scale__marker" style={{ left: `${marker}%` }} />
            </div>
            <div className="dlg-scale__labels">
              <span className="dlg-scale__l">
                <strong className="tnum">{s.lossLimit ? fmt(-s.lossLimit) : '—'}</strong>
                <span className="dsh-meta">{s.lossLimit ? g.copy.lossLimit : 'no loss limit'}</span>
              </span>
              <span className="dlg-scale__c dsh-meta">breakeven</span>
              <span className="dlg-scale__r">
                <strong className="tnum">{s.target ? fmt(s.target) : '—'}</strong>
                <span className="dsh-meta">{s.target ? 'target — day locks in profit' : 'no target'}</span>
              </span>
            </div>
          </div>
        ) : (
          <p className="dsh-meta dlg-nolimits">
            {g.setupDone ? 'No loss limit or target is on. ' : 'No limits yet — every threshold is a percentage of your balance. '}
            <Link to={g.setupDone ? '/dashboard/rules' : '/dashboard/account/trading'} style={{ color: 'var(--mint)', fontWeight: 700 }}>{g.setupDone ? 'Switch one on' : 'Finish setup'}</Link>
          </p>
        )}
      </section>

      {/* ── Positions ──────────────────────────────────────────────── */}
      <section className="dsh-card">
        <div className="dsh-card__head"><h3 className="dsh-h2">Open positions</h3></div>
        <div className="dsh-card__body"><OpenPositions accessToken={accessToken} tradingAccountId={selectedTradingAccountId} /></div>
      </section>

      {/* ── Live rules ─────────────────────────────────────────────── */}
      <section className="dsh-card">
        <div className="dsh-card__head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h3 className="dsh-h2">Rules watching this account</h3>
          <span className="dsh-meta tnum">{g.rulesOn} of {g.rulesTotal} on</span>
        </div>
        <div className="dsh-card__body">
        {armedRules.length === 0 ? (
          <p className="dsh-body">No rules are on. Off rules do nothing at all — no alerts, no closing. <Link to="/dashboard/rules" style={{ color: 'var(--mint)', fontWeight: 700 }}>Choose rules</Link></p>
        ) : (
          <ul className="dlg-rules">
            {armedRules.map((r) => {
              const t = templates.get(r.templateSlug);
              const c = live ? computeRule(r.templateSlug, r.config, live, live.accountSize, fmt) : null;
              const Glyph = ruleGlyph(r.templateSlug);
              const tone = c ? TONE_MAP[c.tone] : null;
              const chipTone = !enforcing && tone === 'mint' ? 'amber' : tone;
              const chipWord = !enforcing && c?.tone === 'ok' ? (g.enforcement === 'watching' ? 'Alert only' : 'Not enforcing') : c ? TONE_WORD[c.tone] : 'Configured';
              return (
                <li key={r.templateSlug} className="dlg-rule">
                  <span className="dlg-rule__glyph" style={{ color: ruleAccent(r.templateSlug).color, background: ruleAccent(r.templateSlug).tint }}><Glyph size={16} /></span>
                  <div className="dlg-rule__text">
                    <p className="dlg-rule__name">{t?.name ?? r.templateSlug}</p>
                    <p className="dsh-meta">{c?.trigger ?? t?.description}</p>
                    {c?.status && <p className="dsh-meta dlg-rule__status">{c.status}</p>}
                    {c?.bar && <div className="dsh-progress" style={{ marginTop: 8 }} aria-hidden><span style={{ width: `${c.bar.pct}%` }} className={tone === 'amber' ? 'is-amber' : tone === 'red' ? 'is-red' : ''} /></div>}
                  </div>
                  <span className={`dsh-chip${chipTone ? ` dsh-chip--${chipTone}` : ''}`}>{chipWord}</span>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </section>

      {/* ── Cooldown — rule-triggered, its own section ─────────────── */}
      {showCooldown && (
        <section className="dsh-card dlg-cool">
          <div className="dsh-card__body">
          <div className="dlg-cool__head">
            <span className="dlg-cool__icon"><IcClock size={18} /></span>
            <div>
              <h3 className="dsh-h2">Cooldown running — a rule stopped you, not you</h3>
              <p className="dsh-meta">Fired by <strong>{lockReasonLabel(g.lockReason)}</strong> · New orders allowed from {formatResumes(g.lockUntil, tz)}</p>
            </div>
            <span className="dsh-countdown dlg-cool__count">{formatRemaining(g.lockRemainingMs)}</span>
          </div>
          <p className="dsh-body" style={{ marginTop: 12 }}>
            Existing positions are untouched — you can still manage or close what is open. Only new entries are blocked, because the third loss in a row is where revenge trading starts. The clock runs down on its own; there is nothing to cancel.
          </p>
          </div>
        </section>
      )}

      {/* ── Commitment controls ────────────────────────────────────── */}
      <section className="dlg-commit">
        <div className="dlg-commit__head">
          <h3 className="dsh-h2">Commitment controls</h3>
          <p className="dsh-meta">Switches you throw while calm. Neither has an undo.</p>
        </div>
        <div className="dsh-grid-2">
          <ManualKillswitchCard />
          <RuleLockCard />
        </div>
      </section>

      <p className="dov-plain">
        We cannot stop you placing an order inside Delta&rsquo;s own app; what we do is close it immediately after it opens, then check you are actually flat — in about 120 milliseconds, from our servers, not your browser.
        {' '}<Link to="/dashboard/rules" style={{ color: 'var(--mint)', fontWeight: 700 }}>Rules <IcArrow size={11} /></Link>
      </p>
    </div>
  );
}
