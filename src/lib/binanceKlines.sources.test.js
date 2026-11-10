import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartUnavailableError, fetchKlines, fetchTradeCandles, resolveBinancePair } from './binanceKlines';

const kline = (t) => [t, '1', '2', '0.5', '1.5', '10', t + 59_999];

afterEach(() => vi.unstubAllGlobals());

function stubFetch(handler) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    calls.push(url);
    const [status, body] = handler(url);
    return { ok: status === 200, status, json: async () => body };
  }));
  return calls;
}

describe('replay chart price sources', () => {
  it('falls back to Binance futures for pairs spot does not list (gold)', async () => {
    const calls = stubFetch((u) => (u.includes('fapi.binance.com') ? [200, [kline(60_000)]] : [400, {}]));
    const out = await fetchKlines('XAUUSDT', '5m', 0, 120_000);
    expect(out).toHaveLength(1);
    expect(calls[0]).toContain('api.binance.com');
    expect(calls[1]).toContain('fapi.binance.com');
  });

  it('says the chart is unavailable, not "Binance 400", when neither market lists it', async () => {
    stubFetch(() => [400, {}]);
    await expect(fetchKlines('US500USDT', '5m', 0, 120_000)).rejects.toBeInstanceOf(ChartUnavailableError);
  });

  it("charts a Delta option from Delta's own candles, oldest first", async () => {
    const calls = stubFetch(() => [200, { result: [{ time: 300, open: 2, high: 3, low: 1, close: 2, volume: 5 }, { time: 0, open: 1, high: 2, low: 1, close: 2, volume: 1 }] }]);
    const out = await fetchTradeCandles({ source: 'delta', symbol: 'C-BTC-76200-071126' }, '5m', 0, 600_000);
    expect(calls[0]).toContain('api.india.delta.exchange/v2/history/candles?resolution=5m&symbol=C-BTC-76200-071126');
    expect(out.provider).toBe('Delta Exchange');
    expect(out.candles.map((c) => c.time)).toEqual([0, 300]);
  });

  it('uses Binance for a Delta perp Delta has no history for', async () => {
    stubFetch((u) => (u.includes('delta.exchange') ? [200, { result: [] }] : [200, [kline(60_000)]]));
    const out = await fetchTradeCandles({ source: 'delta', symbol: 'BTCUSD' }, '5m', 0, 120_000);
    expect(out).toMatchObject({ provider: 'Binance', pair: 'BTCUSDT' });
  });

  it('reads CoinDCX futures symbols', () => {
    expect(resolveBinancePair('B-XRP_USDT@INR')).toBe('XRPUSDT');
    expect(resolveBinancePair('B-BTC_USDT')).toBe('BTCUSDT');
  });
});
