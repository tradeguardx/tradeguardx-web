import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import DashboardPageBanner, { DashboardSectionHeading } from './DashboardPageBanner';
import { staggerContainer, staggerItem } from './dashboardMotion';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { useDashboardTheme } from '../../context/DashboardThemeContext';
import { useToast } from '../common/ToastProvider';
import { ShimmerBlock } from '../common/LoadingSkeleton';
import { fetchRulesBundle, saveRuleInstance } from '../../api/rulesApi';
import CooldownBanner from './CooldownBanner';
import { useCooldown } from '../../hooks/useCooldown';

/**
 * Plan slugs are storage keys, not copy. "pro_plus" leaked straight into the
 * stat card, where it also overflowed the box.
 */
function planDisplayName(slug) {
  if (!slug) return '—';
  const key = String(slug).toLowerCase().replace(/[\s-]/g, '_');
  return (
    { free: 'Free', pro: 'Pro', pro_plus: 'Pro+', proplus: 'Pro+' }[key]
    ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}


const RULE_VISUALS = {
  _default: {
    gradient: 'from-slate-500 to-slate-400',
    bgGlow: 'bg-slate-500/[0.06]',
    iconColor: 'text-slate-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  'daily-loss': {
    gradient: 'from-accent to-emerald-500',
    bgGlow: 'bg-accent/[0.07]',
    iconColor: 'text-accent',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  hedging: {
    gradient: 'from-rose-500 to-orange-400',
    bgGlow: 'bg-rose-500/[0.06]',
    iconColor: 'text-rose-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  'risk-per-trade': {
    gradient: 'from-blue-500 to-cyan-400',
    bgGlow: 'bg-blue-500/[0.06]',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  'max-total-loss': {
    gradient: 'from-violet-500 to-purple-400',
    bgGlow: 'bg-violet-500/[0.06]',
    iconColor: 'text-violet-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  stacking: {
    gradient: 'from-amber-400 to-yellow-300',
    bgGlow: 'bg-amber-500/[0.06]',
    iconColor: 'text-amber-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  'max-trades-day': {
    gradient: 'from-teal-400 to-emerald-400',
    bgGlow: 'bg-teal-500/[0.06]',
    iconColor: 'text-teal-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  'close-after-losses': {
    gradient: 'from-pink-500 to-rose-400',
    bgGlow: 'bg-pink-500/[0.06]',
    iconColor: 'text-pink-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  'stop-loss-alert': {
    gradient: 'from-orange-500 to-amber-400',
    bgGlow: 'bg-orange-500/[0.06]',
    iconColor: 'text-orange-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  'minimum-hold': {
    gradient: 'from-cyan-500 to-sky-400',
    bgGlow: 'bg-cyan-500/[0.06]',
    iconColor: 'text-cyan-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  'htf-minimum': {
    gradient: 'from-indigo-500 to-violet-400',
    bgGlow: 'bg-indigo-500/[0.06]',
    iconColor: 'text-indigo-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
      </svg>
    ),
  },
};

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

function RuleCard({ rule, index, accessToken, tradingAccountId, isRetail, onSaved, accountLocked = false }) {
  const toast = useToast();
  const { isDark } = useDashboardTheme();
  const hasMode = rule.fields.some((f) => f.key === 'mode');
  const [values, setValues] = useState(() => {
    const base = rule.fields.reduce((acc, f) => ({ ...acc, [f.key]: f.value }), {});
    if (hasMode) {
      // Prop accounts are pinned to percent; retail defaults to a $ amount for new rules.
      if (!isRetail) base.mode = 'percent';
      else if (!rule.hasSavedInstance) base.mode = 'amount';
    }
    return base;
  });
  /** Fields shown for the current mode; the mode selector itself is retail-only. */
  const visibleFields = rule.fields.filter((f) => {
    if (f.key === 'mode' && !isRetail) return false;
    if (f.showWhen && values[f.showWhen.key] !== f.showWhen.equals) return false;
    return true;
  });
  /** Collapse new rules by default so template defaults are not mistaken for active config. */
  const [expanded, setExpanded] = useState(() => Boolean(rule.hasSavedInstance && !rule.locked));
  const [saving, setSaving] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const docs = RULE_DOCS[rule.id];
  const handleSave = async () => {
    if (!accessToken || !tradingAccountId || rule.locked) return;
    setSaving(true);
    try {
      // Persist only fields relevant to the active mode (the mode key itself has
      // no showWhen, so it's always kept); skips the hidden mode's stale values.
      const relevant = new Set(
        rule.fields
          .filter((f) => !f.showWhen || values[f.showWhen.key] === f.showWhen.equals)
          .map((f) => f.key),
      );
      const config = {};
      for (const k of Object.keys(values)) {
        if (!relevant.has(k)) continue;
        const field = rule.fields.find((x) => x.key === k);
        let val = values[k];
        if (field?.type === 'number' && typeof val === 'string' && val !== '') {
          const n = Number(val);
          if (!Number.isNaN(n)) val = n;
        }
        config[k] = val;
      }
      const res = await saveRuleInstance({
        accessToken,
        tradingAccountId,
        templateSlug: rule.id,
        config,
        enabled: true,
      });
      if (res?.deferred?.effectiveAt) {
        const when = new Date(res.deferred.effectiveAt);
        const hrs = Math.max(1, Math.round((when.getTime() - Date.now()) / 3600000));
        toast.success(
          'Tightening applied — loosening scheduled',
          `Making a limit looser waits ${hrs}h (protects you from impulse changes). It takes effect ${when.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`,
        );
      } else {
        toast.success('Saved', `${rule.name} updated.`);
      }
      onSaved?.();
    } catch (e) {
      toast.error('Save failed', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      className="group relative"
    >
      <div
        className="relative overflow-hidden rounded-2xl border transition-all duration-300 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5"
        style={{
          borderColor: rule.locked ? 'var(--dash-border)' : 'var(--dash-border-hover)',
          backgroundColor: rule.locked ? 'var(--dash-bg-card)' : 'var(--dash-bg-raised)',
          boxShadow: 'var(--dash-shadow-card)',
        }}
      >
        {!rule.locked && (
          <div className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full ${rule.bgGlow} blur-3xl`} />
        )}

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full px-5 py-4 flex items-center gap-4 text-left"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-transform group-hover:scale-105">
            {!rule.locked && (
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${rule.gradient} opacity-20`} />
            )}
            {rule.locked && (
              <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: 'var(--dash-bg-input)' }} />
            )}
            <span className={`relative ${rule.iconColor}`}>{rule.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display font-semibold text-sm truncate" style={{ color: 'var(--dash-text-primary)' }}>{rule.name}</h3>
              {!rule.locked && rule.hasSavedInstance && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 text-accent"
                  style={{ backgroundColor: isDark ? 'rgba(0,212,170,0.10)' : 'rgba(0,212,170,0.08)', border: `1px solid rgba(0,212,170,${isDark ? '0.15' : '0.30'})` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_4px_rgba(0,212,170,0.6)]" />
                  Saved
                </span>
              )}
              {!rule.locked && !rule.hasSavedInstance && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 text-amber-400"
                  style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,${isDark ? '0.25' : '0.35'})` }}>
                  Not saved — defaults only
                </span>
              )}
              {!rule.locked && rule.pendingEffectiveAt && (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 text-sky-400"
                  title={`Looser limit takes effect ${new Date(rule.pendingEffectiveAt).toLocaleString()}`}
                  style={{ backgroundColor: isDark ? 'rgba(56,189,248,0.10)' : 'rgba(56,189,248,0.08)', border: `1px solid rgba(56,189,248,${isDark ? '0.25' : '0.35'})` }}>
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Looser limit pending
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--dash-text-muted)' }}>{rule.description}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {rule.locked && (
              <Link
                to="/pricing"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent/10 to-emerald-500/10 border border-accent/15 text-accent text-xs font-semibold hover:from-accent/20 hover:to-emerald-500/15 transition-all"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Upgrade
              </Link>
            )}
            <motion.svg
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-4 h-4"
              style={{ color: 'var(--dash-text-faint)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </button>

        <motion.div
          initial={false}
          animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid var(--dash-border)' }}>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--dash-text-muted)' }}>{rule.description}</p>

            {docs && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowDocs((s) => !s)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-[var(--dash-bg-card-hover)]"
                  style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
                  aria-expanded={showDocs}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  How it works
                  <svg className="h-3 w-3 transition-transform" style={{ transform: showDocs ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence initial={false}>
                  {showDocs && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div
                        className="mt-2 rounded-xl border p-3.5 text-xs leading-relaxed"
                        style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)', color: 'var(--dash-text-secondary)' }}
                      >
                        <p style={{ color: 'var(--dash-text-secondary)' }}>{docs.summary}</p>

                        <p className="mt-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--dash-text-faint)' }}>How it works</p>
                        <ul className="space-y-1.5">
                          {docs.how.map((line, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>

                        <p className="mt-3 rounded-lg px-2.5 py-2" style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                          <span className="font-semibold" style={{ color: 'var(--dash-text-primary)' }}>When it triggers: </span>
                          {docs.trigger}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {!rule.locked && !rule.hasSavedInstance && (
              <div
                className="mb-4 rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  borderColor: isDark ? 'rgba(251,191,36,0.25)' : 'rgba(245,158,11,0.35)',
                  backgroundColor: isDark ? 'rgba(251,191,36,0.06)' : '#fffbeb',
                  color: 'var(--dash-text-secondary)',
                }}
              >
                <span className="font-semibold text-amber-400/95">Not active yet.</span>{' '}
                Numbers and toggles here are template suggestions. Nothing is applied to your account or extension until you save this rule.
              </div>
            )}

            <div className="space-y-3">
              {visibleFields.map((field) => (
                <div key={field.key} className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <label className="text-sm font-medium" style={{ color: 'var(--dash-text-secondary)' }}>{field.label}</label>

                  {rule.locked ? (
                    <span className="text-sm italic" style={{ color: 'var(--dash-text-faint)' }}>Upgrade to configure</span>
                  ) : field.type === 'select' ? (
                    <div className="inline-flex rounded-xl p-0.5" style={{ backgroundColor: 'var(--dash-bg-input)', border: '1px solid var(--dash-border)' }}>
                      {(field.options || []).map((opt) => {
                        const active = values[field.key] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setValues((v) => ({ ...v, [field.key]: opt.value }))}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              backgroundColor: active ? 'var(--accent)' : 'transparent',
                              color: active ? 'var(--surface-950, #0d0f14)' : 'var(--dash-text-muted)',
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : field.type === 'toggle' ? (
                    <button
                      type="button"
                      onClick={() => setValues((v) => ({ ...v, [field.key]: !v[field.key] }))}
                      disabled={accountLocked}
                      className="relative w-14 h-8 rounded-full transition-all duration-300 disabled:opacity-50"
                      style={{ backgroundColor: values[field.key] ? undefined : 'var(--dash-toggle-track)' }}
                    >
                      {values[field.key] && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-accent to-emerald-400 shadow-sm shadow-accent/25" />
                      )}
                      <motion.span
                        animate={{ x: values[field.key] ? 24 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md"
                      />
                      <span className="sr-only">{values[field.key] ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  ) : (
                    <div className="relative">
                      {field.prefix && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--dash-text-muted)' }}>
                          {field.prefix}
                        </span>
                      )}
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={values[field.key]}
                        onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        disabled={accountLocked}
                        className={`w-28 py-2.5 rounded-xl text-sm font-medium text-right focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/30 transition-all ${
                          field.prefix ? 'pl-7 pr-3' : 'px-3'
                        } ${field.suffix ? 'pr-11' : ''}`}
                        style={{
                          backgroundColor: 'var(--dash-bg-input)',
                          border: '1px solid var(--dash-border)',
                          color: 'var(--dash-text-primary)',
                        }}
                      />
                      {field.suffix && (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 pl-1.5 text-sm pointer-events-none"
                          style={{ color: 'var(--dash-text-muted)' }}
                        >
                          {field.suffix}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!rule.locked && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || accountLocked}
                  title={accountLocked ? 'Locked until the cooldown ends' : undefined}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : rule.hasSavedInstance ? 'Save changes' : 'Save & enable'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function RulesTerminal() {
  const { session } = useAuth();
  const { isDark } = useDashboardTheme();
  const { accounts, accountsLoading, selectedTradingAccountId, selectedAccount } = useTradingAccounts();
  // While the account is locked the API rejects rule edits and deletes, so the
  // UI disables them rather than letting someone type a change that can't save.
  const { locked: accountLocked } = useCooldown({
    accessToken: session?.access_token,
    tradingAccountId: selectedTradingAccountId,
    account: selectedAccount,
  });
  const [bundle, setBundle] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !selectedTradingAccountId) {
      setBundle(null);
      setBundleLoading(false);
      return;
    }
    setBundleLoading(true);
    setLoadError('');
    try {
      const data = await fetchRulesBundle({
        accessToken: token,
        tradingAccountId: selectedTradingAccountId,
      });
      setBundle(data);
      setLoadError('');
      setReloadNonce((n) => n + 1);
    } catch (e) {
      setLoadError(e?.message || 'Could not load rules');
      setBundle(null);
    } finally {
      setBundleLoading(false);
    }
  }, [session?.access_token, selectedTradingAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  const instanceBySlug = useMemo(() => {
    const m = new Map();
    (bundle?.instances || []).forEach((i) => m.set(i.templateSlug, i));
    return m;
  }, [bundle]);

  const displayRules = useMemo(() => {
    if (!bundle?.templates?.length) return [];
    return bundle.templates.map((t) => {
      const vis = RULE_VISUALS[t.slug] || RULE_VISUALS._default;
      const inst = instanceBySlug.get(t.slug);
      return {
        id: t.slug,
        name: t.name,
        description: t.description,
        locked: !t.eligible,
        eligible: t.eligible,
        hasSavedInstance: Boolean(inst),
        pendingEffectiveAt: inst?.pendingEffectiveAt ?? null,
        fields: buildFields(t, inst),
        planSlugs: t.planSlugs,
        minPlanSlug: t.minPlanSlug,
        planSectionTitle: t.planSectionTitle,
        planSectionSortOrder: t.planSectionSortOrder,
        ...vis,
      };
    });
  }, [bundle, instanceBySlug]);

  const availableRules = displayRules.filter((r) => r.eligible);
  const lockedRules = displayRules.filter((r) => !r.eligible);
  const availableByPlan = useMemo(() => groupRulesByPlanSection(availableRules), [availableRules]);
  const lockedByPlan = useMemo(() => groupRulesByPlanSection(lockedRules), [lockedRules]);
  const savedEnabledCount = (bundle?.instances || []).filter((i) => i.enabled).length;

  const showRulesSkeleton =
    Boolean(session?.access_token) &&
    !loadError &&
    (accountsLoading || (Boolean(selectedTradingAccountId) && bundleLoading));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl"
    >
      <DashboardPageBanner
        accent="accent"
        title="Rules Terminal"
        subtitle="Rules on your plan are listed below. Values are suggestions until you save — only saved rules are stored and synced for your account."
        badge={(
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(0,212,170,0.5)]" />
            {bundle ? `${savedEnabledCount} saved` : '…'}
            <span style={{ color: 'var(--dash-text-faint)' }}>
              / {bundle?.maxRules != null ? `max ${bundle.maxRules}` : '—'}
            </span>
          </span>
        )}
      />

      {loadError && (
        <p className="mb-6 text-sm text-amber-400/90">{loadError}</p>
      )}

      {!accountsLoading && selectedTradingAccountId && (
        <CooldownBanner
          accessToken={session?.access_token}
          tradingAccountId={selectedTradingAccountId}
          account={selectedAccount}
          note="Rules are locked until the cooldown lifts. You can still add a new rule."
        />
      )}

      {!accountsLoading && accounts.length > 0 && selectedAccount && (
        <div className="mb-6 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--dash-text-muted)' }}>
            Active account
          </p>
          <p className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
            Rules apply to the account selected in the header. Switch there to configure another prop or platform.
          </p>
          {(selectedAccount.accountSize != null || selectedAccount.accountCurrency) && (
            <p className="mt-2 text-xs font-medium" style={{ color: 'var(--dash-text-primary)' }}>
              {selectedAccount.accountSize != null ? Number(selectedAccount.accountSize).toLocaleString() : '—'}
              {selectedAccount.accountCurrency ? ` ${selectedAccount.accountCurrency}` : ''}
            </p>
          )}
          <Link
            to="/dashboard/account/trading"
            className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
          >
            Manage accounts &amp; pairing
          </Link>
        </div>
      )}

      {session?.access_token && !accountsLoading && accounts.length === 0 && (
        <p className="mb-6 text-sm rounded-xl border px-4 py-3" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>
          Add a trading account to save rules per prop or platform.{' '}
          <Link to="/dashboard/account/trading" className="font-semibold text-accent hover:underline">
            Trading accounts
          </Link>
        </p>
      )}

      {showRulesSkeleton ? (
        <>
          <p className="mb-6 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
            {accountsLoading ? 'Loading trading accounts…' : 'Loading rules…'}
          </p>
          <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((k) => (
              <ShimmerBlock key={k} className="h-[92px] w-full rounded-2xl sm:h-[100px]" />
            ))}
          </div>
          <div className="mb-10 space-y-3">
            <ShimmerBlock className="h-5 w-40" />
            {[...Array(4)].map((_, i) => (
              <ShimmerBlock key={i} className="h-[88px] w-full rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
          >
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -3 }}
              className="relative overflow-hidden rounded-2xl border p-4 transition-shadow duration-300 hover:shadow-md hover:shadow-accent/10 sm:p-5"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/[0.08] blur-2xl" />
              <p className="relative text-2xl font-display font-bold text-accent sm:text-3xl">{availableRules.length}</p>
              <p className="relative mt-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>On your plan</p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -3 }}
              className="relative overflow-hidden rounded-2xl border p-4 transition-shadow duration-300 hover:shadow-md sm:p-5"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-500/[0.06] blur-2xl" />
              <p className="relative text-2xl font-display font-bold sm:text-3xl" style={{ color: 'var(--dash-text-secondary)' }}>{lockedRules.length}</p>
              <p className="relative mt-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>Upgrade to unlock</p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -3 }}
              className="relative col-span-2 overflow-hidden rounded-2xl border p-4 transition-shadow duration-300 hover:shadow-md sm:p-5 lg:col-span-1"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/[0.08] blur-2xl" />
              <p className="relative truncate text-2xl font-display font-bold text-emerald-400 sm:text-3xl">{planDisplayName(bundle?.planSlug)}</p>
              <p className="relative mt-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>Current plan</p>
            </motion.div>
          </motion.div>

          <div className="mb-10">
            <DashboardSectionHeading
              icon={(
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-[10px] font-bold text-accent">✓</span>
              )}
            >
              Available on your plan
            </DashboardSectionHeading>
            <div className="space-y-8">
              {availableByPlan.map((section) => (
                <div key={section.key}>
                  {section.title && section.title !== 'Rules' && (
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                      style={{ color: 'var(--dash-text-muted)' }}
                    >
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-3">
                    {section.rules.map((rule, i) => (
                      <RuleCard
                        accountLocked={accountLocked}
                        key={`${rule.id}-${reloadNonce}`}
                        rule={rule}
                        index={i}
                        accessToken={session?.access_token}
                        tradingAccountId={selectedTradingAccountId}
                        isRetail={bundle?.isRetail}
                        onSaved={load}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lockedRules.length > 0 && (
            <div className="mb-8">
              <DashboardSectionHeading
                icon={(
                  <svg className="h-4 w-4 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              >
                Upgrade to unlock
              </DashboardSectionHeading>
              <div className="space-y-8">
                {lockedByPlan.map((section) => (
                  <div key={`locked-${section.key}`}>
                    {section.title && section.title !== 'Rules' && (
                      <p
                        className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                        style={{ color: 'var(--dash-text-muted)' }}
                      >
                        {section.title}
                      </p>
                    )}
                    <div className="space-y-3">
                      {section.rules.map((rule, i) => (
                        <RuleCard
                          accountLocked={accountLocked}
                          key={`${rule.id}-${reloadNonce}`}
                          rule={rule}
                          index={i + availableRules.length}
                          accessToken={session?.access_token}
                          tradingAccountId={selectedTradingAccountId}
                          isRetail={bundle?.isRetail}
                          onSaved={load}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lockedRules.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative overflow-hidden rounded-2xl border"
              style={{ borderColor: isDark ? 'rgba(0,212,170,0.15)' : 'rgba(0,212,170,0.25)', backgroundColor: isDark ? 'transparent' : '#f0fdf9', boxShadow: isDark ? 'none' : '0 1px 6px rgba(0,212,170,0.08)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.06] via-violet-500/[0.04] to-transparent" />
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/[0.1] blur-3xl" />
              <div className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-violet-500/[0.08] blur-3xl" />

              <div className="relative p-6 sm:p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-emerald-500/15 ring-1 ring-accent/20">
                  <svg className="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold mb-2" style={{ color: 'var(--dash-text-primary)' }}>Unlock {lockedRules.length} more rules</h3>
                <p className="text-sm mb-6 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
                  Higher plans include additional protection templates. Upgrade to configure them here.
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-emerald-400 text-surface-950 font-bold text-sm shadow-lg shadow-accent/20 transition-all hover:shadow-accent/30 hover:brightness-110"
                  >
                    View plans
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
