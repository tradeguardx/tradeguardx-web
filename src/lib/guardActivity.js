/**
 * Live guard → Activity: what happened today, trade by trade, and why.
 *
 * Overview's Activity card lists events side by side ("BTCUSD closed −0.77",
 * "1 losing trade in a row — locked"). Nothing there joins a trade to the rule
 * it broke or the lock it caused, which is exactly the question a trader asks
 * after a lock ("I took 3 trades, why does it say 1?"). This builds that join:
 * every trade with its status (lib/tradeStatus) and one sentence of why, and
 * every lock as its own row, in time order.
 *
 * ruleExplainers turns the account's own rule settings into plain-language
 * "how it works" text with a small worked example in the user's numbers. Every
 * sentence mirrors the engine (tradeguardx-risk-engine/src/rules) — if a rule's
 * behaviour changes there, change it here.
 */
import { fmtMoney } from './session';
import { tradeStatusOf } from './tradeStatus';

const LOCK_TYPES = new Set([
  'daily_loss_exceeded',
  'consecutive_losses_exceeded',
  'max_trades_day_lockout',
  'daily_target_reached',
  'manual_lock_started',
  'manual_lock_closing',
]);

const ms = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const pnlOf = (t) => num(t?.realizedPnl ?? t?.pnl ?? t?.netPnl);
const isClosed = (t) => String(t?.status || '').toUpperCase() === 'CLOSED' || !!t?.closedAt;
const pct = (v) => `${Number(v).toFixed(2).replace(/\.?0+$/, '')}%`;

/** One sentence: why this trade has the status it has. */
export function whyOf(status, trade, { currency = 'USD' } = {}) {
  const c = status?.breach?.context ?? {};
  const money = (v) => fmtMoney(v, currency);
  switch (status?.key) {
    case 'blocked':
      return 'You opened this while the account was locked, so it was closed straight away. It does not count as a trade.';
    case 'risk':
      return num(c.lossPct) != null && num(c.thresholdPct) != null
        ? `Its stop-loss would have lost ${pct(c.lossPct)} of your account, over your ${pct(c.thresholdPct)} risk-per-trade limit, so it was closed.`
        : status.hint;
    case 'triggered': {
      const n = num(c.consecutiveLosses);
      const limit = num(c.threshold);
      const hours = num(c.cooldownHours);
      if (n != null && limit != null) {
        return `This was losing trade ${n} in a row. Your limit is ${limit}, so the account locked${hours ? ` for ${hours}h` : ''}${c.tier === 'hard' ? ' (hard lock)' : ''}.`;
      }
      return status.hint;
    }
    case 'kill': {
      const b = status.breach;
      if (b?.breachType === 'daily_loss_exceeded' && num(c.drawdown) != null && num(c.threshold) != null) {
        return `Your day reached −${money(c.drawdown)} against your ${money(c.threshold)} daily loss limit while this was open, so the kill switch closed it.`;
      }
      return status.hint;
    }
    case 'target':
      return num(c.tradingPnl) != null ? `This took your day to +${money(c.tradingPnl)}, your profit target, and the day locked in.` : status.hint;
    case 'alert':
      return status.breach?.breachType === 'missing_stop_loss'
        ? 'It was open without a stop-loss past your alert window. You got an alert; nothing was closed.'
        : 'Its stop risked more than your limit. Your rule is set to alert only, so nothing was closed.';
    case 'notEnforced':
      return 'A rule was reached, but nothing could act on it.';
    default:
      return isClosed(trade) ? 'No rule fired on this trade.' : 'Open now. No rule has fired on it.';
  }
}

/** The lock row's headline and detail. */
export function lockLine(b) {
  const c = b?.context ?? {};
  const until = c.cooldownUntil ? new Date(c.cooldownUntil) : null;
  switch (b?.breachType) {
    case 'daily_loss_exceeded':
      return { title: 'Daily loss limit hit — account locked until your reset', detail: b.message };
    case 'consecutive_losses_exceeded':
      return {
        title: `${c.tier === 'hard' ? 'Hard lock' : 'Locked'}${num(c.cooldownHours) ? ` for ${num(c.cooldownHours)}h` : ''} — losing streak`,
        detail: b.message,
      };
    case 'max_trades_day_lockout':
      return { title: 'Trade limit reached — account locked until your reset', detail: b.message, until };
    case 'daily_target_reached':
      return { title: 'Profit target hit — the day is locked in', detail: b.message };
    case 'manual_lock_started':
    case 'manual_lock_closing':
      return { title: 'You locked the account', detail: b.message, until };
    default:
      return { title: 'Account locked', detail: b?.message ?? '' };
  }
}

/**
 * Trades and locks in the window, newest first.
 * Items: { kind: 'trade', t, trade, status, why } | { kind: 'lock', t, breach, title, detail }
 */
export function buildTimeline(trades = [], breaches = [], { now = Date.now(), windowMs = 24 * 3600_000, currency = 'USD' } = {}) {
  const since = now - windowMs;
  const items = [];
  for (const tr of trades) {
    const t = ms(tr?.closedAt) ?? ms(tr?.openedAt);
    if (t == null || t < since) continue;
    const status = tradeStatusOf(tr, breaches, { pnl: isClosed(tr) ? pnlOf(tr) : null });
    items.push({ kind: 'trade', t, trade: tr, status, why: whyOf(status, tr, { currency }) });
  }
  for (const b of breaches) {
    if (!LOCK_TYPES.has(b?.breachType)) continue;
    const t = ms(b?.createdAt);
    if (t == null || t < since) continue;
    items.push({ kind: 'lock', t, breach: b, ...lockLine(b) });
  }
  // Same instant: the trade first, then the lock it caused (newest-first order).
  items.sort((a, b) => b.t - a.t || (a.kind === 'lock' ? -1 : 1));
  return items;
}

/* ─────────────────────────── How your rules work ─────────────────────────── */

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * One entry per ENABLED rule: { slug, name, how, example }. `how` is the rule
 * in a sentence or two; `example` walks through it with the account's own
 * numbers. Mirrors the engine — see the file comment.
 */
export function ruleExplainers(bundle, { currency = 'USD', equity = null, resetLabel = 'your daily reset' } = {}) {
  const instances = (bundle?.instances ?? bundle?.rules ?? []).filter((r) => r?.enabled !== false);
  const nameOf = (slug) => (bundle?.templates ?? []).find((t) => t.slug === slug)?.name ?? slug;
  const m = (v) => fmtMoney(v, currency);
  const base = equity && equity > 0 ? equity : 1000;
  const baseNote = equity && equity > 0 ? 'your current balance' : `a ${m(1000)} account`;
  const out = [];

  for (const r of instances) {
    const slug = r.templateSlug ?? r.slug;
    const c = r.config ?? {};
    let how = '';
    let example = '';

    if (slug === 'daily-loss') {
      const limit = c.mode === 'percent' || (c.dailyLossAmount == null && c.dailyLossPct != null) ? r2((base * Number(c.dailyLossPct)) / 100) : Number(c.dailyLossAmount);
      if (!(limit > 0)) continue;
      const warn = c.mode === 'percent' ? (c.warningPct ? r2((base * Number(c.warningPct)) / 100) : null) : num(c.warningAmount);
      const a = r2(limit * 0.55);
      const bLoss = r2(limit * 0.5);
      how = `Adds up your trading result since ${resetLabel}: closed trades plus what open trades are showing right now. Deposits and withdrawals do not count. When the day's loss reaches ${m(limit)}, the kill switch cancels your orders, closes every position and locks the account until ${resetLabel}.${warn ? ` You get a warning first at ${m(warn)}.` : ''}`;
      example = `Trade 1 closes at −${m(a)}. Trade 2 is still open and showing −${m(bLoss)}. Your day is now −${m(r2(a + bLoss))}, past ${m(limit)} → orders cancelled, trade 2 closed, account locked until ${resetLabel}.`;
    } else if (slug === 'max-trades-day') {
      const n = Number(c.maxTrades);
      if (!(n > 0)) continue;
      how = `Counts each new position you open from flat. A position opened while locked does not count, and a flip (long straight to short) counts as a new trade. Once you have taken ${n} and are flat again, the account locks until ${resetLabel}. It never closes an open trade just because of the count.`;
      example =
        n === 1
          ? 'You take one trade and close it. You are at 1 of 1 and flat, so the account locks. Anything you open after that is closed straight away and does not count.'
          : `You take trades 1 to ${n}, closing each one. When trade ${n} closes and you are flat, the account locks. Anything you open after that is closed straight away and does not count.`;
    } else if (slug === 'daily-profit-target') {
      const target = c.mode === 'percent' || (c.dailyTargetAmount == null && c.dailyTargetPct != null) ? r2((base * Number(c.dailyTargetPct)) / 100) : Number(c.dailyTargetAmount);
      if (!(target > 0)) continue;
      how = `Protects a good day. When you have booked ${m(target)} of profit and are flat, the account locks for the rest of the day so the win cannot be given back. It never closes an open winning trade.`;
      example = `Trade 1 closes at +${m(r2(target * 0.6))}, trade 2 at +${m(r2(target * 0.45))}. You are up +${m(r2(target * 1.05))} and flat → the day is locked in until ${resetLabel}.`;
    } else if (slug === 'close-after-losses') {
      const soft = Number(c.consecutiveLosses ?? c.maxConsecutiveLosses);
      if (!(soft > 0)) continue;
      const softH = num(c.cooldownHours) ?? 3;
      const hard = num(c.hardLossCount) ?? 5;
      const hardH = num(c.hardCooldownHours) ?? 12;
      how = `Counts losing trades in a row. Any loss counts, even a few cents. A win resets the count; a breakeven trade is skipped; trades closed by a lock do not count. ${soft} in a row locks the account for ${softH}h${hard > soft ? `; ${hard} in a row is a hard lock for ${hardH}h, and when that lifts your day starts fresh` : ''}.`;
      example =
        soft === 1
          ? `Trade 1 closes at −${m(0.5)} → 1 loss in a row → locked for ${softH}h. Even a −${m(0.01)} close would do it, so a limit of 1 locks you after any losing trade.`
          : `Trade 1 −${m(1.2)}, trade 2 −${m(0.8)}${soft > 2 ? `, … trade ${soft} −${m(0.3)}` : ''} → ${soft} losses in a row → locked for ${softH}h. Had trade 2 been a win, the count would have gone back to 0.`;
    } else if (slug === 'risk-per-trade') {
      const p = Number(c.maxRiskPct);
      if (!(p > 0)) continue;
      const alert = String(c.onBreach ?? 'close') === 'alert';
      const allowed = r2((base * p) / 100);
      how = `Checks any position that has a stop-loss: loss if the stop is hit = (entry − stop) × size. If that is more than ${pct(p)} of your account, ${alert ? 'you get an alert and nothing is closed' : 'the position is closed straight away, so you lose a little now instead of the full amount at the stop'}. Trades with no stop are left to the stop-loss alert.`;
      example = `With ${baseNote} of ${m(base)}, ${pct(p)} is ${m(allowed)}. A trade whose stop would lose ${m(r2(allowed * 1.5))} is ${alert ? 'flagged with an alert' : 'closed'}; one whose stop would lose ${m(r2(allowed * 0.6))} is left alone.`;
    } else if (slug === 'stop-loss-alert') {
      const secs = num(c.alertDelaySeconds) ?? 30;
      how = `If a position has no stop-loss ${secs} seconds after it opens, you get an alert. Nothing is closed.`;
      example = `You open BTC at 10:00:00 and add no stop → at 10:00:${String(Math.min(secs, 59)).padStart(2, '0')} you get "open ${secs}s without a stop-loss".`;
    } else if (slug === 'max-total-loss') {
      const d = Number(c.maxDrawdownPct);
      if (!(d > 0)) continue;
      how = `Watches your whole account against its starting balance. When it is down ${pct(d)}, you get an alert. It is alert only: it does not close anything or lock the account.`;
      example = `Starting balance ${m(base)}: at ${m(r2(base * (1 - d / 100)))} or below you are alerted.`;
    } else {
      continue;
    }
    out.push({ slug, name: nameOf(slug), how, example });
  }
  return out;
}
