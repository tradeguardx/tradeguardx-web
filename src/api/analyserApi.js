import { apiGet, apiPost } from './httpClient';
import { TRADE_API_BASE_URL } from './config';

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

/** Timeframes the backend accepts (must match INTERVAL_MS in candles.ts). */
export const ANALYSER_INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

/** Fallback quick-picks, used only if the symbol endpoint is unreachable. */
export const ANALYSER_SYMBOLS = [
  { symbol: 'BTCUSDT', market: 'crypto' },
  { symbol: 'ETHUSDT', market: 'crypto' },
  { symbol: 'SOLUSDT', market: 'crypto' },
  { symbol: 'NSE:NIFTY', market: 'india' },
  { symbol: 'NSE:RELIANCE', market: 'india' },
];

/**
 * Symbol search across crypto, Indian equities and forex.
 *
 * Matching happens server-side: the full catalogue is ~9,200 symbols (~630KB)
 * once NSE/BSE is included, which is far too much to ship to the browser just to
 * filter locally. Each query returns a few KB.
 */
export async function fetchAnalyserSymbols({ accessToken, q = '', limit = 50, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');

  const params = new URLSearchParams({ limit: String(limit) });
  if (q) params.set('q', q);

  const payload = await apiGet(`/analyser/symbols?${params.toString()}`, {
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return unwrap(payload)?.symbols ?? [];
}

/**
 * Candles for the chart. The chat endpoint reads the same server-side source,
 * so the levels the AI returns line up with the bars on screen.
 */
export async function fetchAnalyserCandles({ accessToken, symbol, interval = '1h', limit, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!symbol) throw new Error('Missing symbol');

  const params = new URLSearchParams({ symbol, interval });
  if (limit) params.set('limit', String(limit));

  const payload = await apiGet(`/analyser/candles?${params.toString()}`, {
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return unwrap(payload);
}

/**
 * Ask the analyst. When `sessionId` points at a COMPLETED "Analyze with AI"
 * session, the backend grounds its answer in that SAME validated result
 * instead of a separate re-analysis — so chat and chart never disagree.
 * Without one, falls back to the standalone deterministic-engine tools.
 * Returns `{ reply, drawings }` — `drawings` is only ever populated by the
 * fallback path's tools, never invented from the model's prose.
 */
export async function sendAnalyserChat({ accessToken, symbol, interval = '1h', messages, sessionId, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!symbol) throw new Error('Missing symbol');

  const payload = await apiPost(
    '/analyser/chat',
    { symbol, interval, messages, sessionId },
    {
      baseUrl: TRADE_API_BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );
  return unwrap(payload);
}

/**
 * Timeframes offered for the multi-timeframe "Analyze with AI" vision
 * pipeline — a deliberate subset of ANALYSER_INTERVALS (no 1m: too much
 * captured noise for a vision read, and it would only extend an already
 * multi-timeframe capture+vision run). 1d = macro structure down to 5m =
 * recent price action, top-down.
 */
export const VISION_ANALYSIS_TIMEFRAMES = ['1d', '4h', '1h', '15m', '5m'];

/**
 * Starts an async "Analyze with AI" session — returns immediately with a
 * sessionId. The real work (vision + reasoning + validation) routinely takes
 * 20-40s+ across several timeframes, well past what a single HTTP request
 * can hold open, so the caller must poll `getVisionAnalysisStatus`.
 *
 * `screenshots` is `{ [timeframe]: { imageBase64, mimeType } }`, produced by
 * capturing the chart itself (see captureChartScreenshots.js) — never
 * generated or guessed client-side.
 */
export async function startVisionAnalysis({ accessToken, symbol, screenshots, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!symbol) throw new Error('Missing symbol');
  if (!screenshots || Object.keys(screenshots).length === 0) throw new Error('Missing screenshots');

  const payload = await apiPost(
    '/analyser/vision-analysis/start',
    { symbol, screenshots },
    {
      baseUrl: TRADE_API_BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );
  return unwrap(payload);
}

/** Poll target. Returns `{ status, events, result, errorMessage }`. */
export async function getVisionAnalysisStatus({ accessToken, sessionId, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!sessionId) throw new Error('Missing sessionId');

  const payload = await apiGet(`/analyser/vision-analysis/${encodeURIComponent(sessionId)}/status`, {
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return unwrap(payload);
}
