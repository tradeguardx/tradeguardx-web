import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { istDayEnd, isLongSide, pnlAt, savedFrom, tradePaths } from './counterfactual';

/**
 * The counterfactual is the only number on a share card that does not come
 * from the ledger, and it is the headline on three of the four cards. These
 * tests are about the cases where it must say nothing at all.
 */

const TRADE = (over = {}) => ({
  tradeUid: 'u1',
  symbol: 'SOLUSDT',
  side: 'long',
  quantity: 40.34,
  entryPrice: 118.28,
  exitPrice: 120.28,
  openedAt: '2026-09-30T04:00:00Z',
  closedAt: '2026-09-30T08:00:00Z',
  pnl: 61496.54,
  ...over,
});

/** A flat run of candles, then a drop — enough rows to pass the sampler. */
function klines(from, to, prices) {
  return prices.map((p, i) => [from + i * ((to - from) / prices.length), `${p}`, `${p}`, `${p}`, `${p}`, '1', from + (i + 1) * ((to - from) / prices.length) - 1]);
}

beforeEach(() => {
  const open = Date.parse('2026-09-30T04:00:00Z');
  const end = Date.parse('2026-09-30T18:29:59Z');
  // Up through the trade, then a slide after the close.
  const rows = klines(open, end, [118.28, 119, 119.5, 120.28, 119, 116, 113, 110, 108, 112]);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => rows })));
});
afterEach(() => vi.unstubAllGlobals());

describe('units', () => {
  it('calibrates the model against the ledger', async () => {
    // Candles are Binance SPOT in USDT. The position was a leveraged perp and
    // on Shark it settles in RUPEES. The ratio between modelled and realised
    // absorbs leverage, fees and the quote-to-settlement rate at once.
    const p = await tradePaths(TRADE());
    expect(p).not.toBeNull();
    expect(p.P[p.P.length - 1]).toBe(61496.54);
    expect(p.scale).toBeGreaterThan(1);
  });

  it('still refuses a trade that genuinely closed where it opened', async () => {
    // A reported exit equal to the entry models a close of zero, so there is
    // nothing to calibrate against. The old fallback used a scale of 1 and
    // emitted raw USDT as though it were rupees — "₹210.57 saved" on a trade
    // the ledger says made ₹61,496.
    expect(await tradePaths(TRADE({ exitPrice: 118.28 }))).toBeNull();
  });

  it('calibrates from price history when the venue reports no exit', async () => {
    // Shark's CLOSED record has no exit price field at all, so the journal
    // stores null. Requiring one meant no Shark trade could ever produce a
    // counterfactual — the venue being unhelpful, not the trade being
    // unknowable. The price at the close is in the candles we already have.
    const p = await tradePaths(TRADE({ exitPrice: null }));
    expect(p).not.toBeNull();
    // Nothing the user reads comes from the estimate: the path still ends on
    // the ledger's figure.
    expect(p.P[p.P.length - 1]).toBe(61496.54);
  });

  it('refuses when neither the ledger nor the candles can calibrate it', async () => {
    // A flat price run gives a modelled close of zero either way.
    const flat = Array.from({ length: 10 }, (_, i) => [
      Date.parse('2026-09-30T04:00:00Z') + i * 3_600_000, '118.28', '118.28', '118.28', '118.28', '1',
      Date.parse('2026-09-30T04:00:00Z') + (i + 1) * 3_600_000 - 1,
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => flat })));
    expect(await tradePaths(TRADE({ exitPrice: null }))).toBeNull();
  });

  it('refuses when the ledger has no figure to calibrate against', async () => {
    expect(await tradePaths(TRADE({ pnl: null }))).toBeNull();
  });

  it('refuses when the two numbers disagree about the direction', async () => {
    // Modelled says the long made money, the ledger says it lost. One of them
    // is not describing this trade.
    expect(await tradePaths(TRADE({ pnl: -500 }))).toBeNull();
  });

  it('refuses an implausible ratio', async () => {
    // A quantity in contracts rather than units, a stale fill, the wrong
    // symbol — whatever it is, it is not going on a share card.
    expect(await tradePaths(TRADE({ pnl: 6e9 }))).toBeNull();
  });
});

describe('what it returns', () => {
  it('carries the trade it was priced for', async () => {
    const p = await tradePaths(TRADE());
    expect(p.tradeUid).toBe('u1');
    expect(savedFrom(p).tradeUid).toBe('u1');
  });

  it('joins the paths where the rule fired', async () => {
    const p = await tradePaths(TRADE());
    expect(p.A[0]).toBe(p.P[p.P.length - 1]);
  });

  it('joins them without leaving a step in either line', async () => {
    /*
     * The join used to be two assignments — `P[last] = realized` and
     * `A[0] = P[last]` — which snaps one point of each series and dumps the
     * whole calibration residual into the gap between that point and its
     * neighbour. The line had a vertical jump at exactly the moment the card
     * says "here is where my rule closed it".
     *
     * Measured against the series' own typical step, so the test says
     * something about the SHAPE rather than about these particular prices.
     */
    const p = await tradePaths(TRADE({ exitPrice: 120.28 }));
    const steps = (a) => a.slice(1).map((v, i) => Math.abs(v - a[i]));
    const typical = (a) => {
      const s = steps(a).sort((x, y) => x - y);
      return s[Math.floor(s.length / 2)] || 1;
    };

    const pSteps = steps(p.P);
    expect(pSteps[pSteps.length - 1]).toBeLessThan(typical(p.P) * 4);

    const aSteps = steps(p.A);
    expect(aSteps[0]).toBeLessThan(typical(p.A) * 4);
  });

  it('measures the low off the same shifted path it draws', async () => {
    // `saved` is `realized - worstAfter`, and the after-path is shifted to
    // meet the close. Leaving worstAfter unshifted made the figure and the
    // picture disagree by exactly that shift.
    const p = await tradePaths(TRADE());
    expect(p.worstAfter).toBeLessThanOrEqual(Math.min(...p.A));
  });

  it('says nothing when the price went the other way', () => {
    expect(savedFrom({ P: [0, 100], A: [100, 200], worstAfter: 150, endAfter: 200 })).toBeNull();
  });

  it('refuses a symbol with no price history', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400 })));
    expect(await tradePaths(TRADE())).toBeNull();
  });
});

describe('the day boundary', () => {
  it('ends the day at 18:29:59.999Z, which is IST midnight', () => {
    expect(new Date(istDayEnd(Date.parse('2026-09-30T06:00:00Z'))).toISOString()).toBe('2026-09-30T18:29:59.999Z');
  });

  it('knows a short from a long', () => {
    expect(isLongSide('SELL')).toBe(false);
    expect(isLongSide('short')).toBe(false);
    expect(isLongSide('BUY')).toBe(true);
    expect(pnlAt(100, 90, 2, false)).toBe(20);
  });
});
