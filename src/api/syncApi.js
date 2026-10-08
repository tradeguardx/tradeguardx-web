import { apiPost } from './httpClient';
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
