import { apiGet } from './httpClient';
import { detectBand, planForBand } from '../lib/priceBands';

/**
 * Plans priced for the visitor: rupees in India, a USD band elsewhere (see
 * lib/priceBands). Each plan carries `currency`. `band` can be passed to skip
 * detection (tests, or a caller that already knows).
 */
export async function getPricingPlans(options = {}) {
  const { band: forced, ...rest } = options;
  const [payload, band] = await Promise.all([apiGet('/pricing/plans', rest), forced ? Promise.resolve(forced) : detectBand()]);
  const plans = payload?.data?.plans;

  if (!Array.isArray(plans)) {
    throw new Error('Pricing API returned invalid plan data');
  }

  return plans.map((p) => planForBand(p, band));
}
