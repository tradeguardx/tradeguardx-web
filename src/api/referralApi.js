import { apiGet, apiPost } from './httpClient';
import { resolvePaymentsApiBaseUrl } from './config';

/*
 * Refer a friend — payments-service, base /payments, Supabase JWT.
 * See REFERRAL_CONTRACT.md (16 Nov 2026).
 *
 *   GET  /payments/referral/me    the caller's code, link, rules, stats, rewards
 *   POST /payments/referral/bind  { code } → { bound } | { bound:false, reason }
 *
 * Services wrap responses as { success, data }; both calls return the inner
 * data, and tolerate a bare body too.
 */

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

function authed(accessToken, options) {
  if (!accessToken) throw new Error('Missing access token for referral API');
  return {
    ...options,
    baseUrl: options?.baseUrl ?? resolvePaymentsApiBaseUrl(),
    headers: { ...(options?.headers || {}), Authorization: `Bearer ${accessToken}` },
  };
}

/** GET /payments/referral/me. Creates the caller's code on first call. */
export async function getReferralMe({ accessToken }, options = {}) {
  return unwrap(await apiGet('/referral/me', authed(accessToken, options)));
}

/**
 * POST /payments/referral/bind. Always 200 for the known outcomes
 * (bound, own_code, already_bound, unknown_code, not_new); throws only on a
 * transport or server error.
 */
export async function bindReferral({ accessToken, code }, options = {}) {
  return unwrap(await apiPost('/referral/bind', { code }, authed(accessToken, options)));
}

/**
 * POST /payments/referral/currency { currency: 'INR' | 'USD' }: Amazon India (₹)
 * or Amazon in the referrer's own store ($). Refused (409) once a reward exists.
 */
export async function setReferralCurrency({ accessToken, currency }, options = {}) {
  return unwrap(await apiPost('/referral/currency', { currency }, authed(accessToken, options)));
}

/**
 * GET /payments/referral/invited-by → { invitedBy: { code, name } | null }.
 * The friend whose link brought the caller, while that referral still applies
 * (not their own code, still new to Pro). Shown in the coupon box so the
 * referral discount is one the buyer can see (21 Nov 2026).
 */
export async function getInvitedBy({ accessToken }, options = {}) {
  const data = unwrap(await apiGet('/referral/invited-by', authed(accessToken, options)));
  return data?.invitedBy ?? null;
}
