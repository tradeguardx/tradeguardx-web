import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchTradingAccounts } from '../../api/tradingAccountsApi';
import { fetchRulesBundle } from '../../api/rulesApi';
import { supabase } from '../../lib/supabaseClient';

const FALLBACK_POLL_MS = 30000;

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function resolveAmount(cfg, base, amountKey, pctKey) {
  if (!cfg) return null;
  const mode = cfg.mode === 'amount' ? 'amount' : 'percent';
  if (mode === 'amount') return n(cfg[amountKey]);
  const pct = n(cfg[pctKey]);
  return pct != null && base != null ? base * (pct / 100) : null;
}
function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
// Live "2h 05m 41s" countdown from a millisecond remainder.
function fmtCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`;
}

// Palette (dark hero, terminal-ish labels)
/**
 * One-shot celebration for a green day.
 *
 * Fires only when the profit target is actually banked, and only once per day —
 * a burst that replays on every navigation stops reading as a reward and starts
 * reading as a bug. Ribbons animate out and fade; nothing loops, so the card
 * settles into a calm state you can still read the numbers off.
 *
 * Respects prefers-reduced-motion via CSS at the call site.
 */
function WinBurst({ storageKey }) {
  // Decided at mount, not in an effect: the answer is already known from
  // storage, and setting state in an effect just costs an extra render.
  const [play] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== '1';
    } catch {
      return true; // private mode — a replay beats never celebrating
    }
  });

  // The effect only records that we've played, so it stays a pure write-out.
  useEffect(() => {
    if (!play) return;
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
  }, [play, storageKey]);

  if (!play) return null;

  // Deterministic spread so the burst looks designed, not random.
  const bits = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const spread = 120 + (i % 5) * 26;
    return {
      i,
      x: Math.cos(angle) * spread,
      y: Math.sin(angle) * spread * 0.55,
      rotate: (i % 2 ? 1 : -1) * (90 + i * 12),
      color: ['#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24'][i % 4],
      delay: (i % 6) * 0.03,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-10 motion-reduce:hidden" aria-hidden>
      <div className="absolute left-1/2 top-1/2">
        {bits.map((b) => (
          <motion.span
            key={b.i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], x: b.x, y: [0, b.y, b.y + 40], scale: 1, rotate: b.rotate }}
            transition={{ duration: 1.5, delay: b.delay, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              width: 7,
              height: 12,
              borderRadius: 2,
              backgroundColor: b.color,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const GREEN = '#34d399';
const RED = '#f87171';
const AMBER = '#fbbf24';
const MUTED = '#8b98a5';

// state → visual + status pill
const STATES = {
  clear: { pill: 'Session live', dot: GREEN, accent: GREEN, bg: 'radial-gradient(120% 140% at 15% 0%, #0c1a15 0%, #070d0b 60%)' },
  cooldown: { pill: 'Cooldown', dot: AMBER, accent: AMBER, bg: 'radial-gradient(120% 140% at 15% 0%, #1c1408 0%, #0a0703 60%)' },
  dayLocked: { pill: 'Day locked', dot: RED, accent: RED, bg: 'radial-gradient(120% 140% at 15% 0%, #1e0f0d 0%, #0a0505 60%)' },
  targetHit: { pill: 'Target hit · locked in', dot: GREEN, accent: GREEN, bg: 'radial-gradient(120% 140% at 15% 0%, #0c1a15 0%, #070d0b 60%)' },
};

export default function SessionHero({ accessToken, tradingAccountId, account }) {
  const currency = account?.accountCurrency || 'USD';
  const exchange = account?.propFirmSlug?.startsWith('delta') ? 'Delta' : account?.propFirmSlug || 'exchange';
  const [bundle, setBundle] = useState(null);
  const [live, setLive] = useState(() => ({
    dailyPnl: n(account?.dailyPnl),
    dailyStartingEquity: n(account?.dailyStartingEquity),
    currentEquity: n(account?.currentEquity),
    equityUpdatedAt: account?.equityUpdatedAt ?? null,
    tradeCountToday: n(account?.tradeCountToday),
    consecutiveLosses: n(account?.consecutiveLosses),
    cooldownUntil: account?.cooldownUntil ?? null,
    cooldownReason: account?.cooldownReason ?? null,
  }));
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;
    fetchRulesBundle({ accessToken, tradingAccountId })
      .then((b) => !cancelled && setBundle(b))
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
        dailyPnl: n(row.daily_pnl ?? row.dailyPnl),
        dailyStartingEquity: n(row.daily_starting_equity ?? row.dailyStartingEquity),
        currentEquity: n(row.current_equity ?? row.currentEquity),
        equityUpdatedAt: row.equity_updated_at ?? row.equityUpdatedAt ?? null,
        tradeCountToday: n(row.trade_count_today ?? row.tradeCountToday),
        consecutiveLosses: n(row.consecutive_losses ?? row.consecutiveLosses),
        cooldownUntil: row.cooldown_until ?? row.cooldownUntil ?? null,
        cooldownReason: row.cooldown_reason ?? row.cooldownReason ?? null,
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
      .channel(`session-hero-${tradingAccountId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trading_accounts', filter: `id=eq.${tradingAccountId}` }, (p) => apply(p.new))
      .subscribe();
    const id = setInterval(snapshot, FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [accessToken, tradingAccountId]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cfgBySlug = useMemo(() => {
    const m = new Map();
    (bundle?.instances || []).filter((i) => i.enabled).forEach((i) => m.set(i.templateSlug, i.config));
    return m;
  }, [bundle]);

  const model = useMemo(() => {
    const dp = live.dailyPnl;
    const ce = live.currentEquity;
    // Deposit-adjusted capital base for % limits.
    const base = dp != null && ce != null ? ce - dp : live.dailyStartingEquity;
    const lossCfg = cfgBySlug.get('daily-loss');
    const targetCfg = cfgBySlug.get('daily-profit-target');
    const streakCfg = cfgBySlug.get('close-after-losses');
    const maxTrades = n(cfgBySlug.get('max-trades-day')?.maxTrades);

    const lossLimit = resolveAmount(lossCfg, base, 'dailyLossAmount', 'dailyLossPct');
    const target = resolveAmount(targetCfg, base, 'dailyTargetAmount', 'dailyTargetPct');
    const soft = n(streakCfg?.consecutiveLosses);
    const softHrs = n(streakCfg?.cooldownHours) ?? 3;
    const hard = n(streakCfg?.hardLossCount) ?? 5;
    const hardHrs = n(streakCfg?.hardCooldownHours) ?? 12;

    const streak = live.consecutiveLosses ?? 0;
    const used = live.tradeCountToday ?? 0;
    const cooling = live.cooldownUntil && new Date(live.cooldownUntil).getTime() > nowTick;
    const reason = live.cooldownReason;

    // State
    let state = 'clear';
    if (cooling) {
      if (reason === 'daily_loss' || reason === 'max_trades_day') state = 'dayLocked';
      else if (reason === 'daily_target') state = 'targetHit';
      else state = 'cooldown';
    }

    return { dp, ce, base, lossLimit, target, soft, softHrs, hard, hardHrs, streak, used, maxTrades, cooling, reason, state };
  }, [live, cfgBySlug, nowTick]);

  if (!bundle) return null;

  const fmt = (v) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Math.abs(v));
  const { dp, lossLimit, target, soft, softHrs, hard, hardHrs, streak, used, maxTrades, state } = model;
  const S = STATES[state];
  const pnl = dp ?? 0;
  const pnlColor = pnl > 0 ? GREEN : pnl < 0 ? RED : '#e6edf3';
  const stale = live.equityUpdatedAt && Date.now() - new Date(live.equityUpdatedAt).getTime() > 60000;

  // Live unlock countdown — cooldownUntil is set for every locked state
  // (cooldown, day-locked, target-hit). nowTick advances each second.
  const unlockMs = live.cooldownUntil ? new Date(live.cooldownUntil).getTime() - nowTick : 0;
  const locked = unlockMs > 0;

  // Headline + summary per state
  let headline, summary;
  if (state === 'dayLocked' && model.reason === 'max_trades_day') {
    headline = `Day locked · ${fmt(pnl)}`;
    summary = `Daily trade limit reached. Trading is locked until tomorrow — the account survives to trade again.`;
  } else if (state === 'dayLocked') {
    headline = `Day closed · −${fmt(pnl)}`;
    summary = `Daily loss limit reached. Positions were closed and trading is locked until tomorrow. This is the rule doing its job — the account survives to trade again.`;
  } else if (state === 'targetHit') {
    const pctGoal = target ? Math.round((pnl / target) * 100) : null;
    headline = `Day locked in · +${fmt(pnl)}`;
    summary = `You cleared the ${target ? fmt(target) : 'daily'} target${pctGoal ? ` — ${pctGoal}% of goal` : ''}. Trading is done for today so the win stays a win. See you tomorrow.`;
  } else if (state === 'cooldown') {
    const resume = fmtTime(live.cooldownUntil);
    headline = `Cooling down · ${pnl >= 0 ? '+' : '−'}${fmt(pnl)}`;
    summary = `${streak} losing trade${streak === 1 ? '' : 's'} in a row. Trading resumes at ${resume} — ${hard} in a row locks the day for ${hardHrs}h.`;
  } else {
    headline = `Clear to trade · ${pnl >= 0 ? '+' : '−'}${fmt(pnl)}`;
    // closest limit
    const bits = [];
    if (soft != null) bits.push({ kind: 'streak', dist: soft - streak, text: streak >= soft - 1 ? `one more losing trade starts a ${softHrs}-hour cooldown` : `${soft - streak} more losing trades in a row starts a ${softHrs}-hour cooldown` });
    if (lossLimit != null) bits.push({ kind: 'loss', dist: (lossLimit + pnl) / lossLimit, text: `${fmt(lossLimit + Math.min(pnl, 0))} of loss room before the day locks` });
    if (maxTrades != null) bits.push({ kind: 'trades', dist: (maxTrades - used) / maxTrades, text: `${maxTrades - used} of ${maxTrades} trades left today` });
    const closest = bits.sort((a, b) => a.dist - b.dist)[0];
    summary = `All guardrails armed.${closest ? ` Your closest limit is the ${closest.kind === 'streak' ? 'loss streak' : closest.kind === 'loss' ? 'daily loss' : 'trade count'} — ${closest.text}.` : ''}`;
  }

  // Key is day-scoped so the celebration returns tomorrow. Memoised because
  // reading the clock during render is impure.
  const winKey = useMemo(() => `tgx_win_celebrated_${new Date().toISOString().slice(0, 10)}`, []);

  // Slider marker (0..100, 50=start). Loss left, profit right.
  let markerLeft = 50;
  if (pnl < 0 && lossLimit) markerLeft = Math.max(50 - (Math.min(-pnl, lossLimit) / lossLimit) * 50, 0);
  else if (pnl > 0 && target) markerLeft = Math.min(50 + (Math.min(pnl, target) / target) * 50, 100);
  const fillFrom = Math.min(markerLeft, 50);
  const fillTo = Math.max(markerLeft, 50);

  // Metric cards
  const closed = state === 'dayLocked' || state === 'targetHit';
  const lossUsed = pnl < 0 ? -pnl : 0;
  const buffer = lossLimit != null ? Math.max(lossLimit + pnl, 0) : null;

  const label = (t) => <span className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>{t}</span>;

  return (
    <div className="mb-4">
      {/* HERO */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7"
        style={{
          background: S.bg,
          border: state === 'targetHit' ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: state === 'targetHit' ? '0 0 60px -20px rgba(52,211,153,0.45)' : undefined,
        }}
      >
        {state === 'targetHit' && <WinBurst storageKey={winKey} />}
        <div className="relative flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest" style={{ borderColor: 'rgba(255,255,255,0.14)', color: '#e6edf3' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: S.dot, boxShadow: `0 0 8px ${S.dot}` }} />
            {S.pill}
          </span>
          <span className="font-mono text-[11px]" style={{ color: MUTED }}>
            <span style={{ color: closed ? MUTED : stale ? AMBER : GREEN }}>●</span>{' '}
            {closed
              ? 'Session closed · final for today'
              : stale
                ? 'Feed delayed · showing last known equity'
                : `Live · ${exchange} linked`}
          </span>
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: '#e6edf3' }}>
          {headline.split('·')[0]}
          <span className="font-normal" style={{ color: MUTED }}> · </span>
          <span style={{ color: pnlColor }}>{headline.split('·')[1]?.trim()}</span>
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: '#aab6c0' }}>{summary}</p>

        {/* Live unlock countdown */}
        {locked && (
          <div className="mt-4 inline-flex items-center gap-3 rounded-xl border px-4 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>Unlocks in</span>
            <span className="font-mono text-lg font-bold tabular-nums" style={{ color: '#e6edf3' }}>{fmtCountdown(unlockMs)}</span>
            <span className="font-mono text-[11px]" style={{ color: MUTED }}>· at {fmtTime(live.cooldownUntil)}</span>
          </div>
        )}

        {/* Slider */}
        <div className="relative mt-6 h-1.5 w-full rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
          <div className="absolute inset-y-0 rounded-full" style={{ left: `${fillFrom}%`, width: `${fillTo - fillFrom}%`, backgroundColor: pnl < 0 ? RED : GREEN, opacity: 0.9 }} />
          <div className="absolute top-1/2 h-4 w-px -translate-y-1/2" style={{ left: '50%', backgroundColor: 'rgba(255,255,255,0.25)' }} />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500" style={{ left: `${markerLeft}%`, height: 12, width: 12, backgroundColor: pnl < 0 ? RED : GREEN, boxShadow: `0 0 0 4px ${(pnl < 0 ? RED : GREEN)}33, 0 0 10px ${pnl < 0 ? RED : GREEN}` }} />
        </div>
        <div className="mt-2.5 flex items-center justify-between font-mono text-[11px]">
          <span style={{ color: RED }}>{lossLimit != null ? `−${fmt(lossLimit)} · day locks` : 'no loss limit'}</span>
          <span style={{ color: MUTED }}>{fmt(0)} start</span>
          <span style={{ color: GREEN }}>{target != null ? `+${fmt(target)} · day locks in` : 'no target'}</span>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {maxTrades != null && (
          <MetricCard
            label={label('Trades left today')}
            big={closed ? '—' : Math.max(maxTrades - used, 0)}
            unit={`of ${maxTrades}`}
            pips={{ filled: Math.min(used, maxTrades), total: maxTrades, color: closed ? '#3a4550' : used >= maxTrades ? RED : '#0f172a' }}
            caption={closed ? 'Session closed' : `Max trades per day: ${maxTrades}`}
          />
        )}
        {soft != null && (
          <MetricCard
            label={label('Losses before cooldown')}
            big={closed ? '—' : Math.max(soft - streak, 0)}
            unit={`of ${soft}`}
            pips={{ filled: Math.min(streak, soft), total: soft, color: closed ? '#c0553f' : streak >= soft ? RED : '#0f172a' }}
            caption={closed ? 'Session closed' : `Then ${softHrs}h pause · ${hard} in a row locks ${hardHrs}h`}
          />
        )}
        {lossLimit != null && (
          <MetricCard
            label={label('Loss buffer left')}
            big={closed ? '—' : fmt(buffer ?? 0)}
            unit="until lock"
            pips={{ filled: Math.round(Math.min(lossUsed / lossLimit, 1) * 4), total: 4, color: closed ? '#c0553f' : RED }}
            caption={closed ? 'Session closed' : `Day closes & locks at −${fmt(lossLimit)}`}
          />
        )}
      </div>

      {(maxTrades == null && soft == null && lossLimit == null) && (
        <p className="mt-3 text-xs" style={{ color: 'var(--dash-text-faint)' }}>
          Set a daily loss, profit target, trade cap, or loss-streak rule to see your live session guardrails.{' '}
          <Link to="/dashboard/rules" className="text-accent hover:underline">Set rules</Link>
        </p>
      )}
    </div>
  );
}

function MetricCard({ label, big, unit, pips, caption }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
      {label}
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-bold tabular-nums" style={{ color: big === '—' ? 'var(--dash-text-muted)' : 'var(--dash-text-primary)' }}>{big}</span>
        <span className="font-mono text-xs" style={{ color: 'var(--dash-text-muted)' }}>{unit}</span>
      </div>
      {pips && (
        <div className="mt-2.5 flex items-center gap-1">
          {Array.from({ length: Math.min(pips.total, 8) }).map((_, i) => (
            <span key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i < pips.filled ? pips.color : 'var(--dash-bg-input)' }} />
          ))}
        </div>
      )}
      <p className="mt-2 font-mono text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{caption}</p>
    </div>
  );
}
