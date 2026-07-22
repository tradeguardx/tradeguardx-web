/**
 * Founding-member launch promo configuration.
 *
 * Set these env vars to turn the marketing surface ON across pricing/signup/
 * homepage. Clear them when the program ends — components hide automatically.
 *
 *   VITE_FOUNDING_MEMBER_ACTIVE=true       (any truthy string)
 *   VITE_FOUNDING_MEMBER_LIMIT=100         (display only, e.g. "100")
 *   VITE_FOUNDING_MEMBER_MONTHS=3          (display only, e.g. "3")
 *   VITE_FOUNDING_MEMBER_PLAN=Pro          (display label, default "Pro")
 *
 * These vars control ONLY the marketing UI. The actual grant is the extended
 * free trial: user-service / subscription-service TRIAL_DAYS (set to 30 for the
 * launch). Keep the "months" here in sync with what TRIAL_DAYS actually gives.
 */
function isTruthy(raw) {
  if (raw == null) return false;
  const s = String(raw).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export function getFoundingMemberConfig() {
  const active = isTruthy(import.meta.env.VITE_FOUNDING_MEMBER_ACTIVE);
  if (!active) return null;
  const limit = Number(import.meta.env.VITE_FOUNDING_MEMBER_LIMIT) || 50;
  const months = Number(import.meta.env.VITE_FOUNDING_MEMBER_MONTHS) || 1;
  const plan = (import.meta.env.VITE_FOUNDING_MEMBER_PLAN || 'Pro').trim();
  return { limit, months, plan };
}
