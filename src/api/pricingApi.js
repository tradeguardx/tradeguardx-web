import { apiGet } from './httpClient';

export async function getPricingPlans(options = {}) {
  const payload = await apiGet('/pricing/plans', options);
  const plans = payload?.data?.plans;

  if (!Array.isArray(plans)) {
    throw new Error('Pricing API returned invalid plan data');
  }

  return plans;
}
