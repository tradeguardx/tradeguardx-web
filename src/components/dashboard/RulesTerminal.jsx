import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { useToast } from '../common/ToastProvider';
import { fetchRulesBundle, saveRuleInstance, cancelPendingRuleChange } from '../../api/rulesApi';
import { openSupport } from '../support/supportBus';
import { useCooldown } from '../../hooks/useCooldown';
import { useGuard } from '../../context/GuardContext';
import { ruleLockNow } from '../../lib/guard';
import { Icon, RULE_GLYPH, ICON, ruleAccent } from './shell/icons';
import { sx } from './shell/sx';

/**
 * Rules — transcribed from the reference (lines 1010–1176) and the Rules &
 * Journal exact-build spec, Part A. Data layer is unchanged: the rules bundle,
 * saveRuleInstance (deferred loosening, immediate tightening), pending-change
 * cancel, the rule lock (settling → locked) and the cooldown all flow through
 * the same endpoints as before. Only the presentation is new.
 */

// Reference plain-English copy per rule (line 2456–2462). Rules the catalog
// adds beyond these seven fall back to their docs summary.
const REF_PLAIN = {
  'daily-loss': 'We watch realised plus unrealised loss on the day. At the warning number you get a ping; at the hard number we cancel orders, close positions and lock the account until tomorrow.',
  'daily-profit-target': 'The opposite job: once you are properly up, we close the day so you stop handing it back. The account locks until the next reset and the gain is kept.',
  'stop-loss-alert': 'A position with no stop is the single most expensive habit in your ledger. We give you a short grace period to add one, then alert.',
  'risk-per-trade': 'Measured from entry to your stop. Without a stop we cannot size the risk, so this rule leans on stop loss protection being on.',
  'max-total-loss': 'Peak-to-trough across the whole account, not just today. Enforcement for this one is still being finished — right now it alerts rather than closes, and we would rather say so.',
  'max-trades-day': 'A trade counter is the cheapest revenge-trading brake there is. Hitting the cap locks the account for the rest of the session.',
  'close-after-losses': 'Two tiers. Three losses in a row buys you a short forced break; five means the day is over. The soft tier is the one that changes behaviour.',
};
// Rules whose enforcement is alert-only today (the engine does not close for them).
const PARTIAL = new Set(['max-total-loss', 'stop-loss-alert']);

function buildFields(template, instance) {
  const raw = Array.isArray(template.definition?.fields) ? template.definition.fields : [];
  const cfg = instance?.config && typeof instance.config === 'object' && !Array.isArray(instance.config)
    ? instance.config
    : {};
  return raw.map((f) => ({
    ...f,
    value: Object.prototype.hasOwnProperty.call(cfg, f.key) ? cfg[f.key] : f.value,
  }));
}

/** Group rules by catalog plan tier (from API: minPlanSlug + section title). */
function groupRulesByPlanSection(rules) {
  const map = new Map();
  for (const r of rules) {
    const key = r.minPlanSlug ?? '__none';
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: r.planSectionTitle || 'Rules',
        sortOrder: r.planSectionSortOrder ?? 99,
        rules: [],
      });
    }
    map.get(key).rules.push(r);
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

// Detailed, plain-English documentation per rule — surfaced by the "How it
// works" toggle in each card. Kept accurate to the current engine behaviour
// (soft profit target, kill-switch flatten, cooldown locks).
const RULE_DOCS = {
  'daily-loss': {
    summary: 'Caps how much you can lose in a single trading day. When the loss hits your limit, the kill switch closes everything and locks the account until the next daily reset — so one bad day can’t become a blown account.',
    how: [
      'Measured on your trading P&L (realized + unrealized) since the daily reset.',
      'Deposits and withdrawals are ignored — only real trading results count toward the limit.',
      'You can set it as a fixed amount or a percentage of your equity.',
    ],
    trigger: 'The kill switch fires — it cancels open orders, market-closes all positions, and locks the account until the next reset.',
  },
  'daily-profit-target': {
    summary: 'Locks in a winning day once you’ve booked your target, so you stop while you’re ahead instead of giving it back. This is a soft lock — it never force-closes an open winner.',
    how: [
      'Measured on realized (booked) profit only — an open trade keeps running, so you book on your own terms.',
      'Deposits are ignored, so adding funds can never look like profit.',
      'The lock only arms once your booked profit clears the target AND the account is flat (no open position).',
    ],
    trigger: 'New trades are locked until the next daily reset. Any position you already have open is left alone to run.',
  },
  'max-total-loss': {
    summary: 'A hard floor on total account drawdown across the whole account life — the last line of defence beneath your daily limit.',
    how: [
      'Watches your equity against your starting balance / high-water mark.',
      'Set as a fixed amount or a percentage of the account.',
      'Independent of the daily reset — this one does not reset each day.',
    ],
    trigger: 'Alerts when the account draws down past the configured amount so you can step in before deeper damage.',
  },
  'risk-per-trade': {
    summary: 'Caps how much any single trade can risk, based on where your stop-loss sits. Stops one oversized bet from doing outsized damage.',
    how: [
      'For each open position, it computes the loss your stop-loss implies as a percentage of equity.',
      'Uses the contract size and mark price, so the risk figure is accurate for Delta contracts.',
      'Only affects the offending position — the rest of your account is untouched.',
    ],
    trigger: 'If a trade’s stop implies more than your limit, that single position is auto-closed (reduce-only). The rest of the account keeps trading.',
  },
  'max-trades-day': {
    summary: 'Caps how many trades you can take in a day — a guard against overtrading and death-by-a-thousand-cuts.',
    how: [
      'Counts new positions opened since the daily reset.',
      'Trades that were blocked during a cooldown do NOT count against your allowance.',
      'It waits until you’re flat before locking, so it never force-closes a live trade.',
    ],
    trigger: 'Once you hit the cap and the account is flat, trading locks until the next daily reset.',
  },
  'close-after-losses': {
    summary: 'Breaks the revenge-trading spiral: after a run of losing trades in a row, it pauses you so you can reset instead of tilting into more losses.',
    how: [
      'Counts consecutive losing trades. A single winning trade resets the streak to zero.',
      'Two tiers: a shorter soft cooldown first, then a longer hard lock if the streak keeps going.',
      'The streak survives restarts and ignores trades that were blocked during a cooldown.',
    ],
    trigger: 'After the configured losses in a row, trading pauses for the cooldown window; a further streak escalates to the longer lock.',
  },
  'stop-loss-alert': {
    summary: 'Warns you when a position has been sitting open without a stop-loss attached — the single most common way traders turn a small loss into a big one.',
    how: [
      'Watches every open position for an attached stop order.',
      'If a position stays open past your configured window with no stop, it alerts.',
      'This rule alerts only — it does not auto-close, so you stay in control.',
    ],
    trigger: 'Sends an alert (dashboard + your notification channels) so you can add a stop before it hurts.',
  },
};

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * One-line "what it's actually set to" summary for the collapsed card, built
 * entirely from field values already loaded (no new data) — replaces the
 * generic template description there. Action phrases ("flattens and locks",
 * "rejects oversized orders") describe real, existing rule behavior (matches
 * RULE_DOCS' own "trigger" text above), not a new claim — only the numbers
 * are dynamic. Deliberately does NOT invent behavior a rule doesn't have —
 * e.g. stop-loss-alert only ever alerts, it never auto-closes.
 */
const SUMMARY_FORMATTERS = {
  'daily-loss': (v) =>
    v.mode === 'amount'
      ? `$${v.dailyLossAmount} · warns at $${v.warningAmount} · flattens and locks`
      : `${v.dailyLossPct}% · warns at ${v.warningPct}% · flattens and locks`,
  'daily-profit-target': (v) =>
    v.mode === 'amount'
      ? `$${v.dailyTargetAmount} target · locks in the win`
      : `${v.dailyTargetPct}% target · locks in the win`,
  'max-total-loss': (v) => `${v.maxDrawdownPct}% max drawdown`,
  'risk-per-trade': (v) => `${v.maxRiskPct}% of equity · rejects oversized orders`,
  'max-trades-day': (v) => {
    const n = Number(v.maxTrades);
    return `${v.maxTrades} per session${Number.isFinite(n) ? ` · rejects the ${ordinal(n + 1)} order` : ''}`;
  },
  'close-after-losses': (v) =>
    `${v.consecutiveLosses} in a row → ${v.cooldownHours}h lock · ${v.hardLossCount} in a row → ${v.hardCooldownHours}h`,
  'stop-loss-alert': (v) => `alerts after ${v.alertDelaySeconds}s unprotected`,
  hedging: (v) => (v.enabled ? 'blocks opposite-direction trades' : 'off'),
  stacking: (v) => `max ${v.maxPositions} open positions`,
  'minimum-hold': (v) => `min ${v.minHoldMinutes} min hold`,
  'htf-minimum': (v) => `min ${v.minChartMinutes} min chart interval`,
};

/** Falls back to the template description if a formatter is missing or a value isn't loaded yet. */
function ruleSummaryLine(templateSlug, values, fallback) {
  const fmt = SUMMARY_FORMATTERS[templateSlug];
  if (!fmt) return fallback;
  try {
    const line = fmt(values);
    return line && !/undefined|NaN/.test(line) ? line : fallback;
  } catch {
    return fallback;
  }
}

function fmtLockDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * The rule lock, stated plainly. Two states:
 *  - settling: saved in the last 15 minutes; the lock has not engaged yet, so
 *    more edits are allowed — this is what lets someone set up all their
 *    rules in one sitting.
 *  - locked: nothing can change until the date shown.
 * Support can lift it, and the copy says so. A lock with no escape at all
 * will eventually meet someone with a real reason.
 */
/** Live "time remaining" — d/h/m while there's a long way to go, m:ss inside the last hour. */
function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  const ms = iso ? Math.max(0, new Date(iso).getTime() - now) : 0;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = !iso ? '' : d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, '0')}`;
  return { label, ms, now };
}

const SETTLE_MS = 15 * 60_000;

const BTN_SOLID = 'padding:9px 14px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700';
const BTN_GHOST = 'padding:9px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600';
const INPUT = "width:100%;padding:9px 11px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font:600 14px/1.2 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums";

function fieldDisplay(field, value) {
  if (field.type === 'select') return (field.options || []).find((o) => o.value === value)?.label ?? String(value ?? '—');
  if (field.type === 'toggle') return value ? 'On' : 'Off';
  if (value === '' || value == null) return '—';
  return `${field.prefix ? `${field.prefix}` : ''}${value}${field.suffix ? ` ${field.suffix}` : ''}`;
}

function RuleRow({ rule, accessToken, tradingAccountId, isRetail, onSaved, cooled, ruleLocked, lockNote, expanded, onToggleExpand, enforcement }) {
  const toast = useToast();
  const isOn = !rule.locked && rule.enabled;
  // Reference A7/A8 derivations. Off wins over everything.
  const status = !isOn ? 'Off' : enforcement === 'armed' ? 'Armed' : enforcement === 'watching' ? 'Alert only' : 'Not enforcing';
  const tone = status === 'Armed' ? { bg: 'var(--mint-tint)', fg: 'var(--mint)' } : status === 'Alert only' ? { bg: 'var(--amber-tint)', fg: 'var(--amber)' } : { bg: 'var(--surface-3)', fg: 'var(--ink-3)' };
  const onUnlocked = isOn && !ruleLocked && !cooled;
  const toggleBlocked = isOn && (ruleLocked || cooled);
  const editable = !rule.locked && isOn && !ruleLocked && !cooled;
  const frozen = isOn && ruleLocked && !cooled;
  const isCooled = isOn && cooled;

  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasMode = rule.fields.some((f) => f.key === 'mode');
  const [values, setValues] = useState(() => {
    const base = rule.fields.reduce((acc, f) => ({ ...acc, [f.key]: f.value }), {});
    // Mode is pinned, never user-selectable: retail states limits in dollars,
    // prop firms in percent of account size.
    if (hasMode) base.mode = isRetail ? 'amount' : 'percent';
    return base;
  });
  const visibleFields = rule.fields.filter((f) => f.key !== 'mode' && (!f.showWhen || values[f.showWhen.key] === f.showWhen.equals));

  const configFromValues = () => {
    const relevant = new Set(rule.fields.filter((f) => !f.showWhen || values[f.showWhen.key] === f.showWhen.equals).map((f) => f.key));
    const config = {};
    for (const k of Object.keys(values)) {
      if (!relevant.has(k)) continue;
      const field = rule.fields.find((x) => x.key === k);
      let val = values[k];
      if (field?.type === 'number' && typeof val === 'string' && val !== '') { const n = Number(val); if (!Number.isNaN(n)) val = n; }
      config[k] = val;
    }
    return config;
  };

  /** Flip on/off. Off is a loosening the backend may defer; on is immediate. */
  const toggleEnabled = async () => {
    if (busy || rule.locked) return;
    const next = !rule.enabled;
    setBusy(true);
    try {
      const res = await saveRuleInstance({
        accessToken, tradingAccountId, templateSlug: rule.id, enabled: next,
        // A rule with no saved instance yet is created with its current limits.
        ...(rule.hasSavedInstance ? {} : { config: configFromValues() }),
      });
      if (res?.deferred?.effectiveAt) {
        const when = new Date(res.deferred.effectiveAt);
        toast.success('Scheduled', `${rule.name} turns off ${when.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. It stays active until then — you can cancel before it lands.`);
      } else {
        toast.success(next ? 'Rule on' : 'Rule off', `${rule.name} is now ${next ? 'active' : 'inactive'}.`);
      }
      onSaved?.();
    } catch (err) {
      toast.error('Could not update', err?.details?.error?.message || err?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  const handleSave = async () => {
    if (!accessToken || !tradingAccountId || rule.locked || busy) return;
    setBusy(true);
    try {
      const res = await saveRuleInstance({ accessToken, tradingAccountId, templateSlug: rule.id, config: configFromValues(), enabled: rule.enabled !== false });
      if (res?.deferred?.effectiveAt) {
        const when = new Date(res.deferred.effectiveAt);
        const hrs = Math.max(1, Math.round((when.getTime() - Date.now()) / 3600000));
        toast.success('Tightening applied — loosening scheduled', `Making a limit looser waits ${hrs}h (protects you from impulse changes). It takes effect ${when.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`);
      } else {
        toast.success('Saved', `${rule.name} updated.`);
      }
      setEditing(false);
      onSaved?.();
    } catch (e) {
      toast.error('Save failed', e?.message || 'Try again.');
    } finally { setBusy(false); }
  };

  const cancelPending = async (e) => {
    e.stopPropagation();
    setCancelling(true);
    try { await cancelPendingRuleChange({ accessToken, tradingAccountId, templateSlug: rule.id }); onSaved?.(); }
    finally { setCancelling(false); }
  };

  const slug = rule.templateSlug ?? rule.id;
  const accent = rule.locked ? { color: 'var(--ink-3)', tint: 'var(--surface-3)' } : ruleAccent(slug);
  const glyph = RULE_GLYPH[slug] ?? ICON.rules;
  const plain = REF_PLAIN[slug] || (RULE_DOCS[slug] ? `${RULE_DOCS[slug].summary} ${RULE_DOCS[slug].trigger}` : rule.description);
  const summary = rule.locked ? rule.description : ruleSummaryLine(rule.id, values, rule.description);

  return (
    <div style={sx('border-bottom:1px solid var(--line)')}>
      <button type="button" onClick={onToggleExpand} className="rx-row" style={sx('width:100%;display:flex;align-items:center;gap:13px;padding:15px 18px;border:0;background:transparent;text-align:left;color:var(--ink)')}>
        <span style={sx('flex:none;width:32px;height:32px;border-radius:9px;display:grid;place-items:center', { background: accent.tint, color: accent.color })}>
          <Icon d1={glyph[0]} d2={glyph[1]} stroke={1.7} size={17} />
        </span>
        <span style={sx('flex:1;min-width:0')}>
          <span style={sx('display:block;font-size:14px;font-weight:600;letter-spacing:-.005em')}>{rule.name}</span>
          <span style={sx('display:block;font-size:12.5px;color:var(--ink-3);margin-top:3px')}>{summary}</span>
        </span>
        {rule.pendingEffectiveAt && !rule.locked && (
          <span style={sx('flex:none;display:inline-flex;align-items:center;gap:6px')} title={`${rule.pendingEnabled === false ? 'This rule turns off' : 'Looser limit takes effect'} ${new Date(rule.pendingEffectiveAt).toLocaleString()}`}>
            <span style={sx('font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;border-radius:999px;background:rgba(31,111,208,0.12);color:var(--blue)')}>{rule.pendingEnabled === false ? 'Turns off when lock lifts' : 'Looser limit pending'}</span>
            <span role="button" tabIndex={0} onClick={cancelPending} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') cancelPending(e); }} title="Keep the current, stricter setting" style={sx('font-size:10.5px;font-weight:700;padding:4px 8px;border-radius:999px;border:1px solid var(--line-strong);color:var(--ink-2)')}>{cancelling ? 'Cancelling…' : 'Cancel'}</span>
          </span>
        )}
        <span style={sx('flex:none;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;border-radius:999px', { background: rule.locked ? 'var(--surface-3)' : tone.bg, color: rule.locked ? 'var(--ink-3)' : tone.fg })}>{rule.locked ? 'Upgrade' : status}</span>

        {rule.locked ? (
          <Link to="/pricing" onClick={(e) => e.stopPropagation()} style={sx('flex:none;padding:6px 10px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700;text-decoration:none')}>Upgrade</Link>
        ) : onUnlocked ? (
          <span role="switch" tabIndex={0} aria-checked="true" aria-label={`Turn off ${rule.name}`} title="Turn this rule off"
            onClick={(e) => { e.stopPropagation(); void toggleEnabled(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); void toggleEnabled(); } }}
            style={sx('flex:none;position:relative;display:block;width:38px;height:22px;border-radius:999px;background:var(--mint-solid);cursor:pointer', { opacity: busy ? 0.5 : 1 })}>
            <span style={sx('position:absolute;top:3px;left:19px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35)')} />
          </span>
        ) : toggleBlocked ? (
          <span role="switch" aria-checked="true" aria-disabled="true" title="Locked — you set this window yourself" onClick={(e) => e.stopPropagation()} style={sx('flex:none;position:relative;display:block;width:38px;height:22px;border-radius:999px;background:var(--mint-tint);border:1px solid var(--mint-line);cursor:not-allowed')}>
            <span style={sx('position:absolute;top:2px;left:18px;width:16px;height:16px;border-radius:50%;background:var(--mint);display:grid;place-items:center')}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="3" strokeLinecap="round"><path d="M8 10V7.5a4 4 0 018 0V10" /><path d="M6 10h12v9H6z" /></svg>
            </span>
          </span>
        ) : (
          <span role="switch" tabIndex={0} aria-checked="false" aria-label={`Turn on ${rule.name}`} title="Turn this rule on"
            onClick={(e) => { e.stopPropagation(); void toggleEnabled(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); void toggleEnabled(); } }}
            style={sx('flex:none;position:relative;display:block;width:38px;height:22px;border-radius:999px;background:var(--surface-3);border:1px solid var(--line);cursor:pointer', { opacity: busy ? 0.5 : 1 })}>
            <span style={sx('position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--ink-faint)')} />
          </span>
        )}

        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flex: 'none', color: expanded ? 'var(--ink)' : 'var(--ink-3)' }}><path d={expanded ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'} /></svg>
      </button>

      {expanded && (
        <div style={sx('padding:2px 18px 19px 63px')}>
          <p style={sx('margin:0 0 15px;font-size:13px;line-height:1.6;color:var(--ink-2);max-width:82ch')}>{plain}</p>

          <div style={sx('display:flex;gap:10px;flex-wrap:wrap;margin-bottom:15px')}>
            {visibleFields.map((field) => (
              <div key={field.key} style={sx('min-width:132px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)', editing ? { minWidth: 180 } : {})}>
                <div style={sx('font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>{field.label}</div>
                {!editing || rule.locked ? (
                  <div style={sx("margin-top:5px;font:600 15px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums")}>{rule.locked ? 'Upgrade to configure' : fieldDisplay(field, values[field.key])}</div>
                ) : field.type === 'select' ? (
                  <div style={sx('margin-top:6px;display:flex;gap:4px')}>
                    {(field.options || []).map((opt) => {
                      const on = values[field.key] === opt.value;
                      return <button key={opt.value} type="button" onClick={() => setValues((v) => ({ ...v, [field.key]: opt.value }))} style={sx('padding:6px 10px;border-radius:7px;font-size:12px;font-weight:600', { border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`, background: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--surface)' : 'var(--ink-2)' })}>{opt.label}</button>;
                    })}
                  </div>
                ) : field.type === 'toggle' ? (
                  <button type="button" role="switch" aria-checked={Boolean(values[field.key])} onClick={() => setValues((v) => ({ ...v, [field.key]: !v[field.key] }))} style={sx('margin-top:6px;position:relative;display:block;width:38px;height:22px;border-radius:999px;padding:0', { background: values[field.key] ? 'var(--mint-solid)' : 'var(--surface-3)', border: `1px solid ${values[field.key] ? 'var(--mint-solid)' : 'var(--line)'}` })}>
                    <span style={sx('position:absolute;top:2px;width:16px;height:16px;border-radius:50%', { left: values[field.key] ? '18px' : '2px', background: values[field.key] ? '#fff' : 'var(--ink-faint)' })} />
                  </button>
                ) : (
                  <div style={sx('margin-top:6px;display:flex;align-items:center;gap:6px')}>
                    {field.prefix && <span style={sx('font-size:13px;color:var(--ink-3)')}>{field.prefix}</span>}
                    <input type={field.type === 'number' ? 'number' : 'text'} value={values[field.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} aria-label={field.label} style={sx(INPUT)} />
                    {field.suffix && <span style={sx('font-size:13px;color:var(--ink-3)')}>{field.suffix}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={sx('display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-3);margin-bottom:14px')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ color: 'var(--ink-faint)' }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
            Enforced by: Risk engine · server-side
          </div>

          {PARTIAL.has(slug) && (
            <div style={sx('padding:12px 14px;margin-bottom:14px;border:1px solid var(--amber-line);border-radius:10px;background:var(--amber-tint);font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
              <strong style={sx('color:var(--amber);font-weight:700')}>Honest caveat:</strong> enforcement for this rule is still being built. Today it alerts you rather than closing anything, and we would rather tell you than let you assume otherwise.
            </div>
          )}

          {rule.locked ? (
            <div style={sx('display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--ink-3)')}>
              <span>Included on a higher plan.</span>
              <Link to="/pricing" style={sx(BTN_GHOST, { textDecoration: 'none' })}>View plans</Link>
            </div>
          ) : !isOn ? (
            <div style={sx('display:flex;align-items:center;gap:10px;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);font-size:12.5px;line-height:1.55;color:var(--ink-2);flex-wrap:wrap')}>
              <span style={sx('flex:1;min-width:220px')}>This rule is off, so nothing here is being enforced. You can turn it on at any time — even while your other rules are locked.{lockNote ? <span style={sx('display:block;margin-top:4px;font-size:11.5px;color:var(--ink-3)')}>{lockNote}</span> : null}</span>
              {editing ? (
                <>
                  <button type="button" disabled={busy} onClick={handleSave} style={sx(BTN_SOLID)}>{busy ? 'Saving…' : 'Save limits'}</button>
                  <button type="button" disabled={busy} onClick={() => setEditing(false)} style={sx(BTN_GHOST)}>Cancel</button>
                </>
              ) : (
                <>
                  {!cooled && <button type="button" onClick={() => setEditing(true)} style={sx(BTN_GHOST)}>Edit limits</button>}
                  <button type="button" disabled={busy} onClick={toggleEnabled} style={sx('flex:none;padding:8px 13px;border:1px solid var(--mint-line);border-radius:9px;background:var(--mint-tint);color:var(--mint);font-size:12.5px;font-weight:700')}>{busy ? 'Turning on…' : 'Turn this rule on'}</button>
                </>
              )}
            </div>
          ) : editable ? (
            <div style={sx('display:flex;gap:9px;flex-wrap:wrap')}>
              {editing ? (
                <>
                  <button type="button" disabled={busy} onClick={handleSave} style={sx(BTN_SOLID)}>{busy ? 'Saving…' : 'Save changes'}</button>
                  <button type="button" disabled={busy} onClick={() => setEditing(false)} style={sx(BTN_GHOST)}>Cancel</button>
                  {lockNote && <span style={sx('align-self:center;font-size:11.5px;color:var(--ink-3)')}>{lockNote}</span>}
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setEditing(true)} style={sx(BTN_SOLID)}>Edit rule</button>
                  <button type="button" disabled={busy} onClick={toggleEnabled} style={sx(BTN_GHOST)}>{busy ? 'Updating…' : 'Turn off'}</button>
                  {lockNote && <span style={sx('align-self:center;font-size:11.5px;color:var(--ink-3)')}>{lockNote}</span>}
                </>
              )}
            </div>
          ) : frozen ? (
            <div style={sx('display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid var(--mint-line);border-radius:9px;background:var(--mint-tint);font-size:12.5px;color:var(--mint);font-weight:600')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 11V8.4a5 5 0 0110 0V11" /><path d="M6 11h12v8H6z" /></svg>
              On and frozen by your rule lock — you chose this window
            </div>
          ) : isCooled ? (
            <div style={sx('display:flex;align-items:flex-start;gap:9px;padding:11px 13px;border:1px solid var(--red-line);border-radius:9px;background:var(--red-tint);font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:74ch')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.9" strokeLinecap="round" style={{ flex: 'none', marginTop: 1 }}><path d="M12 4v7" /><path d="M6.8 7.4a7.4 7.4 0 1010.4 0" /></svg>
              <span><strong style={sx('color:var(--red);font-weight:700')}>Editing blocked while your lockout runs.</strong> Different lock, different reason: this one stops you trading, and loosening a rule mid-lockout would be a way around it.</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function RulesTerminal() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { accounts, accountsLoading, selectedTradingAccountId, selectedAccount } = useTradingAccounts();
  // While the account is locked the API rejects rule edits, so the UI blocks
  // them rather than letting someone type a change that cannot save.
  const { locked: cooldownLocked } = useCooldown({ accessToken: session?.access_token, tradingAccountId: selectedTradingAccountId, account: selectedAccount });
  const { selected: guardSel, now: guardNow, subscribeTick } = useGuard();
  const cooled = cooldownLocked || guardSel.guard === 'locked';
  const [bundle, setBundle] = useState(null);
  const ruleLock = ruleLockNow(bundle?.ruleLock ?? null, guardNow);
  const ruleLocked = Boolean(ruleLock?.locked);
  // Tick every second while a lock or its setup window runs.
  useEffect(() => (ruleLock?.locked || ruleLock?.settling ? subscribeTick() : undefined), [ruleLock?.locked, ruleLock?.settling, subscribeTick]);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);
  // Accordion: at most one rule open at a time.
  const [expandedRuleId, setExpandedRuleId] = useState(null);
  const toggleExpandedRule = useCallback((ruleId) => setExpandedRuleId((cur) => (cur === ruleId ? null : ruleId)), []);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !selectedTradingAccountId) { setBundle(null); setBundleLoading(false); return; }
    setBundleLoading(true); setLoadError('');
    try {
      const data = await fetchRulesBundle({ accessToken: token, tradingAccountId: selectedTradingAccountId });
      setBundle(data); setLoadError(''); setReloadNonce((n) => n + 1);
    } catch (e) {
      setLoadError(e?.message || 'Could not load rules'); setBundle(null);
    } finally { setBundleLoading(false); }
  }, [session?.access_token, selectedTradingAccountId]);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const instanceBySlug = useMemo(() => { const m = new Map(); (bundle?.instances || []).forEach((i) => m.set(i.templateSlug, i)); return m; }, [bundle]);
  const displayRules = useMemo(() => {
    if (!bundle?.templates?.length) return [];
    return bundle.templates.map((t) => {
      const inst = instanceBySlug.get(t.slug);
      return {
        id: t.slug, templateSlug: t.slug, name: t.name, description: t.description,
        locked: !t.eligible, eligible: t.eligible,
        hasSavedInstance: Boolean(inst),
        enabled: inst ? inst.enabled !== false : false,
        pendingEnabled: inst?.pendingEnabled ?? null, pendingEffectiveAt: inst?.pendingEffectiveAt ?? null,
        fields: buildFields(t, inst),
        planSlugs: t.planSlugs, minPlanSlug: t.minPlanSlug, planSectionTitle: t.planSectionTitle, planSectionSortOrder: t.planSectionSortOrder,
      };
    });
  }, [bundle, instanceBySlug]);

  const availableRules = displayRules.filter((r) => r.eligible);
  const lockedRules = displayRules.filter((r) => !r.eligible);
  const lockedByPlan = useMemo(() => groupRulesByPlanSection(lockedRules), [lockedRules]);
  const onCount = availableRules.filter((r) => r.enabled).length;
  const total = availableRules.length;

  // Lock label (spec A3): locked → time left; unlocked → the chosen window.
  const lockTarget = ruleLock?.locked ? ruleLock.lockedUntil : ruleLock?.settling ? ruleLock.locksAt : null;
  const { label: lockLeft, ms: lockMs } = useCountdown(lockTarget);
  const lockLabel = ruleLock?.locked ? `${lockLeft} left` : ruleLock?.days ? `${ruleLock.days} days` : 'Off — daily';
  const graceShow = Boolean(ruleLock?.settling && !ruleLock?.locked && !cooled);
  const dayMode = ruleLock?.mode === 'day';
  // Said before the click, not learned from a 423 afterwards.
  const lockNote = ruleLocked
    ? 'Turning a rule on adds it to the running lock'
    : dayMode
      ? 'Rules are set for the day once you take your first trade'
      : ruleLock?.settling
        ? `Saves apply now; everything locks for ${ruleLock.days} days when the window closes`
        : ruleLock?.days
          ? `Saving starts a 15-minute window, then locks all rules for ${ruleLock.days} days`
          : '';
  const firstLock = (bundle?.instances ?? []).length <= 1;
  const graceSec = Math.floor(lockMs / 1000);
  // MM:SS inside the hour; d/h/m beyond it (never a five-digit minute count).
  const graceClock = graceSec >= 3600 ? lockLeft : `${String(Math.floor(graceSec / 60)).padStart(2, '0')}:${String(graceSec % 60).padStart(2, '0')}`;
  const gracePct = `${Math.min(100, Math.max(0, (1 - lockMs / SETTLE_MS) * 100))}%`;

  const showSkeleton = Boolean(session?.access_token) && !loadError && (accountsLoading || (Boolean(selectedTradingAccountId) && bundleLoading));

  const rowProps = (rule) => ({
    key: `${rule.id}-${reloadNonce}`, rule, accessToken: session?.access_token, tradingAccountId: selectedTradingAccountId,
    isRetail: bundle?.isRetail, onSaved: load, cooled, ruleLocked, lockNote, enforcement: guardSel.enforcement,
    expanded: expandedRuleId === rule.id, onToggleExpand: () => toggleExpandedRule(rule.id),
  });

  return (
    <div style={sx('animation:tgxSlide .22s ease-out')}>
      <div style={sx('margin-bottom:18px;max-width:78ch')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Rules</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Switch on what you want enforced. Every rule is on every plan — set them while calm, because they only matter when you are not.</p>
      </div>

      <section style={sx('margin-bottom:18px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('display:flex;align-items:center;gap:12px;padding:15px 21px;border-bottom:1px solid var(--line);flex-wrap:wrap')}>
          <h2 style={sx("margin:0;font:600 15px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.015em")}>How your protection fits together</h2>
          <span style={{ flex: 1 }} />
          <span style={sx('font-size:12px;color:var(--ink-3)')}><strong style={sx('color:var(--mint);font-weight:700;font-variant-numeric:tabular-nums')}>{onCount}</strong> of {total} rules on</span>
          <span style={sx('font-size:12px;color:var(--ink-3)')}>rule lock <strong style={sx('font-weight:700', { color: ruleLocked ? 'var(--mint)' : 'var(--ink-2)' })}>{lockLabel}</strong></span>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))')}>
          {[
            ['1', 'Switch on the rules you want', <>Every rule is off until you turn it on. Off rules do nothing at all — no alerts, no closing. Start with two.</>],
            ['2', 'Rule lock holds them there', <>Rules that are <strong style={sx('color:var(--ink);font-weight:700')}>on</strong> freeze for the window you pick — 7 days by default. Rules that are <strong style={sx('color:var(--ink);font-weight:700')}>off</strong> can always be turned on.</>],
            ['3', 'Killswitch is the manual one', <>Separate from rules. It stops you trading this account for a few hours, whatever your rules say. Set it on <button type="button" onClick={() => navigate('/dashboard/live')} style={sx('padding:0;border:0;background:none;color:var(--mint);font:inherit;font-weight:700;text-decoration:underline')}>Live guard</button>.</>],
          ].map(([n, title, body], idx) => (
            <div key={n} style={sx('padding:17px 21px', idx < 2 ? { borderRight: '1px solid var(--line)' } : {})}>
              <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:8px')}>
                <span style={sx("width:22px;height:22px;flex:none;border-radius:7px;background:var(--surface-3);display:grid;place-items:center;font:600 11px/1 'Space Grotesk',sans-serif;color:var(--ink-2)")}>{n}</span>
                <span style={sx('font-size:13.5px;font-weight:600')}>{title}</span>
              </div>
              <p style={sx('margin:0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {loadError && <p style={sx('margin:0 0 16px;font-size:12.5px;color:var(--amber)')}>{loadError}</p>}

      {session?.access_token && !accountsLoading && accounts.length === 0 && (
        <p style={sx('margin:0 0 16px;padding:13px 15px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);font-size:12.5px;color:var(--ink-2)')}>
          Add a trading account to save rules for it. <Link to="/dashboard/account/trading" style={sx('color:var(--mint);font-weight:700;text-decoration:underline')}>Trading accounts</Link>
        </p>
      )}

      {graceShow && (
        <div style={sx('display:flex;align-items:center;gap:14px;padding:16px 19px;margin-bottom:16px;border:1px solid var(--amber-line);border-radius:18px;background:var(--amber-tint);flex-wrap:wrap')}>
          <div style={sx("flex:none;font:700 26px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.03em;color:var(--amber)")}>{graceClock}</div>
          <div style={sx('flex:1;min-width:260px')}>
            <div style={sx('font-size:13.5px;font-weight:700;color:var(--amber)')}>Setup window — change anything you like</div>
            <p style={sx('margin:4px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:88ch')}>{firstLock ? 'First time setting rules, so you get fifteen minutes to adjust freely before the lock takes hold.' : 'You saved just now, so you have fifteen minutes to finish any other changes before the lock takes hold.'} When the clock runs out your <strong style={sx('color:var(--ink);font-weight:700')}>{ruleLock?.days ? `${ruleLock.days}-day` : 'session'} {firstLock ? 'default' : 'window'}</strong> starts. <button type="button" onClick={() => navigate('/dashboard/live')} style={sx('padding:0;border:0;background:none;color:var(--mint);font:inherit;font-weight:700;text-decoration:underline')}>Change the window on Live guard</button> if {ruleLock?.days === 7 ? 'a week' : 'that'} is wrong for you.</p>
            <div style={sx('margin-top:10px;height:4px;border-radius:999px;background:var(--surface-3);overflow:hidden')}>
              <div style={sx('height:100%;border-radius:999px;background:var(--amber-solid)', { width: gracePct })} />
            </div>
          </div>
          {/* TODO(api): no endpoint ends the settling window early ("Lock them in now"); the lock engages when the clock runs out. */}
        </div>
      )}

      {ruleLocked && (
        <div style={sx('display:flex;align-items:flex-start;gap:12px;padding:15px 18px;margin-bottom:16px;border:1px solid var(--mint-line);border-radius:13px;background:var(--mint-tint)')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="1.8" strokeLinecap="round" style={{ flex: 'none', marginTop: 1 }}><path d="M6 11V8.4a6 6 0 1112 0V11" /><path d="M5 11h14v9H5z" /></svg>
          <div style={{ flex: 1 }}>
            <div style={sx('font-size:13.5px;font-weight:700;color:var(--mint)')}>{dayMode ? `Rules are set for today's session — ${lockLeft} to the reset` : `Rules are frozen for another ${lockLeft}`}</div>
            <p style={sx('margin:4px 0 0;font-size:12.5px;color:var(--ink-2);max-width:92ch')}>{dayMode
              ? 'You have traded today, so the rules that are on hold until the daily reset. You can still turn on a rule that is off. Tomorrow, set your rules before your first trade.'
              : 'You can read every rule and see exactly what is armed. You cannot change one — including making it stricter, because the point of the freeze is not touching them at all. This is the rule lock you set on Live guard.'}</p>
            <button type="button" onClick={() => openSupport(`I'd like my rule lock released early. It's locked until ${fmtLockDate(ruleLock?.lockedUntil)}. Reason: `)} style={sx('margin-top:8px;padding:0;border:0;background:none;font-size:12px;color:var(--ink-3);text-decoration:underline')}>Need it lifted? Ask support</button>
          </div>
        </div>
      )}

      {showSkeleton ? (
        <div style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
          {[0, 1, 2, 3].map((i) => <div key={i} style={sx('height:64px;border-bottom:1px solid var(--line);background:var(--surface-2);animation:tgxPulse 1.4s ease-in-out infinite')} />)}
        </div>
      ) : (
        <>
          {availableRules.length > 0 && (
            <section style={sx('margin-bottom:22px')}>
              <div style={sx('display:flex;align-items:baseline;gap:12px;margin-bottom:10px;flex-wrap:wrap')}>
                <h2 style={sx("margin:0;font:600 16px/1.2 'Space Grotesk',sans-serif")}>Your rules</h2>
                <span style={sx('font-size:12.5px;color:var(--ink-3)')}>Every rule is on every plan, on every account.</span>
              </div>
              <div className="rx-group" style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
                {availableRules.map((rule) => <RuleRow {...rowProps(rule)} />)}
              </div>
            </section>
          )}

          {lockedByPlan.map((section) => (
            <section key={`locked-${section.key}`} style={sx('margin-bottom:22px')}>
              <div style={sx('display:flex;align-items:baseline;gap:12px;margin-bottom:10px;flex-wrap:wrap')}>
                <h2 style={sx("margin:0;font:600 16px/1.2 'Space Grotesk',sans-serif")}>{section.title && section.title !== 'Rules' ? section.title : 'On a higher plan'}</h2>
                <span style={sx('font-size:12.5px;color:var(--ink-3)')}>Included when you upgrade — <Link to="/pricing" style={sx('color:var(--mint);font-weight:700;text-decoration:underline')}>view plans</Link>.</span>
              </div>
              <div className="rx-group" style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
                {section.rules.map((rule) => <RuleRow {...rowProps(rule)} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
