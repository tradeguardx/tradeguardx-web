import { normalizePlanSlugForMatch } from './checkoutIntent';

/**
 * One paid tier. "proplus" is retired but still normalises to 'pro' so old
 * subscription rows and trial entitlements keep full access.
 */
export const PRO_HISTORY_FINANCIAL_YEARS = 3;
export const PRO_ACCOUNT_CEILING = 20;

export function planTierFromSlug(planSlug) {
  if (!planSlug || typeof planSlug !== 'string') return 'free';
  const raw = normalizePlanSlugForMatch(planSlug);
  if (raw === 'proplus' || raw === 'pro') return 'pro';
  return 'free';
}

/** free=0, pro=1 — for upgrade-only checkout. */
export function planTierRank(planSlug) {
  return planTierFromSlug(planSlug) === 'pro' ? 1 : 0;
}

export function isPaidPlan(planSlug) {
  return planTierRank(planSlug) > 0;
}

/** Short label for badges (prefer API `planLabel` when available). */
export function planDisplayLabel(planSlug) {
  return planTierFromSlug(planSlug) === 'pro' ? 'Pro' : 'Free';
}

/**
 * Whether checkout is allowed for a paid pricing card (upgrade only; block same tier and downgrades).
 * @returns {{ allowed: boolean, reason: 'upgrade' | 'current' | 'downgrade' | 'invalid_target' }}
 */
export function paidCheckoutEligibility(currentUserPlanSlug, targetPlanKey) {
  const targetRank = planTierRank(targetPlanKey);
  if (targetRank <= 0) return { allowed: false, reason: 'invalid_target' };
  const currentRank = planTierRank(currentUserPlanSlug);
  if (targetRank > currentRank) return { allowed: true, reason: 'upgrade' };
  if (targetRank === currentRank) return { allowed: false, reason: 'current' };
  return { allowed: false, reason: 'downgrade' };
}

/** @returns {number|null} null = unlimited (a 20-account abuse ceiling sits behind it server-side) */
export function maxTradingAccountsForPlan(planSlug) {
  return planTierFromSlug(planSlug) === 'pro' ? null : 1;
}

/** 1 April of the Indian financial year containing `d`. */
export function financialYearStart(d = new Date()) {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(y, 3, 1);
}

/** Earliest date a plan can see trades from. */
export function journalHistorySince(planSlug, now = new Date()) {
  if (planTierFromSlug(planSlug) !== 'pro') return new Date(now.getTime() - 7 * 86400000);
  return new Date(financialYearStart(now).getFullYear() - (PRO_HISTORY_FINANCIAL_YEARS - 1), 3, 1);
}

/** @returns {number|null} days of lookback; Pro is FY-based so this is the day count to 1 April three FYs back */
export function journalHistoryDaysForPlan(planSlug, now = new Date()) {
  if (planTierFromSlug(planSlug) !== 'pro') return 7;
  return Math.ceil((now.getTime() - journalHistorySince(planSlug, now).getTime()) / 86400000);
}

export function journalPeriodBadgeLabel(planSlug) {
  return planTierFromSlug(planSlug) === 'pro' ? '3 financial years' : 'Last 7 days';
}

export function journalPeriodSubtitle(planSlug) {
  if (planTierFromSlug(planSlug) === 'pro') {
    return 'Performance analytics from this financial year and the two before it.';
  }
  return 'Performance analytics for trades opened in the last 7 days (Free). Upgrade for three financial years.';
}
