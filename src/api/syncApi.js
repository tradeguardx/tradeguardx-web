import { apiGet, apiPost } from './httpClient';
import { SYNC_API_BASE_URL } from './config';

/**
 * Exchange history import.
 *
 * The trigger does auth, an ownership check and one SQS enqueue, then returns
 * — it is written so it cannot time out however much history there is. A
 * worker pages the fills, reconstructs closed positions by FIFO and writes
 * them where the journal and tax centre already read from.
 *
 * FIRED AND FORGOTTEN, DELIBERATELY. It runs for minutes, and nothing the
 * user is doing may wait on it: the screen it is kicked off from is the one
 * where they have just handed over an API key, and the next thing they see is
 * a price. A slow dependency can improve that screen; it must never be what
 * completes it.
 */
export async function triggerHistoryBackfill({ accessToken, tradingAccountId, deepSync = false } = {}) {
  if (!accessToken || !tradingAccountId) return null;
  /* The route keeps the service name after the base path, as every service
     here does: basePath `sync` plus `/sync/delta/backfill`. Verified against
     dev — it answers 401 unauthenticated, not 404. */
  return apiPost(
    '/sync/delta/backfill',
    { tradingAccountId, deepSync },
    { baseUrl: SYNC_API_BASE_URL, headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

/**
 * Where the history import for one account stands: idle | queued |
 * in_progress | error, plus when it last moved. The revenge report's Refresh
 * waits on this before asking for the report again.
 */
export async function fetchBackfillStatus({ accessToken, tradingAccountId, signal } = {}) {
  if (!accessToken || !tradingAccountId) return null;
  const params = new URLSearchParams({ tradingAccountId });
  const payload = await apiGet(`/sync/delta/backfill/status?${params}`, {
    baseUrl: SYNC_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return payload?.data ?? payload;
}

/**
 * Unlock the revenge report for an account. The server picks the source:
 * the tax import if it already covers the period (ready at once), otherwise a
 * one-time read of the exchange (queued — follow fetchRevengeStatus).
 * months: 1 | 2 | 3 | 'auto' (30 days, reading further back only if thin).
 */
export async function unlockRevengeReport({ accessToken, tradingAccountId, months = 'auto' } = {}) {
  const payload = await apiPost(
    '/sync/revenge/unlock',
    { tradingAccountId, months },
    { baseUrl: SYNC_API_BASE_URL, headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return payload?.data ?? payload;
}

/** Where a revenge report's data read stands — what the animation follows. */
export async function fetchRevengeStatus({ accessToken, tradingAccountId, signal } = {}) {
  const params = new URLSearchParams({ tradingAccountId });
  const payload = await apiGet(`/sync/revenge/status?${params}`, {
    baseUrl: SYNC_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return payload?.data ?? payload;
}
