import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber';
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
  clear: {
    pill: 'Session live',
    dot: GREEN,
    accent: GREEN,
    bg: 'radial-gradient(90% 120% at 12% -10%, rgba(52,211,153,0.16) 0%, transparent 55%), radial-gradient(80% 100% at 100% 110%, rgba(56,189,248,0.10) 0%, transparent 60%), linear-gradient(160deg, #0b1512 0%, #070b0a 100%)',
  },
  cooldown: {
    pill: 'Cooldown',
    dot: AMBER,
    accent: AMBER,
    bg: 'radial-gradient(90% 120% at 12% -10%, rgba(251,191,36,0.16) 0%, transparent 55%), radial-gradient(80% 100% at 100% 110%, rgba(244,114,64,0.08) 0%, transparent 60%), linear-gradient(160deg, #15100a 0%, #0a0705 100%)',
  },
  dayLocked: {
    pill: 'Day locked',
    dot: RED,
    accent: RED,
    bg: 'radial-gradient(90% 120% at 12% -10%, rgba(248,113,113,0.16) 0%, transparent 55%), radial-gradient(80% 100% at 100% 110%, rgba(190,60,60,0.10) 0%, transparent 60%), linear-gradient(160deg, #150c0c 0%, #090505 100%)',
  },
  targetHit: {
    pill: 'Target hit · locked in',
    dot: GREEN,
    accent: GREEN,
    bg: 'radial-gradient(90% 120% at 12% -10%, rgba(52,211,153,0.22) 0%, transparent 55%), radial-gradient(85% 110% at 100% 110%, rgba(16,185,129,0.14) 0%, transparent 60%), linear-gradient(160deg, #08170f 0%, #050b08 100%)',
  },
};

export default function SessionHero({ accessToken, tradingAccountId, account, children }) {
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

  // Day-scoped key for the win celebration. Declared BEFORE the early return
  // below — a hook after a conditional return changes the hook count between
  // renders, which is React error #310.
  const winKey = useMemo(() => `tgx_win_celebrated_${new Date().toISOString().slice(0, 10)}`, []);
  const reduce = useReducedMotion();

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

  const label = (t) => (
    <span className="block font-mono text-[9px] uppercase leading-tight tracking-[0.12em] sm:text-[10px] sm:tracking-[0.15em]" style={{ color: MUTED }}>
      {t}
    </span>
  );

  return (
    <div className="mb-4">
      {/* HERO */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-7"
        style={{
          background: S.bg,
          border: `1px solid ${state === 'targetHit' ? 'rgba(52,211,153,0.30)' : 'rgba(255,255,255,0.07)'}`,
          boxShadow:
            state === 'targetHit'
              ? '0 0 70px -24px rgba(52,211,153,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
              : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Top hairline in the state colour, fading out to both edges. */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${S.accent}88 25%, ${S.accent}88 75%, transparent)` }}
          aria-hidden
        />
        {state === 'targetHit' && <WinBurst storageKey={winKey} />}
        <div className="relative flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest sm:text-[11px]" style={{ borderColor: 'rgba(255,255,255,0.14)', color: '#e6edf3' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: S.dot, boxShadow: `0 0 8px ${S.dot}` }} />
            {S.pill}
          </span>
          <span className="font-mono text-[10px] leading-none sm:text-[11px]" style={{ color: MUTED }}>
            <span style={{ color: closed ? MUTED : stale ? AMBER : GREEN }}>●</span>{' '}
            {/* Short form on phones — the full sentence wrapped to two lines at 390px. */}
            <span className="sm:hidden">
              {closed ? 'Session closed' : stale ? 'Feed delayed' : `Live · ${exchange}`}
            </span>
            <span className="hidden sm:inline">
              {closed
                ? 'Session closed · final for today'
                : stale
                  ? 'Feed delayed · showing last known equity'
                  : `Live · ${exchange} linked`}
            </span>
          </span>
        </div>

        {/* clamp() rather than breakpoints: the headline scales smoothly across
            every width instead of jumping at 640px, which is what left it looking
            cramped on tablets sitting between the two sizes. */}
        <h2
          className="mt-5 font-display font-bold tracking-tight"
          style={{ color: '#e6edf3', fontSize: 'clamp(1.45rem, 1.1rem + 1.7vw, 1.95rem)', lineHeight: 1.15 }}
        >
          {headline.split('·')[0]}
          <span className="font-normal" style={{ color: MUTED }}> · </span>
          <span style={{ color: pnlColor }}>
            {pnl >= 0 ? '+' : '−'}
            <AnimatedNumber value={Math.abs(pnl)} format={(v) => fmt(v)} />
          </span>
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: '#aab6c0' }}>{summary}</p>

        {/* Live unlock countdown */}
        {locked && (
          <div
            className="mt-5 inline-flex items-center gap-3.5 rounded-xl border px-4 py-2.5 backdrop-blur-sm"
            style={{ borderColor: `${S.accent}33`, background: `linear-gradient(180deg, ${S.accent}14, transparent)` }}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {!reduce && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                  style={{ backgroundColor: S.accent }}
                />
              )}
              <span className="relative h-2 w-2 rounded-full" style={{ backgroundColor: S.accent }} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>Unlocks in</span>
              <span className="mt-1.5 font-mono text-xl font-bold tabular-nums tracking-tight whitespace-nowrap sm:text-2xl" style={{ color: '#e6edf3' }}>
                {fmtCountdown(unlockMs)}
              </span>
            </span>
            <span className="ml-1 self-end font-mono text-[11px] whitespace-nowrap" style={{ color: MUTED }}>
              at {fmtTime(live.cooldownUntil)}
            </span>
          </div>
        )}

        {/* Slider */}
        <div className="relative mt-6 h-1.5 w-full rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            className="absolute inset-y-0 rounded-full"
            initial={false}
            animate={{ left: `${fillFrom}%`, width: `${fillTo - fillFrom}%` }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 22 }}
            style={{ backgroundColor: pnl < 0 ? RED : GREEN, opacity: 0.9 }}
          />
          <div className="absolute top-1/2 h-4 w-px -translate-y-1/2" style={{ left: '50%', backgroundColor: 'rgba(255,255,255,0.25)' }} />
          <motion.div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            initial={false}
            animate={{ left: `${markerLeft}%` }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
            style={{ height: 12, width: 12, backgroundColor: pnl < 0 ? RED : GREEN, boxShadow: `0 0 0 4px ${(pnl < 0 ? RED : GREEN)}33, 0 0 10px ${pnl < 0 ? RED : GREEN}` }}
          >
            {/* Breathing halo — only while the session is actually live, so the
                motion means "we're watching" rather than being decoration. */}
            {!closed && !reduce && (
              <motion.span
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 2.1], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                style={{ backgroundColor: pnl < 0 ? RED : GREEN }}
              />
            )}
          </motion.div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2 font-mono text-[10px] sm:text-[11px]">
          <span className="whitespace-nowrap" style={{ color: RED }}>
            {lossLimit != null ? (
              <>
                −{fmt(lossLimit)}<span className="hidden sm:inline"> · day locks</span>
              </>
            ) : 'no loss limit'}
          </span>
          <span className="whitespace-nowrap" style={{ color: MUTED }}>{fmt(0)}<span className="hidden sm:inline"> start</span></span>
          <span className="whitespace-nowrap" style={{ color: GREEN }}>
            {target != null ? (
              <>
                +{fmt(target)}<span className="hidden sm:inline"> · day locks in</span>
              </>
            ) : 'no target'}
          </span>
        </div>
      </div>

      {/* Slot: what you're holding right now outranks the counters below. */}
      {children}

      {/* METRIC CARDS — 3-up at every width. On phones they're a compact
          scoreboard: the label and figure carry it, the caption would just
          repeat "Session closed" three times. */}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {maxTrades != null && (
          <MetricCard
            index={0}
            accent={closed ? undefined : GREEN}
            label={label('Trades left today')}
            big={closed ? '—' : Math.max(maxTrades - used, 0)}
            unit={`of ${maxTrades}`}
            pips={{ filled: Math.min(used, maxTrades), total: maxTrades, color: closed ? '#3a4550' : used >= maxTrades ? RED : '#0f172a' }}
            caption={closed ? 'Session closed' : `Max trades per day: ${maxTrades}`}
          />
        )}
        {soft != null && (
          <MetricCard
            index={1}
            accent={closed ? undefined : AMBER}
            label={label('Losses before cooldown')}
            big={closed ? '—' : Math.max(soft - streak, 0)}
            unit={`of ${soft}`}
            pips={{ filled: Math.min(streak, soft), total: soft, color: closed ? '#c0553f' : streak >= soft ? RED : '#0f172a' }}
            caption={closed ? 'Session closed' : `Then ${softHrs}h pause · ${hard} in a row locks ${hardHrs}h`}
          />
        )}
        {lossLimit != null && (
          <MetricCard
            index={2}
            accent={closed ? undefined : RED}
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

function MetricCard({ label, big, unit, pips, caption, index = 0, accent }) {
  const reduce = useReducedMotion();
  // Only roll digits — an em-dash for a closed session must render as-is.
  const numeric = typeof big === 'number' || (typeof big === 'string' && /^[\d.]+$/.test(big));

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 0.06 * index, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="group relative overflow-hidden rounded-2xl border p-3 transition-colors sm:p-4"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', boxShadow: 'var(--dash-shadow-card)' }}
    >
      {accent && (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          aria-hidden
        />
      )}
      {label}
      <div className="mt-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
        <span className="font-display text-[22px] font-bold leading-none tracking-tight tabular-nums sm:text-[28px]" style={{ color: big === '—' ? 'var(--dash-text-muted)' : 'var(--dash-text-primary)' }}>
          {numeric ? <AnimatedNumber value={Number(big)} format={(v) => (Number.isInteger(Number(big)) ? String(Math.round(v)) : v.toFixed(2))} /> : big}
        </span>
        <span className="font-mono text-[10px] sm:text-xs" style={{ color: 'var(--dash-text-muted)' }}>{unit}</span>
      </div>
      {pips && (
        <div className="mt-2.5 flex items-center gap-1">
          {Array.from({ length: Math.min(pips.total, 8) }).map((_, i) => (
            <motion.span
              key={i}
              className="h-1.5 flex-1 origin-left rounded-full"
              initial={reduce ? false : { scaleX: 0.15, opacity: 0.4 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.06 * index + 0.05 * i, duration: 0.3, ease: 'easeOut' }}
              style={{ backgroundColor: i < pips.filled ? pips.color : 'var(--dash-bg-input)' }}
            />
          ))}
        </div>
      )}
      <p className="mt-2 hidden font-mono text-[10px] sm:block" style={{ color: 'var(--dash-text-faint)' }}>{caption}</p>
    </motion.div>
  );
}
