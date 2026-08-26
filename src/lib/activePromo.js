/**
 * Active platform-wide promo (e.g. flash sale, holiday discount).
 *
 * Configured via Vite env vars at build/deploy time:
 *   VITE_ACTIVE_PROMO_CODE         e.g. "SUMMER30"
 *   VITE_ACTIVE_PROMO_EXPIRES_AT   ISO 8601, e.g. "2026-05-02T23:59:59Z"
 *   VITE_ACTIVE_PROMO_DISCOUNT     integer percent for display (optional)
 *   VITE_ACTIVE_PROMO_CYCLES       billing cycles the discount covers (optional)
 *   VITE_ACTIVE_PROMO_HEADLINE     short eyebrow string (optional)
 *
 * Returns null when not configured, malformed, or already expired — the
 * <ActivePromo /> component renders nothing in that case, so leaving the env
 * vars unset is the natural way to "no promo right now".
 */
export function getActivePromo() {
  const code = (import.meta.env.VITE_ACTIVE_PROMO_CODE ?? '').trim().toUpperCase();
  const expiresAtRaw = (import.meta.env.VITE_ACTIVE_PROMO_EXPIRES_AT ?? '').trim();
  const headline = (import.meta.env.VITE_ACTIVE_PROMO_HEADLINE ?? '').trim() || 'Limited Offer';
  const discountRaw = (import.meta.env.VITE_ACTIVE_PROMO_DISCOUNT ?? '').trim();
  const cyclesRaw = (import.meta.env.VITE_ACTIVE_PROMO_CYCLES ?? '').trim();

  if (!code || !expiresAtRaw) return null;

  const expiresAt = Date.parse(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return null;
  if (expiresAt <= Date.now()) return null;

  const discountPct = Number(discountRaw);
  // MUST MATCH the Dodo discount's `subscription_cycles`. A coupon created with
  // cycles=1 discounts only the first month, and a banner that says "off all
  // paid plans" would be promising an ongoing price we never charge. Null means
  // the discount recurs forever, which is what Dodo does when cycles is unset.
  const cycles = Number(cyclesRaw);
  return {
    code,
    expiresAt,
    headline,
    discountPct: Number.isFinite(discountPct) && discountPct > 0 ? Math.round(discountPct) : null,
    cycles: Number.isFinite(cycles) && cycles > 0 ? Math.round(cycles) : null,
  };
}

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
