/**
 * What we can honestly say about a position's stop loss.
 *
 * GET /journal/trades carries `stopLoss` (latest stop price, null when none or
 * cancelled) and a three-state `hasStopLoss`: true = a stop exists (Shark
 * reports that without a price), false = we know there is no stop, null = no
 * stop data for this trade at all. Only `false` may read as "none set" — an
 * unknown is never shown as a verdict.
 */

function pick(o, ...keys) { for (const k of keys) if (o && o[k] != null && o[k] !== '') return o[k]; return null; }

export function stopPriceOf(t) {
  return pick(t, 'stopLoss', 'stop_loss', 'stopPrice', 'sl');
}

/** Stop cell on the open-positions table: { text, tone }. tone ∈ price | set | none | unknown. */
export function stopCellFor(p) {
  const price = stopPriceOf(p);
  if (price != null) return { text: String(price), tone: 'price' };
  const has = p?.hasStopLoss;
  if (has === true) return { text: 'set', tone: 'set' };
  if (has === false) return { text: 'none set', tone: 'none' };
  return { text: '—', tone: 'unknown' };
}

/**
 * Why the trade page cannot show an R-multiple. Only called when it can't —
 * so with a price in hand the reason is the trade, not the stop.
 */
export function rMultipleGap(t) {
  const price = stopPriceOf(t);
  if (price != null) {
    if (Number(price) === Number(t?.entryPrice)) return 'Stop at entry — no risk to measure R against';
    if (t?.exitPrice == null || t?.exitPrice === '') return 'Stop set — R shows once the trade closes';
    return 'Not enough price data to calculate R';
  }
  if (t?.hasStopLoss === true) return 'Stop set — the exchange doesn’t report its price, so R can’t be calculated';
  if (t?.hasStopLoss === false) return 'No stop loss on this trade — R needs one';
  return 'No stop data for this trade';
}
