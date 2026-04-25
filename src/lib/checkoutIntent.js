/** sessionStorage key: paid plan user chose before/during signup (completed checkout clears this). */
export const PENDING_CHECKOUT_PLAN_KEY = 'tgx_pending_checkout_plan';

export function setPendingCheckoutPlan(planKey) {
  if (!planKey || planKey === 'free') {
    sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
    return;
  }
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, planKey);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPendingCheckoutPlan() {
  try {
    return sessionStorage.getItem(PENDING_CHECKOUT_PLAN_KEY);
  } catch {
    return null;
  }
}

export function clearPendingCheckoutPlan() {
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
  } catch {
    /* ignore */
  }
}

/** Normalize plan slug from URL/signup (?plan=pro, pro_plus, proplus) for matching pricing cards. */
export function normalizePlanSlugForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s_+-]/g, '');
}
