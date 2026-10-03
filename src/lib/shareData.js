import { currencySymbol, fmtMoney } from './session';

/**
 * Real trades → the four share cards and the four reel stories.
 *
 * Pure. Everything here is a function of data the dashboard already has: the
 * journal trades, the breach log, the rules bundle and the account. No new
 * endpoints, per the handoff.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THE COUNTERFACTUAL, AND WHAT WE REFUSE TO CLAIM
 *
 * Every card in this system makes one claim: your rule was worth THIS MUCH.
 * That is a counterfactual — what would have happened had the guard not
 * acted — and the ledger cannot answer it. Nothing happened in the account
 * after the close; there is no row to read.
 *
 * It is answerable in exactly one case: a position the guard CLOSED. We know
 * the size, the side and the exit, so the price history after that instant
 * prices the loss that was avoided. That is `savedFor()` in counterfactual.js,
 * and it needs candles, so it is async and lives outside this file.
 *
 * It is NOT answerable for a day, week or month in general, because that
 * would require knowing which trades the user WOULD have taken. Where a day
 * was ended by the guard we can price the positions it closed; where the user
 * simply stopped, we cannot, and these builders leave `saved: null` rather
 * than producing a number. A card with `saved: null` states the real outcome
 * and drops the comparison. An invented comparison on a card people post
 * publicly is the worst thing this product could ship.
 * ──────────────────────────────────────────────────────────────────────────
 */

/** Trades and breaches are matched by time; the guard closes within seconds. */
export const GUARD_WINDOW_MS = 120_000;

/**
 * The breach types that mean the guard CLOSED a position.
 *
 * The breach log is not a log of rules firing. It also carries notifications
 * (`trade_opened`, `trade_closed`), warnings that preceded no action
 * (`daily_loss_warning`), and system events (`protection_disconnected`). Every
 * closed trade emits a `trade_closed` row at the instant it closes, so
 * matching on time alone credited EVERY close to a rule — and then named that
 * rule after the event, which is where "My trade closed closed SOLUSDT at
 * +₹61,496.54" came from.
 *
 * Only these four flatten an open position. The order-blocking rules
 * (`max_trades_day_exceeded`, `risk_per_trade_exceeded`,
 * `trade_blocked_cooldown`) stop a new order being placed; they never close
 * one that is already running, so a close is not theirs to claim either.
 */
export const GUARD_CLOSE_TYPES = new Set([
  'daily_loss_exceeded',
  'daily_target_reached',
  'max_total_loss_exceeded',
  'consecutive_losses_exceeded',
]);

export function isGuardClose(breach) {
  const t = breach?.breachType || breach?.ruleSlug || '';
  return GUARD_CLOSE_TYPES.has(String(t));
}

const IST = 'Asia/Kolkata';

/** 'YYYY-MM-DD' in IST — the day boundary every other screen uses. */
export function istDayKey(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // en-CA gives ISO ordering, which is what makes these sortable as strings.
  return d.toLocaleDateString('en-CA', { timeZone: IST });
}

export function istMonthKey(iso) {
  return istDayKey(iso).slice(0, 7);
}

/** The realised P&L of a closed trade, whichever field the venue filled in. */
export function pnlOf(t) {
  const v = Number(t?.realizedPnl ?? t?.pnl ?? t?.netPnl);
  return Number.isFinite(v) ? v : null;
}

export function isClosed(t) {
  return Boolean(t?.closedAt) && String(t?.status ?? 'CLOSED').toUpperCase() === 'CLOSED';
}

/** Closed trades, newest close first. */
export function closedTrades(trades) {
  return (trades ?? [])
    .filter((t) => isClosed(t) && pnlOf(t) != null)
    .sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt));
}

/**
 * Which closed trades the guard closed, by tradeUid.
 *
 * Matched on time rather than on a foreign key because breaches do not carry
 * one for every venue. A breach says "the guard flattened you at 14:32"; the
 * trades that closed within the window are the ones it flattened. The window
 * is generous (2 min) because a flatten of four positions is four exchange
 * round-trips, and tight because two unrelated manual closes two minutes
 * apart would otherwise both be credited to the rule.
 */
export function guardClosures(trades, breaches, windowMs = GUARD_WINDOW_MS) {
  const out = new Map();
  const bs = (breaches ?? [])
    .filter(isGuardClose)
    .map((b) => ({ ...b, at: Date.parse(b.createdAt) }))
    .filter((b) => Number.isFinite(b.at));
  if (!bs.length) return out;

  for (const t of closedTrades(trades)) {
    const at = Date.parse(t.closedAt);
    if (!Number.isFinite(at)) continue;
    let best = null;
    for (const b of bs) {
      const gap = Math.abs(at - b.at);
      if (gap > windowMs) continue;
      if (!best || gap < best.gap) best = { breach: b, gap };
    }
    if (best) out.set(t.tradeUid ?? t.id, best.breach);
  }
  return out;
}

/** Per-IST-day realised P&L, oldest first. */
export function dayBuckets(trades) {
  const m = new Map();
  for (const t of closedTrades(trades)) {
    const k = istDayKey(t.closedAt);
    if (!k) continue;
    const cur = m.get(k) ?? { day: k, pnl: 0, count: 0, trades: [] };
    cur.pnl += pnlOf(t);
    cur.count += 1;
    cur.trades.push(t);
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** The last N trading days that actually had closed trades. */
export function lastTradingDays(trades, n) {
  const all = dayBuckets(trades);
  return all.slice(Math.max(0, all.length - n));
}

/** 35000 -> "35,000". A limit without separators is not a figure anyone reads. */
const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v;
};

/** Above this, a "risk per trade" value is an unconfigured field, not a rule. */
const MAX_SANE_RISK_PCT = 50;

const RULE_CHIP = {
  'daily-loss': (v, sym) => ({
    k: 'Max loss / day',
    v: v.mode === 'amount' ? `−${sym}${n(v.dailyLossAmount)}` : `−${v.dailyLossPct}%`,
    c: '#ff7a70',
  }),
  'daily-profit-target': (v, sym) => ({
    k: 'Daily target',
    v: v.mode === 'amount' ? `+${sym}${n(v.dailyTargetAmount)}` : `+${v.dailyTargetPct}%`,
    c: '#2fe3bd',
  }),
  'max-trades-day': (v) => {
    const t = Number(v.maxTrades);
    return { k: 'Trades / day', v: t > 0 ? String(t) : null, c: '#f0b429', one: 'trade/day' };
  },
  /*
   * A per-trade risk cap is a SMALL number: 0.5%, 1%, 2%.
   *
   * The rule form carries accountSize in the same config object, and an
   * instance saved before the percentage field was filled can arrive with it
   * sitting at 100. "100% risk" on a card someone posts under their own name
   * reads as "I bet the account on every trade" — the opposite of the claim
   * the card is making. Anything that big is not a risk-per-trade setting, so
   * the chip comes off rather than going out wrong.
   */
  'risk-per-trade': (v) => {
    const p = Number(v.maxRiskPct);
    return { k: 'Risk / trade', v: p > 0 && p < MAX_SANE_RISK_PCT ? `${p}%` : null, c: '#b191fb' };
  },
  'max-total-loss': (v) => ({ k: 'Max drawdown', v: `${v.maxDrawdownPct}%`, c: '#ff7a70' }),
  stacking: (v) => ({ k: 'Open positions', v: String(v.maxPositions), c: '#b191fb' }),
  'minimum-hold': (v) => ({ k: 'Min hold', v: `${v.minHoldMinutes}m`, c: '#f0b429' }),
};

// The order the card shows them in when the user has more than four on. The
// two that carry a number people recognise come first.
const CHIP_ORDER = ['daily-loss', 'daily-profit-target', 'max-trades-day', 'risk-per-trade', 'max-total-loss', 'stacking', 'minimum-hold'];

/**
 * The daily loss limit as a positive number, or null.
 *
 * This is the reel's limit line — the dashed gold rule the bars stop at and
 * the shield coins land on. An account with no daily-loss rule has no line to
 * draw, and the reference's hard-coded −$220 would be a limit the user never
 * set, on a chart of their own trading.
 */
export function dailyLossLimit(bundle) {
  const on = (bundle?.instances ?? bundle?.rules ?? []).filter((r) => r?.enabled !== false);
  const inst = on.find((r) => (r.templateSlug ?? r.id) === 'daily-loss');
  const cfg = inst?.config;
  if (!cfg || cfg.mode !== 'amount') return null;
  const v = Math.abs(Number(cfg.dailyLossAmount));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** The daily profit target as a positive number, or null. The other yardstick
    a figure can be judged material against when there is no loss limit. */
export function dailyTargetAmount(bundle) {
  const on = (bundle?.instances ?? bundle?.rules ?? []).filter((r) => r?.enabled !== false);
  const inst = on.find((r) => (r.templateSlug ?? r.id) === 'daily-profit-target');
  const cfg = inst?.config;
  if (!cfg || cfg.mode !== 'amount') return null;
  const v = Math.abs(Number(cfg.dailyTargetAmount));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * How many rules were actually on.
 *
 * The card's third tile says "Rules kept", and that figure has to be every
 * enabled rule — not the four the chip row has space for.
 */
export function rulesOnCount(bundle) {
  return (bundle?.instances ?? bundle?.rules ?? []).filter((r) => r?.enabled !== false).length;
}

/**
 * The user's own rules, as chips, capped at four.
 *
 * This is the part of the card the handoff calls "what makes the number
 * believable", so it has to be the rules that were actually on — not a
 * flattering selection, and never the demo set.
 */
export function ruleChips(bundle, currency = 'USD') {
  const sym = currencySymbol(currency);
  const on = (bundle?.instances ?? bundle?.rules ?? []).filter((r) => r?.enabled !== false);
  const bySlug = new Map(on.map((r) => [r.templateSlug ?? r.id, r]));

  const chips = [];
  for (const slug of CHIP_ORDER) {
    const inst = bySlug.get(slug);
    const make = RULE_CHIP[slug];
    if (!inst || !make) continue;
    const cfg = inst.config && typeof inst.config === 'object' && !Array.isArray(inst.config) ? inst.config : {};
    try {
      const chip = make(cfg, sym);
      if (chip.v && !/undefined|NaN|null/.test(chip.v)) chips.push(chip);
    } catch { /* a rule we cannot render is a rule we leave off */ }
    if (chips.length === 4) break;
  }
  return chips;
}

/**
 * The same rules as one-line strings, for the card's chip row.
 *
 * Two shapes exist for one thing and they are NOT interchangeable: the reel's
 * rail draws a block per rule and needs {k, v, c}, while the card and the
 * reel's end card render a plain chip and need a string. Feeding the objects
 * to the string consumer renders nothing and throws "Objects are not valid as
 * a React child" from inside a <span>, taking the whole dashboard to the error
 * boundary — which is exactly what it did.
 */
const CHIP_SUFFIX = {
  'Max loss / day': 'max loss',
  'Daily target': 'target',
  // "1 trades/day" is the sort of thing a reader trusts a product less for.
  'Trades / day': 'trades/day',
  'Risk / trade': 'risk',
  'Max drawdown': 'max drawdown',
  'Open positions': 'open max',
  'Min hold': 'min hold',
};

export function ruleLabels(bundle, currency = 'USD') {
  return ruleChips(bundle, currency).map((c) => {
    const suffix = c.one && c.v === '1' ? c.one : CHIP_SUFFIX[c.k];
    return suffix ? `${c.v} ${suffix}` : `${c.v} ${c.k.toLowerCase()}`;
  });
}

/** The rule that fired, in words, from a breach row. */
export function ruleName(breach) {
  const raw = breach?.ruleSlug || breach?.breachType || '';
  if (!raw) return 'Your rule';
  return String(raw).replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

const RULE_LABEL = {
  'daily-loss': 'Loss limit',
  'daily-profit-target': 'Daily target',
  'max-total-loss': 'Max drawdown',
  'max-trades-day': 'Trade cap',
  'close-after-losses': 'Loss streak',
  // The engine writes the breach type, not the rule slug, on some venues.
  daily_loss_exceeded: 'Loss limit',
  daily_target_reached: 'Daily target',
  max_total_loss_exceeded: 'Max drawdown',
  consecutive_losses_exceeded: 'Loss streak',
};

export function ruleShort(breach) {
  // breachType first: it is always set, where ruleSlug is nullable.
  return RULE_LABEL[breach?.breachType] ?? RULE_LABEL[breach?.ruleSlug] ?? ruleName(breach);
}

/**
 * Format helpers bound to one account's currency, so nothing downstream has
 * to remember that Shark settles in rupees.
 */
export function moneyFns(currency = 'USD') {
  const sym = currencySymbol(currency);
  return {
    sym,
    money: (v, { sign = true } = {}) => fmtMoney(v, currency, { sign }),
    plain: (v) => fmtMoney(v, currency, { sign: false }),
    // The masking regex in shareCards.js is written for '$'. Rupee amounts
    // need their own, and a shared escape keeps the two from drifting.
    mask: new RegExp(`[−+]?${sym === '₹' ? '₹' : '\\$'}[\\d,]+(\\.\\d+)?`, 'g'),
    /**
     * A figure short enough for a calendar cell.
     *
     * ₹61,496.54 does not fit in a day tile and does not need to — at a
     * glance the magnitude is the point, and the exact figure is on the row
     * below. Rounds to the nearest readable unit rather than truncating, so
     * ₹99,900 reads as ₹100k and not ₹99k.
     */
    compact: (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return '—';
      const a = Math.abs(n);
      const s2 = n < 0 ? '−' : '+';
      if (a < 1000) return `${s2}${sym}${Math.round(a)}`;
      if (a < 100_000) {
        const k = a / 1000;
        return `${s2}${sym}${k < 10 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)}k`;
      }
      const l = a / 100_000;
      return `${s2}${sym}${l < 10 ? l.toFixed(1).replace(/\.0$/, '') : Math.round(l)}L`;
    },
  };
}

export function fmtDay(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });
  } catch { return ''; }
}

export function fmtDayShort(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST });
  } catch { return ''; }
}

export function weekdayShort(dayKey) {
  // dayKey is 'YYYY-MM-DD' in IST; parse as UTC noon so the label cannot slip
  // a day either way on the local clock.
  const d = new Date(`${dayKey}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}
