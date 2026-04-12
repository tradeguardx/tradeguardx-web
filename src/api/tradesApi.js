import { apiGet, apiPost } from './httpClient';
import { TRADE_API_BASE_URL } from './config';

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

function hasClosedAt(trade) {
  if (!trade?.closedAt) return false;
  const d = new Date(trade.closedAt);
  return !Number.isNaN(d.getTime());
}

function normalizeTradeLifecycle(trade) {
  if (!trade || typeof trade !== 'object') return trade;
  const rawStatus = String(trade.status || '').trim().toUpperCase();
  const inferredStatus = hasClosedAt(trade) ? 'CLOSED' : (rawStatus || 'OPEN');
  return {
    ...trade,
    status: inferredStatus,
  };
}

function tradeTimeMs(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function floorToMinuteIso(v) {
  const ms = tradeTimeMs(v);
  if (ms == null) return '';
  const d = new Date(ms);
  d.setSeconds(0, 0);
  return d.toISOString();
}

function toMergeNumber(v, dp = 4) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(dp);
}

function tradeSignatureKey(t) {
  if (!t || typeof t !== 'object') return '';
  const symbol = String(t.symbol || '').toUpperCase();
  const side = String(t.side || '').toUpperCase();
  const openedAt = String(t.openedAt || '');
  const qty = toMergeNumber(t.quantity ?? t.volume, 4);
  const entry = toMergeNumber(t.entryPrice, 4);
  if (!symbol || !side || !openedAt) return '';
  // Exclude closedAt to merge OPEN->CLOSED lifecycle versions of same trade.
  return `sig:${symbol}|${side}|${openedAt}|${qty}|${entry}`;
}

function lifecycleDedupeKey(t) {
  if (!t || typeof t !== 'object') return '';
  const symbol = String(t.symbol || '').toUpperCase();
  const side = String(t.side || '').toUpperCase();
  if (!symbol || !side) return '';
  const openedMinute = floorToMinuteIso(t.openedAt);
  const closedMinute = floorToMinuteIso(t.closedAt);
  const qty = toMergeNumber(t.quantity ?? t.volume, 3);
  const entry = toMergeNumber(t.entryPrice, 3);
  const exit = toMergeNumber(t.exitPrice ?? t.currentPrice, 3);
  const pnl = toMergeNumber(t.pnl, 2);
  return `life:${symbol}|${side}|${openedMinute}|${closedMinute}|${qty}|${entry}|${exit}|${pnl}`;
}

function lifecycleBridgeKey(t) {
  if (!t || typeof t !== 'object') return '';
  const symbol = String(t.symbol || '').toUpperCase();
  const side = String(t.side || '').toUpperCase();
  if (!symbol || !side) return '';
  const openedMinute = floorToMinuteIso(t.openedAt);
  const qty = toMergeNumber(t.quantity ?? t.volume, 3);
  const entry = toMergeNumber(t.entryPrice, 3);
  if (!openedMinute) return '';
  // Intentionally ignore close-specific fields to bridge OPEN/CLOSED versions.
  return `bridge:${symbol}|${side}|${openedMinute}|${qty}|${entry}`;
}

function mergeTradeRecords(a, b) {
  const left = normalizeTradeLifecycle(a);
  const right = normalizeTradeLifecycle(b);
  if (!left) return right;
  if (!right) return left;
  const leftClosed = String(left.status || '').toUpperCase() === 'CLOSED' || hasClosedAt(left);
  const rightClosed = String(right.status || '').toUpperCase() === 'CLOSED' || hasClosedAt(right);
  const preferred = (!leftClosed && rightClosed) ? right : left;
  const secondary = preferred === left ? right : left;
  return {
    ...preferred,
    // Preserve linking fields if one source misses them.
    tradeUid: preferred.tradeUid || secondary.tradeUid || null,
    clientTradeId: preferred.clientTradeId || secondary.clientTradeId || null,
    id: preferred.id || secondary.id || null,
    // Keep richer nested projection data if present in either record.
    aiShortInsight: preferred.aiShortInsight || secondary.aiShortInsight,
    mediaSummary: preferred.mediaSummary || secondary.mediaSummary,
    status: (leftClosed || rightClosed) ? 'CLOSED' : (preferred.status || secondary.status || 'OPEN'),
  };
}

/**
 * GET /trades?tradingAccountId=&limit= (trade-service; Bearer Supabase or extension token).
 */
export async function fetchTrades({ accessToken, tradingAccountId, limit = 100, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  const q = new URLSearchParams();
  q.set('tradingAccountId', tradingAccountId);
  if (limit) q.set('limit', String(limit));
  const payload = await apiGet(`/trades?${q.toString()}`, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.trades ?? [];
}

/**
 * GET /journal/trades?tradingAccountId=&limit=
 * New journal endpoint with richer lifecycle projection.
 */
export async function fetchJournalTrades({ accessToken, tradingAccountId, limit = 100, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  const q = new URLSearchParams();
  q.set('tradingAccountId', tradingAccountId);
  if (limit) q.set('limit', String(limit));
  const payload = await apiGet(`/journal/trades?${q.toString()}`, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.trades ?? [];
}

function tradeMergeKey(t) {
  if (!t || typeof t !== 'object') return '';
  const sig = tradeSignatureKey(t);
  if (sig) return sig;
  if (t.tradeUid) return `uid:${t.tradeUid}`;
  if (t.clientTradeId) return `cid:${t.clientTradeId}`;
  if (t.id) return `id:${t.id}`;
  return '';
}

/**
 * Merge journal projection + raw trades to avoid missing freshly-synced closes.
 * Journal rows win on conflicts because they usually include richer derived fields.
 */
export async function fetchUnifiedTrades({ accessToken, tradingAccountId, limit = 100, signal } = {}) {
  const [journalRows, rawRows] = await Promise.all([
    fetchJournalTrades({ accessToken, tradingAccountId, limit, signal }).catch(() => []),
    fetchTrades({ accessToken, tradingAccountId, limit, signal }).catch(() => []),
  ]);

  const byKey = new Map();
  // Journal first (preferred), then fill gaps with raw rows.
  for (const row of [...journalRows, ...rawRows]) {
    const normalized = normalizeTradeLifecycle(row);
    if (!normalized) continue;
    const key = tradeMergeKey(normalized);
    if (!key) continue;
    byKey.set(key, mergeTradeRecords(byKey.get(key), normalized));
  }

  // Second-pass dedupe: collapse near-identical lifecycle duplicates
  // where ids differ across journal/raw sources.
  const byLifecycle = new Map();
  for (const row of byKey.values()) {
    const lifeKey = lifecycleDedupeKey(row) || tradeMergeKey(row);
    byLifecycle.set(lifeKey, mergeTradeRecords(byLifecycle.get(lifeKey), row));
  }

  // Third-pass bridge: merge OPEN and CLOSED rows for the same lifecycle when
  // ids differ across sources (common during extension transition states).
  const byBridge = new Map();
  for (const row of byLifecycle.values()) {
    const bridgeKey = lifecycleBridgeKey(row) || lifecycleDedupeKey(row) || tradeMergeKey(row);
    byBridge.set(bridgeKey, mergeTradeRecords(byBridge.get(bridgeKey), row));
  }
  return [...byBridge.values()];
}

export async function fetchJournalInsights({ accessToken, tradingAccountId, tradeUid, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  if (!tradeUid) throw new Error('Missing tradeUid');
  const q = new URLSearchParams();
  q.set('tradingAccountId', tradingAccountId);
  q.set('tradeUid', tradeUid);
  const payload = await apiGet(`/journal/insights?${q.toString()}`, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.insights ?? [];
}

export async function fetchJournalEvents({ accessToken, tradingAccountId, tradeUid, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  if (!tradeUid) throw new Error('Missing tradeUid');
  const q = new URLSearchParams();
  q.set('tradingAccountId', tradingAccountId);
  q.set('tradeUid', tradeUid);
  const payload = await apiGet(`/journal/events?${q.toString()}`, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.events ?? [];
}

/**
 * POST /journal/narrative?tradingAccountId=&tradeUid=
 * Generates (or returns cached) LLM behavior narrative for one trade. Body: { forceRefresh?: boolean }
 */
export async function requestTradeBehaviorNarrative({
  accessToken,
  tradingAccountId,
  tradeUid,
  forceRefresh = false,
  signal,
} = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  if (!tradeUid) throw new Error('Missing tradeUid');
  const q = new URLSearchParams();
  q.set('tradingAccountId', tradingAccountId);
  q.set('tradeUid', tradeUid);
  const payload = await apiPost(
    `/journal/narrative?${q.toString()}`,
    forceRefresh ? { forceRefresh: true } : {},
    {
      signal,
      baseUrl: TRADE_API_BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return unwrap(payload);
}

export async function fetchBehaviorTags({ accessToken, tradingAccountId, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  const q = new URLSearchParams();
  q.set('tradingAccountId', tradingAccountId);
  const payload = await apiGet(`/journal/behavior-tags?${q.toString()}`, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}

export async function fetchJournalStats({ accessToken, tradingAccountId, days = 90, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  const q = new URLSearchParams();
  q.set('tradingAccountId', tradingAccountId);
  q.set('days', String(days));
  const payload = await apiGet(`/journal/stats?${q.toString()}`, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}

export async function fetchJournalMedia({ accessToken, tradingAccountId, tradeUid, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  if (!tradeUid) throw new Error('Missing tradeUid');
  const q = new URLSearchParams();
  q.set('tradingAccountId', tradingAccountId);
  q.set('tradeUid', tradeUid);
  const payload = await apiGet(`/journal/media?${q.toString()}`, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.media ?? [];
}
