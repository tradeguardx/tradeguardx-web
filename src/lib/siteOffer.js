/**
 * Pure helpers for the site-wide offer (src/api/offersApi.js). Every sentence
 * the site says about an offer is DERIVED from what the coupon does — its
 * percentage, its `cycles` and its `intervals` — so the copy cannot promise
 * more than checkout gives. A cycles=1 code is never "30% off Pro".
 */

const ALL = ['monthly', 'quarterly', 'yearly'];
const UNIT = { monthly: 'month', quarterly: 'quarter', yearly: 'year' };

/** Live for this visitor right now: before endsAt, and in their audience. */
export function offerApplies(offer, band, now = Date.now()) {
  if (!offer) return false;
  if (!(now < offer.endsAt)) return false;
  return offer.audience === 'all' || band === 'in';
}

export function offerCoversInterval(offer, interval) {
  return Boolean(offer?.intervals?.includes(interval));
}

/**
 * "your first payment" / "your first month" / "your first 3 months" /
 * "every payment". A single-interval offer names its unit; a multi-interval
 * one says "payment", because the first payment is a month on one plan and a
 * year on another.
 */
export function offerScope(offer) {
  const ivs = offer?.intervals ?? [];
  const n = offer?.cycles ?? null;
  const unit = ivs.length === 1 ? UNIT[ivs[0]] : 'payment';
  if (n === 1) return `your first ${unit}`;
  if (n > 1) return `your first ${n} ${unit}s`;
  return 'every payment';
}

/** " — any plan", " — monthly and yearly plans", " — monthly plan", or "". */
function planSuffix(offer) {
  const ivs = offer?.intervals ?? [];
  if (ALL.every((iv) => ivs.includes(iv))) return ' — any plan';
  if (ivs.length === 2) return ` — ${ivs[0]} and ${ivs[1]} plans`;
  // "your first month" already names the plan; an ongoing one does not.
  if (ivs.length === 1 && offer.cycles == null) return ` — ${ivs[0]} plan`;
  return '';
}

/**
 * The big line on the strip. An admin-written `title` wins; otherwise:
 *   cycles 1, all intervals  → "30% off your first payment — any plan"
 *   cycles 1, monthly only   → "30% off your first month"
 *   cycles null, all         → "30% off every payment — any plan"
 * At exactly 50% it reads "Half price on …" — the conclusion the reader was
 * going to reach anyway.
 */
export function offerHeadline(offer) {
  if (!offer) return '';
  if (offer.title) return offer.title;
  const scope = offerScope(offer);
  const lead = offer.amountOff ? `Flat ${inr(offer.amountOff)} off` : offer.discountPct === 50 ? 'Half price on' : `${offer.discountPct}% off`;
  return `${lead} ${scope}${planSuffix(offer)}`;
}

/** "DIWALI OFFER" → "Diwali offer", for inline notes and chips. */
export function offerLabel(offer) {
  const h = String(offer?.headline ?? '').trim();
  if (!h) return 'Offer';
  const lower = h.toLowerCase();
  return lower[0].toUpperCase() + lower.slice(1);
}

/** "₹299" — flat amounts are rupees only (payments refuses flat outside India). */
function inr(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

/**
 * Price after a discount, for DISPLAY. `d` is an offer ({ discountPct } or
 * { amountOff }), a verified coupon ({ percentOff } or { amountOff }), or a
 * bare percentage. Rounded, never floored: Dodo computes the charge itself,
 * and advertising a rupee under what is billed is the one direction of error
 * worth avoiding. A flat amount that would take the price to zero or below is
 * not shown at all.
 */
export function offerPrice(price, d) {
  if (price == null || d == null) return null;
  const m = Number(price);
  if (!Number.isFinite(m) || m <= 0) return null;
  const flat = typeof d === 'object' ? Number(d.amountOff) : NaN;
  if (Number.isFinite(flat) && flat > 0) return flat < m ? Math.round(m - flat) : null;
  const p = Number(typeof d === 'object' ? d.percentOff ?? d.discountPct : d);
  if (!Number.isFinite(p) || p <= 0 || p >= 100) return null;
  return Math.round(m * (1 - p / 100));
}

/** "first month" / "first year" for a covered interval when cycles=1; else null. */
export function firstPeriodLabel(offer, interval) {
  if (offer?.cycles !== 1) return null;
  return `first ${UNIT[interval] ?? 'payment'}`;
}

/**
 * The price-led line under the headline, e.g. "Pro from ₹909 for your first
 * month". Only when monthly is covered (the cheapest single payment) and the
 * price is known; `format` turns a number into money.
 */
export function offerPriceLine(offer, { planName = 'Pro', monthly, format }) {
  if (!offer || !offerCoversInterval(offer, 'monthly')) return null;
  const after = offerPrice(monthly, offer);
  if (after == null) return null;
  const amt = format(after);
  if (offer.cycles === 1) return `${planName} from ${amt} for your first month`;
  if (offer.cycles > 1) return `${planName} from ${amt}/mo for your first ${offer.cycles} months`;
  return `${planName} from ${amt}/mo`;
}

/** "30% off your first payment" / "₹299 off every payment" — from a verified coupon result, or an offer. */
export function discountWording({ percentOff, discountPct, amountOff, cycles }) {
  const scope = cycles === 1 ? 'your first payment' : cycles > 1 ? `your first ${cycles} payments` : 'every payment';
  return amountOff ? `${inr(amountOff)} off ${scope}` : `${percentOff ?? discountPct}% off ${scope}`;
}
