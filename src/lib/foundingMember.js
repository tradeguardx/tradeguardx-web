/**
 * Founding-member launch promo configuration.
 *
 * Set these env vars to turn the marketing surface ON across pricing/signup/
 * homepage. Clear them when the program ends — components hide automatically.
 *
 *   VITE_FOUNDING_MEMBER_ACTIVE=true       (any truthy string)
 *   VITE_FOUNDING_MEMBER_LIMIT=100         (display only, e.g. "100")
 *   VITE_FOUNDING_MEMBER_TRIAL_DAYS=7      (display only, default 7)
 *   VITE_FOUNDING_MEMBER_PLAN=Pro          (display label, default "Pro")
 *
 * These vars control ONLY the marketing UI. The actual grant is the free trial:
 * user-service / subscription-service TRIAL_DAYS (7 days as of 2026-08-26; it
 * was 30 for the launch cohort). VITE_FOUNDING_MEMBER_TRIAL_DAYS MUST MATCH
 * TRIAL_DAYS — nothing enforces it, and when they disagree the site promises
 * access that signup does not deliver.
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
  // Was `months`, which rendered as "1 month" / "30 days" while the actual
  // grant is TRIAL_DAYS — so the promo advertised roughly 4x what a signup
  // received. Stated in DAYS now, in the same unit the backend grants, because
  // a unit mismatch is what let the two drift apart unnoticed.
  const trialDays = Number(import.meta.env.VITE_FOUNDING_MEMBER_TRIAL_DAYS) || 7;
  const plan = (import.meta.env.VITE_FOUNDING_MEMBER_PLAN || 'Pro').trim();
  return { limit, trialDays, plan };
}
