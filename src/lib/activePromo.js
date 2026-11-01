/**
 * Display helpers for the promo strip and pricing cards.
 *
 * The site-wide offer itself is NOT configured here any more. It used to be
 * read from VITE_ACTIVE_PROMO_* at build time; it now comes from the admin
 * panel via payments-service (src/api/offersApi.js, src/hooks/useActiveOffer.js),
 * so a stale Vercel variable can never advertise a code again.
 */

export function splitRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds };
}

/**
 * Rupee formatting for promo prices. `en-IN` so 1499 renders as ₹1,499 and
 * 149900 as ₹1,49,900 — Indian digit grouping, not thousands-separated.
 */
export function formatInr(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return `\u20b9${Math.round(Number(n)).toLocaleString('en-IN')}`;
}

/**
 * Price after a percentage promo.
 *
 * Rounded rather than floored: the figure here is only ever DISPLAYED, while
 * Dodo computes what is actually charged from its own basis-points arithmetic.
 * Rounding down to look cheaper would advertise a price a rupee under what the
 * customer is billed, which is the one direction of error worth avoiding.
 */
export function discountedPrice(monthly, pct) {
  // Reject null/undefined BEFORE coercing: Number(null) is 0, which is finite,
  // so a missing price would sail through the check below and render a
  // confident "₹0" as the discounted price. An absent price must produce no
  // price, not a free one.
  if (monthly == null || pct == null) return null;
  const m = Number(monthly);
  const p = Number(pct);
  if (!Number.isFinite(m) || !Number.isFinite(p) || p <= 0 || p >= 100) return null;
  return Math.round(m * (1 - p / 100));
}

/**
 * Normalise a plan slug or display name for matching.
 *
 * `+` maps to "plus" rather than being stripped. Deleting it collapses "Pro+"
 * onto "Pro", so a lookup for Pro matches the Pro+ row — which shipped, and put
 * "₹1,500 (was ₹2,999)" under a "Get Pro free for 7 days" headline. Pro is
 * ₹1,299.
 *
 * The requirement: every spelling of the top tier — `pro_plus`, `proplus`,
 * `Pro+`, `Pro Plus` — lands on ONE string, and `Pro` lands on a DIFFERENT one.
 *
 * Note this differs deliberately from `normalizePlanSlugForMatch` in
 * checkoutIntent.js, which does strip `+`. That one only ever sees slugs, where
 * `pro+` does not occur; this one also sees display NAMES, where `Pro+` is
 * exactly what the plans table stores.
 */
export function normalizePlanName(v) {
  return String(v ?? '')
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/[\s_-]/g, '');
}
