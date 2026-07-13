import { apiGet, apiPost } from './httpClient';

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

/**
 * GET /user/breaches?unread=true&limit=50&tradingAccountId=...
 * Returns an array of breach events for the current user.
 */
export async function fetchBreaches({
  accessToken,
  unreadOnly = false,
  limit = 50,
  tradingAccountId,
  tradeUid,
  signal,
} = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const params = new URLSearchParams();
  if (unreadOnly) params.set('unread', 'true');
  if (limit) params.set('limit', String(limit));
  if (tradingAccountId) params.set('tradingAccountId', tradingAccountId);
  if (tradeUid) params.set('tradeUid', tradeUid);
  const qs = params.toString();
  const payload = await apiGet(`/breaches${qs ? `?${qs}` : ''}`, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return Array.isArray(data?.breaches) ? data.breaches : [];
}

/**
 * POST /user/breaches/acknowledge
 * Body: { ids: string[] } | { all: true }
 */
export async function acknowledgeBreaches({ accessToken, ids, all = false, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const body = all ? { all: true } : { ids };
  const payload = await apiPost('/breaches/acknowledge', body, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}
