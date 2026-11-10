import { instrumentOf } from './labels';
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
  // Exness's weekend gold contract; Binance lists gold as a perpetual.
  XAUUSD247: 'XAUUSDT',
};

export function resolveBinancePair(symbol) {
  if (!symbol) return null;
  // CoinDCX futures carry a "B-" prefix and a margin currency: B-XRP_USDT@INR.
  const bare = String(instrumentOf(symbol)).replace(/^B-/i, '').replace(/@.*$/, '');
  const upper = bare.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
  // Gold, oil-linked tokens and most new coins (XAUUSDT, AINUSDT…) are listed
  // only as Binance perpetuals, so spot answers 400 for them. Remember which
  // market had the pair so paging and later intervals go straight there.
  const market = futuresPairs.has(symbol) ? 'futures' : 'spot';
  try {
    return await pageKlines(market, symbol, interval, startMs, endMs, signal);
  } catch (e) {
    if (market !== 'spot' || e?.status !== 400) throw e;
  }
  try {
    const rows = await pageKlines('futures', symbol, interval, startMs, endMs, signal);
    futuresPairs.add(symbol);
    return rows;
  } catch (e) {
    if (e?.status === 400) throw new ChartUnavailableError(symbol);
    throw e;
  }
}

const futuresPairs = new Set();

/** Neither Binance market lists the pair — indices, oil, options. Not a retryable failure. */
export class ChartUnavailableError extends Error {
  constructor(symbol) {
    super(`No price history for ${symbol}`);
    this.name = 'ChartUnavailableError';
  }
}

const KLINE_URLS = {
  spot: 'https://api.binance.com/api/v3/klines',
  futures: 'https://fapi.binance.com/fapi/v1/klines',
};

async function pageKlines(market, symbol, interval, startMs, endMs, signal) {
  const out = [];
  let cursor = startMs;

  while (cursor < endMs) {
    const url = `${KLINE_URLS[market]}?symbol=${encodeURIComponent(symbol)}&interval=${interval}&startTime=${cursor}&endTime=${endMs}&limit=1000`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw Object.assign(new Error(`Binance ${res.status}`), { status: res.status });
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

/**
 * Candles from Delta Exchange itself, for trades placed there.
 *
 * Delta lists products Binance never will — options (C-BTC-76200-071126),
 * gold (XAUTUSD), new perps — and keeps their history after expiry. Its own
 * prices are also the ones the user's fills happened at, so a Delta trade's
 * entry and exit markers sit on its candles rather than near them.
 *
 * Delta returns at most 4000 rows, newest first, so this pages backwards.
 */
export async function fetchDeltaCandles(symbol, interval, startMs, endMs, { signal } = {}) {
  const start = Math.floor(startMs / 1000);
  const out = [];
  let end = Math.floor(endMs / 1000);

  for (let page = 0; page < 10 && end > start; page++) {
    const url = `https://api.india.delta.exchange/v2/history/candles?resolution=${interval}&symbol=${encodeURIComponent(symbol)}&start=${start}&end=${end}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Delta ${res.status}`);
    const rows = (await res.json())?.result ?? [];
    if (!rows.length) break;

    for (const k of rows) {
      out.push({ time: k.time, open: +k.open, high: +k.high, low: +k.low, close: +k.close, volume: +(k.volume ?? 0) });
    }
    const oldest = Math.min(...rows.map((k) => k.time));
    if (rows.length < 4000) break;
    end = oldest - 1;
  }

  out.sort((a, b) => a.time - b.time);
  return out.filter((c, i) => i === 0 || c.time !== out[i - 1].time);
}

/**
 * The replay chart's price history for a trade: the venue's own candles where
 * the venue publishes them, Binance otherwise.
 *
 * Returns { candles, provider, pair }. A Delta trade whose product Delta has
 * no history for still gets Binance's chart of the same coin if one exists.
 */
export async function fetchTradeCandles(trade, interval, startMs, endMs, { signal } = {}) {
  const pair = resolveBinancePair(trade?.symbol);
  if (trade?.source === 'delta' && trade?.symbol) {
    try {
      const candles = await fetchDeltaCandles(instrumentOf(trade.symbol), interval, startMs, endMs, { signal });
      if (candles.length) return { candles, provider: 'Delta Exchange', pair: instrumentOf(trade.symbol) };
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
    }
  }
  const candles = await fetchKlines(pair, interval, startMs, endMs, { signal });
  return { candles, provider: futuresPairs.has(pair) ? 'Binance Futures' : 'Binance', pair };
}
