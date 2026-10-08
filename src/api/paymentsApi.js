import { apiGet, apiPost } from './httpClient';
import { resolvePaymentsApiBaseUrl } from './config';

/*
 * Services wrap responses as { success, data }. Callers want the data.
 *
 * This was being left to each call site, and they disagreed: the pricing page
 * read `res.data.checkoutUrl` while the billing step read `res.checkoutUrl`,
 * so one of them was always going to be wrong. Unwrapping here means there is
 * one answer and no call site has to know the envelope exists.
 */
function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}


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
  return unwrap(await apiPost(
    '/billing-portal/session',
    null,
    {
      ...options,
      baseUrl,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    },
  ));
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
  return unwrap(await apiPost(
    '/subscriptions/update-payment-method',
    null,
    {
      ...options,
      baseUrl,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    },
  ));
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
  /*
   * Where checkout should send us back to. The server decides whether to
   * honour it — localhost off production, our own app otherwise — so this is
   * a request, not an instruction. Without it a local dev session was
   * returned to tradeguardx.com after paying.
   */
  const returnOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const body = { planSlug, interval, ...(couponCode ? { couponCode } : {}), ...(returnOrigin ? { returnOrigin } : {}) };
  return unwrap(await apiPost(
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
  ));
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
  return unwrap(await apiPost(
    '/coupon/validate',
    { code, planSlug, interval },
    { ...options, baseUrl, headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers ?? {}) } },
  ));
}

/*
 * Changing billing period on the subscription the user already has.
 *
 * These exist because the billing page used to send people to the provider's
 * customer portal for this. That portal shows the subscription, the payment
 * methods and the invoices — and has no plan switcher at all, so "Switch to
 * Yearly" landed the user on a page where they could not switch to yearly.
 *
 * Nobody is charged for changing their mind: the server sends every change as
 * do-not-bill, immediately while on trial and at the next renewal once paying.
 */

const authed = (accessToken, options) => {
  if (!accessToken) throw new Error('Missing access token');
  return {
    ...options,
    baseUrl: options.baseUrl ?? resolvePaymentsApiBaseUrl(),
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
  };
};

/**
 * @returns {Promise<{interval:string,effectiveAt:'immediately'|'next_billing_date',
 *   pending:{interval:string,effectiveAt:string}|null}>}
 */
export async function changeSubscriptionPlan({ accessToken, interval }, options = {}) {
  return unwrap(await apiPost('/subscriptions/change-plan', { interval }, authed(accessToken, options)));
}

/** Undo a change that is waiting for the next renewal. */
export async function cancelSubscriptionPlanChange({ accessToken }, options = {}) {
  return unwrap(await apiPost('/subscriptions/cancel-change-plan', null, authed(accessToken, options)));
}

/**
 * What the subscription is scheduled to become, read from the provider.
 *
 * A change set for the next renewal leaves the CURRENT period reported as-is,
 * so without this the page would show "Monthly" and a live switch button to
 * someone who already switched.
 *
 * @returns {Promise<{pending:{interval:string,effectiveAt:string}|null}>}
 */
export async function fetchPendingPlanChange({ accessToken }, options = {}) {
  return unwrap(await apiGet('/subscriptions/plan-change', authed(accessToken, options)));
}

/**
 * Cancel the subscription.
 *
 * Always at the end of the period, never immediately — during the trial that
 * is exactly the paywall's promise (leave before day eight, pay nothing)
 * without taking back the days already given. The server decides that; there
 * is no "cancel now" to ask for.
 *
 * @returns {Promise<{canceled:true,alreadyCanceled:boolean}>}
 */
export async function cancelSubscription({ accessToken }, options = {}) {
  return unwrap(await apiPost('/subscriptions/cancel', null, authed(accessToken, options)));
}

/**
 * Un-cancel. Optionally come back on a different period in the same act.
 *
 * Cancellation runs to the end of the period, so until that date the mandate
 * is still live — resuming clears a flag rather than buying again, and the
 * bank is not asked to approve anything a second time.
 *
 * Throws with `code: 'NEEDS_CHECKOUT'` once the period has actually run out,
 * which is the caller's cue to open checkout instead.
 *
 * @returns {Promise<{resumed:true,interval:string|null,planChanged:boolean}>}
 */
export async function resumeSubscription({ accessToken, interval }, options = {}) {
  return unwrap(await apiPost(
    '/subscriptions/resume',
    interval ? { interval } : null,
    authed(accessToken, options),
  ));
}

/**
 * How many free days this user will ACTUALLY get, from the same function the
 * checkout session uses.
 *
 * The paywall used to have `TRIAL_DAYS = 7` written into it and promise seven
 * to everyone. Checkout does not use that number: a part-used trial carries
 * its remainder across, and a trial that has already ended gets nothing. So
 * the screen and the charge disagreed, always against the customer — someone
 * whose trial had lapsed was shown "₹0 today" and then debited in full.
 *
 * @returns {Promise<{trialDays:number,fullTrialDays:number}>}
 */
export async function fetchTrialEligibility({ accessToken }, options = {}) {
  return unwrap(await apiGet('/subscriptions/trial-eligibility', authed(accessToken, options)));
}
