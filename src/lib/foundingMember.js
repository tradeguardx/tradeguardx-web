/**
 * Founding-member launch promo configuration.
 *
 * Set these env vars to turn the marketing surface ON across pricing/signup/
 * homepage. Clear them when the program ends — components hide automatically.
 *
 *   VITE_FOUNDING_MEMBER_ACTIVE=true       (any truthy string)
 *   VITE_FOUNDING_MEMBER_LIMIT=100         (display only, e.g. "100")
 *   VITE_FOUNDING_MEMBER_TRIAL_DAYS        (IGNORED since 9 Nov 2026, see below)
 *   VITE_FOUNDING_MEMBER_PLAN=Pro          (display label, default "Pro")
 *
 * These vars control ONLY the marketing UI.
 *
 * There is no free trial since 9 Nov 2026 (the 3-day Tester pass is paid), so
 * trialDays is always 0 and the promo never says "free for N days" — even if
 * an old VITE_FOUNDING_MEMBER_TRIAL_DAYS is still set in the deploy env, which
 * would otherwise promise access that signup does not deliver.
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
  // No free days exist any more; kept in the shape so callers' `trialDays > 0`
  // branches simply stay off.
  const trialDays = 0;
  const plan = (import.meta.env.VITE_FOUNDING_MEMBER_PLAN || 'Pro').trim();
  return { limit, trialDays, plan };
}
