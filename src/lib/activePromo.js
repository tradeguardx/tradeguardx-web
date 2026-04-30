/**
 * Active platform-wide promo (e.g. flash sale, holiday discount).
 *
 * Configured via Vite env vars at build/deploy time:
 *   VITE_ACTIVE_PROMO_CODE         e.g. "SUMMER30"
 *   VITE_ACTIVE_PROMO_EXPIRES_AT   ISO 8601, e.g. "2026-05-02T23:59:59Z"
 *   VITE_ACTIVE_PROMO_DISCOUNT     integer percent for display (optional)
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

  if (!code || !expiresAtRaw) return null;

  const expiresAt = Date.parse(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return null;
  if (expiresAt <= Date.now()) return null;

  const discountPct = Number(discountRaw);
  return {
    code,
    expiresAt,
    headline,
    discountPct: Number.isFinite(discountPct) && discountPct > 0 ? Math.round(discountPct) : null,
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
