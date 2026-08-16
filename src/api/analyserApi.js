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
 * Ask the analyst. Returns `{ reply, drawings }` — `drawings` come from the
 * deterministic structure engine (never from the model's prose), so they can be
 * plotted verbatim.
 */
export async function sendAnalyserChat({ accessToken, symbol, interval = '1h', messages, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!symbol) throw new Error('Missing symbol');

  const payload = await apiPost(
    '/analyser/chat',
    { symbol, interval, messages },
    {
      baseUrl: TRADE_API_BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );
  return unwrap(payload);
}
