import { apiPost } from './httpClient';
import { resolvePaymentsApiBaseUrl } from './config';

/**
 * Dodo hosted checkout (payments-service).
 * Local: POST http://localhost:3002/checkout/session
 */
export async function createCheckoutSession({ accessToken, planSlug }, options = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for checkout');
  }
  const baseUrl = options.baseUrl ?? resolvePaymentsApiBaseUrl();
  return apiPost(
    '/checkout/session',
    { planSlug },
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
