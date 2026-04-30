import { apiGet } from './httpClient';
import { resolvePaymentsApiBaseUrl } from './config';

function authHeaders(accessToken) {
  if (!accessToken) {
    throw new Error('Missing access token for influencer API');
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function withBase(options) {
  return {
    ...options,
    baseUrl: options?.baseUrl ?? resolvePaymentsApiBaseUrl(),
  };
}

/** GET /payments/influencer/me — returns the current user's influencer profile + share URL. */
export function getInfluencerMe({ accessToken }, options = {}) {
  return apiGet('/influencer/me', {
    ...withBase(options),
    headers: { ...(options.headers || {}), ...authHeaders(accessToken) },
  });
}

/** GET /payments/influencer/stats — totals: lifetime, pending, approved, paid, voided. */
export function getInfluencerStats({ accessToken }, options = {}) {
  return apiGet('/influencer/stats', {
    ...withBase(options),
    headers: { ...(options.headers || {}), ...authHeaders(accessToken) },
  });
}

/** GET /payments/influencer/commissions?page=1&pageSize=50 */
export function listInfluencerCommissions({ accessToken, page = 1, pageSize = 50 }, options = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
  return apiGet(`/influencer/commissions?${query}`, {
    ...withBase(options),
    headers: { ...(options.headers || {}), ...authHeaders(accessToken) },
  });
}

/** GET /payments/influencer/payouts?page=1&pageSize=50 */
export function listInfluencerPayouts({ accessToken, page = 1, pageSize = 50 }, options = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
  return apiGet(`/influencer/payouts?${query}`, {
    ...withBase(options),
    headers: { ...(options.headers || {}), ...authHeaders(accessToken) },
  });
}
