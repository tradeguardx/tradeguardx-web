/** sessionStorage key: paid plan user chose before/during signup (completed checkout clears this). */
export const PENDING_CHECKOUT_PLAN_KEY = 'tgx_pending_checkout_plan';

export const PENDING_CHECKOUT_INTERVAL_KEY = 'tgx_pending_checkout_interval';
export const BILLING_INTERVALS = ['monthly', 'quarterly', 'yearly'];

export function normalizeInterval(v) {
  const s = String(v || '').toLowerCase();
  return BILLING_INTERVALS.includes(s) ? s : 'monthly';
}

export function setPendingCheckoutPlan(planKey, interval = 'monthly') {
  if (!planKey || planKey === 'free') {
    try { sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY); sessionStorage.removeItem(PENDING_CHECKOUT_INTERVAL_KEY); } catch { /* ignore */ }
    return;
  }
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, planKey);
    sessionStorage.setItem(PENDING_CHECKOUT_INTERVAL_KEY, normalizeInterval(interval));
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

export function getPendingCheckoutInterval() {
  try {
    return normalizeInterval(sessionStorage.getItem(PENDING_CHECKOUT_INTERVAL_KEY));
  } catch {
    return 'monthly';
  }
}

export function clearPendingCheckoutPlan() {
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
    sessionStorage.removeItem(PENDING_CHECKOUT_INTERVAL_KEY);
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
