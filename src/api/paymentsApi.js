import { apiPost } from './httpClient';
import { resolvePaymentsApiBaseUrl } from './config';

/**
 * Open the Dodo Customer Portal (manage subscription, view invoices, cancel,
 * edit billing address). Returns `{ data: { portalUrl } }`. Caller should
 * `window.location.href = portalUrl`.
 *
 * NOTE: This is the general-management portal — for past_due card recovery,
 * prefer `updateSubscriptionPaymentMethod` which lands the user directly on
 * a checkout-style page to enter a new card.
 */
export async function openBillingPortal({ accessToken }, options = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for billing portal');
  }
  const baseUrl = options.baseUrl ?? resolvePaymentsApiBaseUrl();
  return apiPost(
    '/billing-portal/session',
    null,
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

/**
 * Get a Dodo-hosted payment-update link for the user's existing subscription.
 * Use this for past_due / on_hold recovery — Dodo retries the failed charge
 * once the new card is entered. Returns `{ data: { paymentUpdateUrl } }`.
 */
export async function updateSubscriptionPaymentMethod({ accessToken }, options = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for payment method update');
  }
  const baseUrl = options.baseUrl ?? resolvePaymentsApiBaseUrl();
  return apiPost(
    '/subscriptions/update-payment-method',
    null,
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
