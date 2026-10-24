import { describe, expect, it } from 'vitest';
import { BAND_A_COUNTRIES, bandForCountry, formatMoney, planForBand } from './priceBands';

const PLAN = {
  slug: 'pro',
  priceMonthly: 1299,
  intervals: [
    { interval: 'monthly', price: 1299, perMonth: 1299, savingsPct: 0 },
    { interval: 'quarterly', price: 3299, perMonth: 1100, savingsPct: 15 },
    { interval: 'yearly', price: 8999, perMonth: 750, savingsPct: 42 },
  ],
  bands: {
    a: { currency: 'USD', intervals: [
      { interval: 'monthly', price: 29, perMonth: 29, savingsPct: 0 },
      { interval: 'quarterly', price: 75, perMonth: 25, savingsPct: 14 },
      { interval: 'yearly', price: 249, perMonth: 20.75, savingsPct: 28 },
    ] },
  },
};

describe('priceBands', () => {
  it('matches the server: India, 48 Band A countries, Band B for the rest, unknown = A', () => {
    expect(BAND_A_COUNTRIES.size).toBe(48);
    expect(bandForCountry('IN')).toBe('in');
    expect(bandForCountry('us')).toBe('a');
    expect(bandForCountry('VN')).toBe('b');
    expect(bandForCountry(null)).toBe('a');
  });

  it('formats rupees Indian-style and dollars with cents only when needed', () => {
    expect(formatMoney(124900, 'INR')).toBe('₹1,24,900');
    expect(formatMoney(29, 'USD')).toBe('$29');
    expect(formatMoney(20.75, 'USD')).toBe('$20.75');
    expect(formatMoney(0, 'USD')).toBe('$0');
  });

  it('re-prices a plan for a band, from the API or the built-in table', () => {
    expect(planForBand(PLAN, 'in')).toMatchObject({ currency: 'INR', priceMonthly: 1299 });
    const a = planForBand(PLAN, 'a');
    expect(a.currency).toBe('USD');
    expect(a.priceMonthly).toBe(29);
    expect(a.intervals.map((i) => i.price)).toEqual([29, 75, 249]);
    // No "b" in the API response: the table fills in.
    const b = planForBand(PLAN, 'b');
    expect(b.intervals.map((i) => [i.price, i.perMonth, i.savingsPct])).toEqual([[15, 15, 0], [39, 13, 13], [129, 10.75, 28]]);
  });
});
