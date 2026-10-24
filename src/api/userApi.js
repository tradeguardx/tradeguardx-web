import { apiPost, apiPut } from './httpClient';

export async function initUserProfile({ accessToken, fullName, email, attribution, timezone, signal } = {}) {
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
      // The device's IANA zone. The server stores it only when the profile
      // has none, so this fills a new (or pre-timezone) profile once and
      // never overwrites a zone the user chose in Preferences.
      timezone: timezone || undefined,
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

/**
 * Change the profile's timezone — the zone the dashboard shows times in and
 * the daily limits reset on (midnight, the user's time).
 *
 * Resolves to `{ timezone, appliesFrom: 'next_daily_reset' }`: a change never
 * moves today's reset, it takes over from the next one. Rejects with an
 * ApiError — 400 INVALID_TIMEZONE, or 429 TIMEZONE_CHANGE_TOO_SOON when the
 * last change was under 7 days ago (`retryAfterOf` reads when it opens).
 */
export async function updateUserTimezone({ accessToken, timezone, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const payload = await apiPut(
    '/profile/timezone',
    { timezone },
    { signal, headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return payload?.data ?? payload;
}

/**
 * The ISO instant a refused timezone change can be retried, wherever the
 * 429 body put it (the error envelope, its details, or the top level).
 */
export function retryAfterOf(err) {
  const p = err?.details;
  return p?.error?.retryAfter ?? p?.error?.details?.retryAfter ?? p?.retryAfter ?? p?.data?.retryAfter ?? null;
}
