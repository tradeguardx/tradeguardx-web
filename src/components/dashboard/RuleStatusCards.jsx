import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchTradingAccounts } from '../../api/tradingAccountsApi';
import { fetchRulesBundle } from '../../api/rulesApi';
import { supabase } from '../../lib/supabaseClient';
import { staggerContainer, staggerItem } from './dashboardMotion';

const FALLBACK_POLL_MS = 30000;

const RED = '#ef4444';
const AMBER = '#f59e0b';
const GREEN = '#34d399';
const ACCENT = 'var(--accent, #00d4aa)';

// Per-rule accent + icon (single-path heroicon-style).
const RULE_META = {
  'daily-loss': { tint: '#f87171', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  'daily-profit-target': { tint: '#34d399', icon: 'M2.25 18 9 11.25l3 3L21.75 6M21.75 6h-4.5m4.5 0v4.5' },
  'max-trades-day': { tint: '#2dd4bf', icon: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' },
  'close-after-losses': { tint: '#f472b6', icon: 'M15.75 5.25v13.5m-7.5-13.5v13.5' },
  'risk-per-trade': { tint: '#60a5fa', icon: 'M9 14.25 15 8.25M9.75 9a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm6 6a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  'max-total-loss': { tint: '#a78bfa', icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  'stop-loss-alert': { tint: '#fb923c', icon: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0' },
  _default: { tint: '#94a3b8', icon: 'M9 12.75 11.25 15 15 9.75' },
};

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function resolveAmount(cfg, dse, amountKey, pctKey) {
  if (!cfg) return null;
  const mode = cfg.mode === 'amount' ? 'amount' : 'percent';
  if (mode === 'amount') return n(cfg[amountKey]);
  const pct = n(cfg[pctKey]);
  return pct != null && dse != null ? dse * (pct / 100) : null;
}

/**
 * Human-readable "what it does" + live status for one enabled rule.
 * Returns { trigger, status, tone, bar?, pips? }.
 *   bar  = continuous progress (for $ amounts)
 *   pips = discrete counter (for trade/loss counts) → clearer than a bar
 */
function computeRule(slug, cfg, live, balance, fmt) {
  const dse = live.dailyStartingEquity;
  const ce = live.currentEquity;
  const equity = ce != null ? ce : balance;
  const dp = live.dailyPnl;
  // Trading P&L (deposit-immune) when the engine has persisted it; else equity delta.
  const pnl = dp != null ? dp : dse != null && ce != null ? ce - dse : null;
  // Deposit-adjusted capital for % limits.
  const dayBase = dp != null && ce != null ? ce - dp : dse;

  switch (slug) {
    case 'daily-loss': {
      const limit = resolveAmount(cfg, dayBase, 'dailyLossAmount', 'dailyLossPct');
      if (limit == null || limit <= 0) return { trigger: 'Set, but no loss limit configured.', tone: 'muted' };
      const drawdown = pnl != null && pnl < 0 ? -pnl : 0;
      const pct = Math.min((drawdown / limit) * 100, 100);
      const hit = drawdown >= limit;
      return {
        trigger: `Closes & locks trading if you lose ${fmt(limit)} today`,
        status: pnl == null ? 'Waiting for live equity' : drawdown === 0 ? "No loss today — you're clear" : `Down ${fmt(drawdown)} of ${fmt(limit)}`,
        tone: hit ? 'danger' : pct >= 75 ? 'warn' : 'ok',
        bar: { pct, color: hit ? RED : pct >= 75 ? AMBER : ACCENT },
      };
    }
    case 'daily-profit-target': {
      const target = resolveAmount(cfg, dayBase, 'dailyTargetAmount', 'dailyTargetPct');
      if (target == null || target <= 0) return { trigger: 'Set, but no target configured.', tone: 'muted' };
      const profit = pnl != null && pnl > 0 ? pnl : 0;
      const pct = Math.min((profit / target) * 100, 100);
      const hit = profit >= target;
      return {
        trigger: `Locks the day once you book ${fmt(target)} — winners run first`,
        status: pnl == null ? 'Waiting for live equity' : `${fmt(profit)} of ${fmt(target)}`,
        tone: hit ? 'target' : 'ok',
        bar: { pct, color: GREEN },
      };
    }
    case 'max-trades-day': {
      const max = n(cfg?.maxTrades);
      if (max == null || max <= 0) return { trigger: 'Set, but no trade cap configured.', tone: 'muted' };
      const used = live.tradeCountToday ?? 0;
      const hit = used >= max;
      const left = Math.max(max - used, 0);
      return {
        trigger: `Stops you after ${max} trade${max === 1 ? '' : 's'} in a day`,
        status: hit ? 'Daily limit reached' : `${left} trade${left === 1 ? '' : 's'} left today`,
        tone: hit ? 'danger' : used >= max - 1 ? 'warn' : 'ok',
        pips: { filled: Math.min(used, max), total: max, color: hit ? RED : used >= max - 1 ? AMBER : ACCENT },
      };
    }
    case 'close-after-losses': {
      const soft = n(cfg?.consecutiveLosses);
      if (soft == null || soft <= 0) return { trigger: 'Set, but no streak count configured.', tone: 'muted' };
      const softHrs = n(cfg?.cooldownHours) ?? 3;
      const hard = n(cfg?.hardLossCount) ?? 5;
      const hardHrs = n(cfg?.hardCooldownHours) ?? 12;
      const streak = live.consecutiveLosses ?? 0;
      const hitHard = streak >= hard;
      const hitSoft = streak >= soft;
      const moreNeeded = Math.max(soft - streak, 0);
      return {
        trigger: `Pauses trading after ${soft} losing trades in a row (${softHrs}h)`,
        status:
          streak === 0
            ? 'No losses in a row right now'
            : hitSoft
              ? `${streak} in a row — cooldown active`
              : `${streak} loss${streak === 1 ? '' : 'es'} in a row · ${moreNeeded} more triggers the ${softHrs}h cooldown`,
        subnote: `Hard lock at ${hard} in a row → ${hardHrs}h`,
        tone: hitHard ? 'danger' : hitSoft ? 'warn' : 'ok',
        pips: { filled: Math.min(streak, hard), total: hard, mark: soft, color: hitHard ? RED : hitSoft ? AMBER : GREEN },
      };
    }
    case 'risk-per-trade': {
      const pct = n(cfg?.maxRiskPct);
      if (pct == null || pct <= 0) return { trigger: 'Set, but no risk % configured.', tone: 'muted' };
      const amount = equity != null ? equity * (pct / 100) : null;
      return {
        trigger: amount != null ? `Auto-closes a trade risking over ${pct}% of equity (${fmt(amount)})` : `Caps each trade's risk at ${pct}% of equity`,
        status: equity != null ? `Based on ${fmt(equity)} equity` : 'Waiting for live equity',
        tone: 'ok',
      };
    }
    case 'max-total-loss': {
      const pct = n(cfg?.maxDrawdownPct);
      if (pct == null || pct <= 0) return { trigger: 'Set, but no drawdown % configured.', tone: 'muted' };
      if (balance == null) return { trigger: `Alerts if the account falls ${pct}% from its balance`, tone: 'muted' };
      const amount = balance * (pct / 100);
      const floor = balance - amount;
      const drawdown = equity != null ? balance - equity : null;
      const ddPct = drawdown != null && amount > 0 ? Math.min(Math.max((drawdown / amount) * 100, 0), 100) : 0;
      const hit = drawdown != null && drawdown >= amount;
      return {
        trigger: `Alerts if the account drops ${pct}% — down to ${fmt(floor)}`,
        status: equity != null ? `Now at ${fmt(equity)}` : 'Waiting for live equity',
        tone: hit ? 'danger' : ddPct >= 75 ? 'warn' : 'ok',
        bar: { pct: ddPct, color: hit ? RED : ddPct >= 75 ? AMBER : ACCENT },
      };
    }
    case 'stop-loss-alert': {
      const secs = n(cfg?.alertDelaySeconds);
      if (secs == null || secs <= 0) return { trigger: 'Set, but no delay configured.', tone: 'muted' };
      return {
        trigger: `Warns you if a position sits ${secs}s with no stop-loss`,
        status: 'Watching open positions',
        tone: 'ok',
      };
    }
    default:
      return null;
  }
}

const TONE_PILL = {
  danger: { label: 'Triggered', bg: 'rgba(239,68,68,0.14)', fg: RED },
  warn: { label: 'Close', bg: 'rgba(245,158,11,0.14)', fg: AMBER },
  target: { label: 'Target hit', bg: 'rgba(52,211,153,0.14)', fg: GREEN },
  ok: { label: 'Armed', bg: 'rgba(0,212,170,0.12)', fg: '#00d4aa' },
  muted: { label: 'Configured', bg: 'var(--dash-bg-input)', fg: 'var(--dash-text-faint)' },
};

function Pips({ filled, total, mark, color }) {
  const count = Math.min(total, 12);
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="h-2 flex-1 rounded-full transition-colors"
          style={{
            backgroundColor: i < filled ? color : 'var(--dash-bg-input)',
            outline: mark && i === mark - 1 ? `1px solid ${color}66` : 'none',
            outlineOffset: '1px',
          }}
        />
      ))}
    </div>
  );
}

export default function RuleStatusCards({ accessToken, tradingAccountId, account }) {
  const currency = account?.accountCurrency || 'USD';
  const balance = n(account?.accountSize);
  const [bundle, setBundle] = useState(null);
  const [live, setLive] = useState(() => ({
    dailyStartingEquity: n(account?.dailyStartingEquity),
    currentEquity: n(account?.currentEquity),
    dailyPnl: n(account?.dailyPnl),
    tradeCountToday: n(account?.tradeCountToday),
    consecutiveLosses: n(account?.consecutiveLosses),
  }));

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;
    fetchRulesBundle({ accessToken, tradingAccountId })
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, tradingAccountId]);

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;

    const apply = (row) => {
      if (!row || cancelled) return;
      setLive({
        dailyStartingEquity: n(row.daily_starting_equity ?? row.dailyStartingEquity),
        currentEquity: n(row.current_equity ?? row.currentEquity),
        dailyPnl: n(row.daily_pnl ?? row.dailyPnl),
        tradeCountToday: n(row.trade_count_today ?? row.tradeCountToday),
        consecutiveLosses: n(row.consecutive_losses ?? row.consecutiveLosses),
      });
    };

    const snapshot = async () => {
      try {
        const accounts = await fetchTradingAccounts({ accessToken });
        const a = accounts.find((x) => x.id === tradingAccountId);
        if (a) apply(a);
      } catch {
        /* keep last known */
      }
    };
    snapshot();

    const channel = supabase
      .channel(`rule-cards-equity-${tradingAccountId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trading_accounts', filter: `id=eq.${tradingAccountId}` },
        (payload) => apply(payload.new),
      )
      .subscribe();

    const id = setInterval(snapshot, FALLBACK_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [accessToken, tradingAccountId]);

  const templateBySlug = useMemo(() => {
    const m = new Map();
    (bundle?.templates || []).forEach((t) => m.set(t.slug, t));
    return m;
  }, [bundle]);

  const cards = useMemo(() => {
    const fmt = (v) =>
      new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
    const enabled = (bundle?.instances || []).filter((i) => i.enabled);
    return enabled
      .map((inst) => {
        const view = computeRule(inst.templateSlug, inst.config, live, balance, fmt);
        if (!view) return null;
        const tpl = templateBySlug.get(inst.templateSlug);
        const meta = RULE_META[inst.templateSlug] || RULE_META._default;
        return { slug: inst.templateSlug, name: tpl?.name || inst.templateSlug, ...meta, ...view };
      })
      .filter(Boolean);
  }, [bundle, live, balance, currency, templateBySlug]);

  if (!bundle) return null;

  if (cards.length === 0) {
    return (
      <div
        className="rounded-2xl border px-4 py-4 text-sm"
        style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', color: 'var(--dash-text-muted)' }}
      >
        No rules enabled for this account yet.{' '}
        <Link to="/dashboard/rules" className="text-accent hover:underline">
          Configure rules
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--dash-text-muted)' }}>
            Active guardrails
          </span>
          <span className="rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: '#00d4aa' }}>
            {cards.length}
          </span>
        </div>
        <Link to="/dashboard/rules" className="font-mono text-[10px] font-semibold uppercase tracking-wider text-accent hover:underline">
          Edit rules →
        </Link>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const pill = TONE_PILL[c.tone] || TONE_PILL.ok;
          return (
            <motion.div
              key={c.slug}
              variants={staggerItem}
              className="group relative overflow-hidden rounded-2xl border p-4 transition-colors hover:border-white/15"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-[0.09] blur-2xl" style={{ backgroundColor: c.tint }} />

              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: c.tint }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.tint, boxShadow: `0 0 6px ${c.tint}80` }} />
                  {c.name}
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: pill.bg, color: pill.fg }}
                >
                  {pill.label}
                </span>
              </div>

              <p className="relative mt-2.5 text-[13px] font-semibold leading-snug" style={{ color: 'var(--dash-text-primary)' }}>
                {c.trigger}
              </p>

              {c.bar && (
                <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--dash-bg-input)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.bar.pct}%`, backgroundColor: c.bar.color }} />
                </div>
              )}
              {c.pips && <Pips {...c.pips} />}

              {c.status && (
                <p className="relative mt-2.5 font-mono text-[10px] leading-snug" style={{ color: 'var(--dash-text-secondary)' }}>
                  {c.status}
                </p>
              )}
              {c.subnote && (
                <p className="relative mt-1 font-mono text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>
                  {c.subnote}
                </p>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
