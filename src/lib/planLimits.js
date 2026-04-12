/** Mirrors backend plan tiers: free, pro, pro+ (proplus). */

export function planTierFromSlug(planSlug) {
  if (!planSlug || typeof planSlug !== 'string') return 'free';
  const raw = planSlug.trim().toLowerCase().replace(/\s/g, '');
  if (raw === 'proplus' || raw === 'pro+') return 'proplus';
  if (raw === 'pro') return 'pro';
  return 'free';
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
