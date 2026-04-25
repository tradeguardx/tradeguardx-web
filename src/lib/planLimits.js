import { normalizePlanSlugForMatch } from './checkoutIntent';

/** Mirrors backend plan tiers: free, pro, pro+ (proplus). Uses same slug normalization as checkout. */
export function planTierFromSlug(planSlug) {
  if (!planSlug || typeof planSlug !== 'string') return 'free';
  const raw = normalizePlanSlugForMatch(planSlug);
  if (raw === 'proplus') return 'proplus';
  if (raw === 'pro') return 'pro';
  return 'free';
}

/** free=0, pro=1, proplus=2 — for upgrade-only checkout. */
export function planTierRank(planSlug) {
  const t = planTierFromSlug(planSlug);
  if (t === 'proplus') return 2;
  if (t === 'pro') return 1;
  return 0;
}

export function isPaidPlan(planSlug) {
  return planTierRank(planSlug) > 0;
}

/** Short label for badges (prefer API `planLabel` when available). */
export function planDisplayLabel(planSlug) {
  const t = planTierFromSlug(planSlug);
  if (t === 'proplus') return 'Pro+';
  if (t === 'pro') return 'Pro';
  return 'Free';
}

/**
 * Whether checkout is allowed for a paid pricing card (upgrade only; block same tier and downgrades).
 * @returns {{ allowed: boolean, reason: 'upgrade' | 'current' | 'downgrade' | 'invalid_target' }}
 */
export function paidCheckoutEligibility(currentUserPlanSlug, targetPlanKey) {
  const targetRank = planTierRank(targetPlanKey);
  if (targetRank <= 0) {
    return { allowed: false, reason: 'invalid_target' };
  }
  const currentRank = planTierRank(currentUserPlanSlug);
  if (targetRank > currentRank) return { allowed: true, reason: 'upgrade' };
  if (targetRank === currentRank) return { allowed: false, reason: 'current' };
  return { allowed: false, reason: 'downgrade' };
}

/** @returns {number|null} null = unlimited */
export function maxTradingAccountsForPlan(planSlug) {
  const t = planTierFromSlug(planSlug);
  if (t === 'proplus') return null;
  if (t === 'pro') return 5;
  return 1;
}

/** @returns {number|null} null = unlimited lookback */
export function journalHistoryDaysForPlan(planSlug) {
  const t = planTierFromSlug(planSlug);
  if (t === 'proplus') return null;
  if (t === 'pro') return 90;
  return 7;
}

export function journalPeriodBadgeLabel(planSlug) {
  const t = planTierFromSlug(planSlug);
  if (t === 'proplus') return 'All history';
  if (t === 'pro') return 'Last 90 days';
  return 'Last 7 days';
}

export function journalPeriodSubtitle(planSlug) {
  const t = planTierFromSlug(planSlug);
  if (t === 'proplus') {
    return 'Performance analytics and equity from all synced trades on your plan.';
  }
  if (t === 'pro') {
    return 'Performance analytics for synced trades opened in the last 90 days (Pro).';
  }
  return 'Performance analytics for synced trades opened in the last 7 days (Free). Upgrade for longer history.';
}
