/**
 * The worst day in a set of closed trades, and what a daily loss limit would
 * have done to it.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY THIS IS THE ARGUMENT, AND NOT A FEATURE LIST.
 *
 * The value of a risk guard is an absence — the losses that did not happen —
 * and absence cannot be shown. Their own worst day can. "On 14 September you
 * lost ₹18,400 across four trades; a ₹5,000 daily cap stops the last two"
 * does the work that no amount of describing the product does, because it is
 * about them and it already happened.
 *
 * It is computed from trades we hold, so it is only ever as good as the
 * history that has been imported. When there is nothing, callers must say
 * nothing — a counterfactual built on two trades is not evidence, and quoting
 * one would teach people not to trust the number.
 * ──────────────────────────────────────────────────────────────────────────
 */

/** Trades grouped by the calendar day they closed, in the account's own time. */
function byDay(trades, timeZone) {
  const days = new Map();
  for (const t of trades) {
    const closed = t?.closedAt ?? t?.closed_at ?? t?.exitAt;
    const pnl = Number(t?.pnl ?? t?.realizedPnl ?? t?.netPnl);
    if (!closed || !Number.isFinite(pnl)) continue;
    const d = new Date(closed);
    if (Number.isNaN(d.getTime())) continue;
    let key;
    try {
      key = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC' }).format(d);
    } catch {
      key = d.toISOString().slice(0, 10);
    }
    const row = days.get(key) ?? { day: key, pnl: 0, trades: [] };
    row.pnl += pnl;
    row.trades.push({ at: d.getTime(), pnl });
    days.set(key, row);
  }
  return [...days.values()];
}

/**
 * @returns {{ day: string, loss: number, tradeCount: number, stoppedAfter: number, saved: number }|null}
 *   `stoppedAfter` is how many trades in before the cap would have hit;
 *   `saved` is what the rest of that day cost.
 */
export function worstDayOf(trades, { limit, timeZone, minTrades = 5 } = {}) {
  if (!Array.isArray(trades) || trades.length < minTrades) return null;
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const days = byDay(trades, timeZone);
  if (!days.length) return null;

  const worst = days.reduce((a, b) => (b.pnl < a.pnl ? b : a));
  // A day that did not lose money is not an argument for a loss limit.
  if (!(worst.pnl < 0)) return null;

  /* Walk the day in order and find where the limit would have bitten. The
     guard acts on the trade that crosses it, so the count includes that one
     and everything after it is what the cap would have prevented. */
  const ordered = [...worst.trades].sort((a, b) => a.at - b.at);
  let running = 0;
  let stoppedAfter = null;
  for (let i = 0; i < ordered.length; i += 1) {
    running += ordered[i].pnl;
    if (running <= -limit) {
      stoppedAfter = i + 1;
      break;
    }
  }
  // The cap was never reached, so it would have changed nothing that day.
  if (stoppedAfter == null) return null;

  const saved = ordered.slice(stoppedAfter).reduce((sum, t) => sum + t.pnl, 0);
  return {
    day: worst.day,
    loss: Math.abs(worst.pnl),
    tradeCount: ordered.length,
    stoppedAfter,
    saved: Math.abs(Math.min(0, saved)),
  };
}
