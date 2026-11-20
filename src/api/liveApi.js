import { apiGet } from './httpClient';

/**
 * GET /user/live?accounts=<id>,<id>: the engine's live snapshots from
 * ElastiCache (user-service getLive). Returns { serverTime, cache, accounts }.
 */
export async function fetchLive({ accessToken, accountIds, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const ids = [...new Set((accountIds ?? []).filter(Boolean))].slice(0, 20);
  const payload = await apiGet(`/live?accounts=${encodeURIComponent(ids.join(','))}`, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = payload?.success && payload.data !== undefined ? payload.data : payload;
  return { serverTime: data?.serverTime ?? null, cache: data?.cache ?? null, accounts: Array.isArray(data?.accounts) ? data.accounts : [] };
}

const PENDING_LOCK_MAX_WAIT_MS = 24 * 3_600_000;

/**
 * A cache snapshot as the row shape the app already reads (useLiveAccount's
 * normalise accepts camelCase), so nothing downstream changes. `hb` is the
 * engine's last write (change or 10 s heartbeat): proof the feed is alive.
 */
export function rowFromLive(s) {
  if (!s || !s.accountId) return null;
  const pending = s.pendingLock && s.pendingLock.requestedAt
    ? {
        hours: Number(s.pendingLock.hours),
        requestedAt: s.pendingLock.requestedAt,
        symbols: Array.isArray(s.pendingLock.symbols) ? s.pendingLock.symbols : [],
        startsBy: new Date(new Date(s.pendingLock.requestedAt).getTime() + PENDING_LOCK_MAX_WAIT_MS).toISOString(),
      }
    : null;
  return {
    id: s.accountId,
    dailyPnl: s.dailyPnl,
    openPnl: s.openPnl ?? {},
    dailyStartingEquity: s.dailyStartingEquity,
    currentEquity: s.equity,
    equityUpdatedAt: s.ts ? new Date(s.ts).toISOString() : null,
    tradeCountToday: s.tradeCountToday,
    consecutiveLosses: s.consecutiveLosses,
    cooldownUntil: s.cooldownUntil ?? null,
    cooldownReason: s.lockReason ?? null,
    pendingLock: s.source === 'db' ? undefined : pending,
    liveSource: s.source ?? 'cache',
    liveHb: s.hb ?? null,
    livePositions: Array.isArray(s.positions) ? s.positions : null,
  };
}
