import { fetchKlines, intervalFor, resolveBinancePair } from './binanceKlines';
import { istDayKey, pnlOf } from './shareData';

/**
 * What the trade would have done if it had been left open.
 *
 * This is the single number the whole share system is built on, and it is the
 * only one the ledger cannot supply: after the guard closed the position,
 * nothing else happened in the account. The answer lives in the price history.
 *
 * The rule: price the CLOSED SIZE forward from the exit, to the end of that
 * trading day in IST. Not forward forever — "if you'd held" has to mean
 * something bounded, and the day the trade happened is the bound the user
 * recognises, because it is the window their daily rules are written against.
 *
 * Everything here returns null rather than guessing. A card with no
 * counterfactual states the real outcome and says nothing about what might
 * have been; a card with a wrong one is a lie that the user posts under their
 * own name.
 */

const DAY_MS = 86_400_000;

/** End of the IST day a timestamp falls in, as epoch ms. */
export function istDayEnd(ms) {
  const key = istDayKey(new Date(ms));
  if (!key) return null;
  // IST is UTC+5:30 with no DST, so the day ends at 18:29:59.999Z.
  const end = Date.parse(`${key}T18:29:59.999Z`);
  return Number.isFinite(end) ? end : null;
}

/** Signed P&L of holding `qty` from `entry` to `price`. */
export function pnlAt(entry, price, qty, isLong) {
  const d = isLong ? price - entry : entry - price;
  return d * qty;
}

export function isLongSide(side) {
  return !/^(short|sell)/i.test(String(side ?? 'long'));
}

/**
 * The path the trade's P&L took WHILE open, and the path it would have taken
 * AFTER the close, both in account currency, sampled from candles.
 *
 * Returns null when the pair cannot be resolved or the venue's symbol is not
 * one Binance lists — a perfectly normal outcome for an exotic perp, and one
 * the caller must handle by dropping the counterfactual rather than by
 * substituting demo numbers.
 */
export async function tradePaths(trade, { signal, points = 14 } = {}) {
  const pair = resolveBinancePair(trade?.symbol);
  const entry = Number(trade?.entryPrice);
  const exit = Number(trade?.exitPrice);
  const qty = Math.abs(Number(trade?.quantity));
  const openMs = Date.parse(trade?.openedAt ?? '');
  const closeMs = Date.parse(trade?.closedAt ?? '');
  const realized = pnlOf(trade);

  if (!pair || !qty || !Number.isFinite(entry) || !Number.isFinite(openMs) || !Number.isFinite(closeMs)) return null;
  if (closeMs <= openMs) return null;

  const long = isLongSide(trade.side);
  const dayEnd = istDayEnd(closeMs);
  // A trade that closed in the last minutes of the IST day has no "afterwards"
  // worth pricing. Give it an hour either way rather than a two-candle path.
  const until = Math.min(Math.max(dayEnd ?? closeMs, closeMs + 3_600_000), closeMs + DAY_MS);

  let candles;
  try {
    candles = await fetchKlines(pair, intervalFor(until - openMs), openMs, until, { signal });
  } catch {
    return null;
  }
  if (candles.length < 4) return null;

  const during = candles.filter((c) => c.time * 1000 <= closeMs);
  const after = candles.filter((c) => c.time * 1000 >= closeMs);
  if (during.length < 2 || after.length < 2) return null;

  /*
   * Calibrate the model against the ledger, or refuse to answer.
   *
   * Candles are Binance SPOT, quoted in USDT. The position was a leveraged
   * perp, charged fees, and on a venue like Shark it SETTLES IN RUPEES. So the
   * modelled P&L and the realised P&L are not even in the same unit. The ratio
   * between them absorbs all of it at once — leverage, fees and the quote-to-
   * settlement rate — which is what makes the path comparable to the figure
   * printed above it.
   *
   * That ratio is only meaningful if the trade moved. A trade whose entry and
   * exit are the same price models a close of zero, and there is nothing to
   * calibrate against: the old code fell back to a scale of 1 and emitted raw
   * USDT as though it were the account currency. On a Shark account that put
   * "₹210.57 saved" on a card when the figure was 210 USDT of spot movement
   * on a trade the ledger says made ₹61,496.
   *
   * No calibration, no claim. The card drops the counterfactual and states
   * what actually happened.
   */
  if (realized == null) return null;

  /*
   * The exit used to calibrate, which is not always the ledger's.
   *
   * Shark reports no exit price at all — its CLOSED record simply has no such
   * field — so the journal stores null, and requiring one here meant no Shark
   * trade could ever produce a counterfactual or a reel. That is the venue
   * being unhelpful, not the trade being unknowable: the price at the moment
   * of the close is sitting in the candle data we have already fetched.
   *
   * Used ONLY to derive the scale factor, and never shown. The path still ends
   * exactly on the ledger's realised figure, so nothing the user reads comes
   * from this estimate — it only decides how many rupees a dollar of spot
   * movement was worth on this position.
   */
  const modelledExit = Number.isFinite(exit) && exit > 0
    ? exit
    : during[during.length - 1].close;
  if (!Number.isFinite(modelledExit)) return null;

  const modelledClose = pnlAt(entry, modelledExit, qty, long);
  // Relative to the notional, so the threshold means the same thing on a
  // ₹500 position and a ₹5,00,000 one.
  const notional = Math.abs(entry * qty);
  if (!notional || Math.abs(modelledClose) / notional < 1e-4) return null;

  const k = realized / modelledClose;
  // A ratio this far from 1 means the two numbers are not measuring the same
  // trade — a mismatched symbol, a stale fill, a quantity in contracts rather
  // than units. Whatever it is, it is not something to put on a share card.
  if (!Number.isFinite(k) || k <= 0 || k > 5000) return null;
  const scale = k;

  const sample = (rows, n) => {
    if (rows.length <= n) return rows;
    const out = [];
    for (let i = 0; i < n; i += 1) out.push(rows[Math.round((i * (rows.length - 1)) / (n - 1))]);
    return out;
  };

  const modelled = (price) => pnlAt(entry, price, qty, long) * scale;

  /*
   * JOINING THE MODEL TO THE LEDGER WITHOUT PUTTING A STEP IN THE LINE.
   *
   * Two numbers have to be exact: the path must END on the realised figure,
   * because that is the figure printed above it, and the after-path must
   * START on the same point, because the shaded region between them is the
   * card's whole claim.
   *
   * Both used to be done by overwriting one array element — `P[last] =
   * realized`, `A[0] = P[last]`. That does not join the two series, it snaps
   * one point of each and leaves the entire calibration residual as a
   * VERTICAL JUMP between that point and its neighbour. The residual is real:
   * `scale` is derived from the ledger's exit price, while the last sampled
   * candle closes wherever it closed, so the two disagree by however far
   * price moved inside that candle. On screen it was a step at precisely the
   * moment the card says "and here is where my rule closed it".
   *
   * So the series are MOVED to meet, not clipped:
   *
   *   P  carries the residual as a linear drift, zero at the open and the
   *      full amount at the close. The endpoint lands on `realized` exactly
   *      and every interior step stays the size the price made it.
   *   A  is shifted by a constant, chosen so its first point IS the close.
   *      A constant, because the model's bias at the exit does not improve
   *      with time — and because shifting the whole series keeps the shape of
   *      what happened next, which is the only thing A is for.
   */
  const pRaw = sample(during, points).map((c) => modelled(c.close));
  const residual = realized - pRaw[pRaw.length - 1];
  const span = pRaw.length - 1;
  const P = pRaw.map((v, i) => v + (residual * i) / span);
  // Belt and braces against float drift in the last term.
  P[P.length - 1] = realized;

  const aRaw = sample(after, points).map((c) => modelled(c.close));
  const shift = realized - aRaw[0];
  const A = aRaw.map((v) => v + shift);

  // The same shift, or `saved` is measured from a low the drawn path never
  // reaches — the figure and the picture would disagree by exactly `shift`.
  const worstAfter = Math.min(...after.map((c) => modelled(long ? c.low : c.high) + shift));
  const endAfter = A[A.length - 1];

  // The trade this belongs to. The newest closed trade and the newest
  // GUARD-closed trade are often different rows, and without this the card
  // for one happily printed the saving priced for the other.
  return { P, A, worstAfter, endAfter, pair, scale, tradeUid: trade.tradeUid ?? trade.id ?? null };
}

/**
 * What the rule was worth on this trade.
 *
 * Measured against the WORST point after the close, not the end of day: the
 * claim is "it kept falling and I didn't", and the depth of that fall is the
 * thing the user avoided sitting through. Returns null when the price went
 * the other way — the guard still did its job, but there is nothing to boast
 * about and the card should not pretend otherwise.
 */
export function savedFrom(paths) {
  if (!paths) return null;
  const realized = paths.P[paths.P.length - 1];
  const gain = realized - paths.worstAfter;
  return gain > 0
    ? { saved: gain, low: paths.worstAfter, end: paths.endAfter, tradeUid: paths.tradeUid ?? null }
    : null;
}
