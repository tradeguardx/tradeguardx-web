import { apiPost } from './httpClient';
import { resolvePaymentsApiBaseUrl } from './config';

/**
 * Dodo hosted checkout (payments-service).
 * Base URL: `resolvePaymentsApiBaseUrl()` — follows `VITE_APP_ENV` and optional `VITE_PAYMENTS_API_BASE_URL`.
 * Local: POST http://localhost:3002/checkout/session
 *
 * Optional `couponCode` is the influencer/referral code captured from `?ref=CODE`
 * (see `lib/referralCode.js`). The backend validates it against `influencer_profiles`
 * and silently drops it if it doesn't match — checkout always proceeds either way.
 */
export async function createCheckoutSession({ accessToken, planSlug, couponCode }, options = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for checkout');
  }
  const baseUrl = options.baseUrl ?? resolvePaymentsApiBaseUrl();
  const body = couponCode ? { planSlug, couponCode } : { planSlug };
  return apiPost(
    '/checkout/session',
    body,
    {
      ...options,
      baseUrl,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}
