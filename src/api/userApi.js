import { apiGet, apiPost } from './httpClient';

export async function initUserProfile({ accessToken, fullName, email, attribution, signal } = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for profile initialization');
  }

  return apiPost(
    '/profile/init',
    {
      fullName: fullName || null,
      email: email && String(email).trim() ? String(email).trim() : null,
      // First-touch attribution — persisted to the profile on the first insert so
      // "which channel won this user" is permanent and joinable against revenue.
      // Ignored server-side if the profile already exists.
      attribution: attribution || undefined,
    },
    {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Manual killswitch — a self-imposed trading lockout.
 *
 * There is deliberately no cancel call: the backend exposes no route to clear
 * an armed lock. It ends only when its time passes.
 */
export const LOCKOUT_HOUR_OPTIONS = [3, 6, 12];

export async function armLockout({ accessToken, tradingAccountId, hours, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing trading account');

  return apiPost(
    `/trading-accounts/${encodeURIComponent(tradingAccountId)}/lockout`,
    { hours },
    { signal, headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function fetchLockout({ accessToken, tradingAccountId, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing trading account');

  return apiGet(`/trading-accounts/${encodeURIComponent(tradingAccountId)}/lockout`, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
