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
export async function createCheckoutSession({ accessToken, planSlug, couponCode, interval = 'monthly' }, options = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for checkout');
  }
  const baseUrl = options.baseUrl ?? resolvePaymentsApiBaseUrl();
  const body = { planSlug, interval, ...(couponCode ? { couponCode } : {}) };
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

/**
 * Ask whether a coupon is real before sending anyone to checkout.
 *
 * Dodo accepts an unknown code silently — the session is created, the code
 * does nothing, and the customer finds out by paying full price. This is what
 * lets "Apply" mean something and lets the panel show a number we can stand
 * behind.
 *
 * @returns {Promise<{valid:true,code:string,percentOff:number,cycles:number|null}
 *   |{valid:false,reason:'UNKNOWN'|'EXPIRED'|'USED_UP'|'WRONG_PLAN'|'UNSUPPORTED'}>}
 */
export async function validateCoupon({ accessToken, code, planSlug = 'pro', interval = 'monthly' }, options = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const baseUrl = options.baseUrl ?? resolvePaymentsApiBaseUrl();
  return apiPost(
    '/coupon/validate',
    { code, planSlug, interval },
    { ...options, baseUrl, headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers ?? {}) } },
  );
}
