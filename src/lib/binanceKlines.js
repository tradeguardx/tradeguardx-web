/**
 * Price history, from Binance's public spot klines.
 *
 * Free, keyless, and already the source behind the trade-replay chart — this
 * file is that chart's fetcher, lifted out so the share system can use the
 * same prices. Two implementations would mean the replay a user studies and
 * the "if you'd held" figure they post could disagree, which is the one
 * disagreement this product cannot have.
 *
 * It is the only way to answer the question the whole share system is built
 * on: what did the price do AFTER the guard closed the position. The ledger
 * cannot know that — nothing happened in the account after the close.
 */

// Venues quote the same asset half a dozen ways. Everything resolves to a
// USDT spot pair, which is what Binance lists.
const BINANCE_PAIRS = {
  BTCUSD: 'BTCUSDT', BTCUSDT: 'BTCUSDT',
  ETHUSD: 'ETHUSDT', ETHUSDT: 'ETHUSDT',
  BNBUSD: 'BNBUSDT', BNBUSDT: 'BNBUSDT',
  SOLUSD: 'SOLUSDT', SOLUSDT: 'SOLUSDT',
  XRPUSD: 'XRPUSDT', XRPUSDT: 'XRPUSDT',
  DOGEUSD: 'DOGEUSDT', DOGEUSDT: 'DOGEUSDT',
  ADAUSD: 'ADAUSDT', ADAUSDT: 'ADAUSDT',
  DOTUSD: 'DOTUSDT', DOTUSDT: 'DOTUSDT',
  MATICUSD: 'MATICUSDT', MATICUSDT: 'MATICUSDT',
  AVAXUSD: 'AVAXUSDT', AVAXUSDT: 'AVAXUSDT',
  LINKUSD: 'LINKUSDT', LINKUSDT: 'LINKUSDT',
  LTCUSD: 'LTCUSDT', LTCUSDT: 'LTCUSDT',
  UNIUSD: 'UNIUSDT', UNIUSDT: 'UNIUSDT',
  SHIBUSD: 'SHIBUSDT', SHIBUSDT: 'SHIBUSDT',
  PEPE: 'PEPEUSDT', PEPEUSD: 'PEPEUSDT',
  NEARUSD: 'NEARUSDT', NEARUSDT: 'NEARUSDT',
};

export function resolveBinancePair(symbol) {
  if (!symbol) return null;
  const upper = String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (BINANCE_PAIRS[upper]) return BINANCE_PAIRS[upper];
  if (!upper.endsWith('USDT') && !upper.endsWith('USD')) {
    if (BINANCE_PAIRS[`${upper}USDT`]) return BINANCE_PAIRS[`${upper}USDT`];
  }
  if (upper.endsWith('USD') && !upper.endsWith('USDT')) return `${upper}T`;
  return upper.endsWith('USDT') ? upper : `${upper}USDT`;
}

/**
 * Candles between two instants, paging through Binance's 1000-row limit.
 *
 * Throws rather than returning []: an empty array is a real answer (the pair
 * did not trade in that window) and callers treat it as one, so a network
 * failure that returned it would silently become "the price never moved".
 */
export async function fetchKlines(symbol, interval, startMs, endMs, { signal } = {}) {
  const out = [];
  let cursor = startMs;

  while (cursor < endMs) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&startTime=${cursor}&endTime=${endMs}&limit=1000`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;

    for (const k of rows) {
      out.push({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      });
    }
    cursor = rows[rows.length - 1][6] + 1; // closeTime + 1
    if (rows.length < 1000) break;
  }

  return out;
}

/**
 * The candle interval to use for a window, so a path is detailed enough to be
 * worth drawing without pulling thousands of rows for a month.
 */
export function intervalFor(spanMs) {
  if (spanMs <= 6 * 3_600_000) return '1m';
  if (spanMs <= 2 * 86_400_000) return '5m';
  if (spanMs <= 10 * 86_400_000) return '15m';
  if (spanMs <= 40 * 86_400_000) return '1h';
  return '4h';
}
