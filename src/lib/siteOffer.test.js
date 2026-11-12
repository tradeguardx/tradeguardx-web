import { describe, expect, it } from 'vitest';
import {
  offerApplies, offerHeadline, offerPriceLine, offerPrice, offerLabel, firstPeriodLabel, discountWording,
} from './siteOffer';
import { formatInr } from './activePromo';

/**
 * The words must match what the coupon does. A cycles=1 code discounts ONE
 * payment; a headline that reads like an ongoing price is a promise the
 * second invoice breaks.
 */

const ALL = ['monthly', 'quarterly', 'yearly'];
const base = { code: 'DIWALI30', discountPct: 30, cycles: 1, intervals: ALL, audience: 'in', headline: 'DIWALI OFFER', title: null, endsAt: Date.parse('2026-11-08T18:29:59Z') };

describe('offerHeadline', () => {
  it('first payment, any plan — cycles 1 on all three intervals', () => {
    expect(offerHeadline(base)).toBe('30% off your first payment — any plan');
  });
  it('first month — cycles 1, monthly only', () => {
    expect(offerHeadline({ ...base, intervals: ['monthly'] })).toBe('30% off your first month');
  });
  it('first 3 months — cycles 3, monthly only', () => {
    expect(offerHeadline({ ...base, cycles: 3, intervals: ['monthly'] })).toBe('30% off your first 3 months');
  });
  it('ongoing — cycles null', () => {
    expect(offerHeadline({ ...base, cycles: null })).toBe('30% off every payment — any plan');
    expect(offerHeadline({ ...base, cycles: null, intervals: ['monthly'] })).toBe('30% off every payment — monthly plan');
  });
  it('names two intervals when it covers two', () => {
    expect(offerHeadline({ ...base, intervals: ['monthly', 'yearly'] })).toBe('30% off your first payment — monthly and yearly plans');
  });
  it('says "half price" at 50%', () => {
    expect(offerHeadline({ ...base, discountPct: 50 })).toBe('Half price on your first payment — any plan');
  });
  it('uses an admin-written title when there is one', () => {
    expect(offerHeadline({ ...base, title: 'Light up your trading' })).toBe('Light up your trading');
  });
});

describe('the Diwali prices', () => {
  it('₹1,299 → ₹909, ₹3,299 → ₹2,309, ₹8,999 → ₹6,299', () => {
    expect(offerPrice(1299, 30)).toBe(909);
    expect(offerPrice(3299, 30)).toBe(2309);
    expect(offerPrice(8999, 30)).toBe(6299);
  });
  it('no price from no price', () => {
    expect(offerPrice(null, 30)).toBeNull();
    expect(offerPrice(0, 30)).toBeNull();
  });
});

describe('offerPriceLine', () => {
  it('"Pro from ₹909 for your first month" when monthly is covered once', () => {
    expect(offerPriceLine(base, { planName: 'Pro', monthly: 1299, format: formatInr })).toBe('Pro from ₹909 for your first month');
  });
  it('nothing when monthly is not covered (the "from" would not be true)', () => {
    expect(offerPriceLine({ ...base, intervals: ['yearly'] }, { monthly: 1299, format: formatInr })).toBeNull();
  });
  it('nothing before the price is known', () => {
    expect(offerPriceLine(base, { monthly: null, format: formatInr })).toBeNull();
  });
});

describe('offerApplies', () => {
  const before = Date.parse('2026-11-05T00:00:00Z');
  it('India-only offer: band in yes, band a/b no', () => {
    expect(offerApplies(base, 'in', before)).toBe(true);
    expect(offerApplies(base, 'a', before)).toBe(false);
    expect(offerApplies(base, 'b', before)).toBe(false);
  });
  it("audience 'all' reaches every band", () => {
    expect(offerApplies({ ...base, audience: 'all' }, 'b', before)).toBe(true);
  });
  it('not at or after endsAt', () => {
    expect(offerApplies(base, 'in', base.endsAt)).toBe(false);
  });
  it('not for no offer', () => {
    expect(offerApplies(null, 'in', before)).toBe(false);
  });
});

describe('small labels', () => {
  it('offerLabel', () => expect(offerLabel(base)).toBe('Diwali offer'));
  it('firstPeriodLabel', () => {
    expect(firstPeriodLabel(base, 'yearly')).toBe('first year');
    expect(firstPeriodLabel({ ...base, cycles: null }, 'yearly')).toBeNull();
  });
  it('discountWording', () => {
    expect(discountWording({ percentOff: 30, cycles: 1 })).toBe('30% off your first payment');
    expect(discountWording({ percentOff: 30, cycles: null })).toBe('30% off every payment');
  });
});

/* Flat ₹299 off every payment, all plans, India (owner, 12 Nov 2026). */
describe('a flat amount off', () => {
  const FLAT = { code: 'FLAT299', amountOff: 299, discountPct: null, cycles: null, intervals: ['monthly', 'quarterly', 'yearly'], audience: 'in', headline: 'FLAT ₹299 OFF', endsAt: Date.now() + 86400000 };

  it('takes the same rupees off every plan', () => {
    expect(offerPrice(1299, FLAT)).toBe(1000);
    expect(offerPrice(3299, FLAT)).toBe(3000);
    expect(offerPrice(8999, FLAT)).toBe(8700);
    expect(offerPrice(1299, { amountOff: 299, percentOff: null })).toBe(1000);
  });

  it('shows no price when the amount would take it to zero', () => {
    expect(offerPrice(299, FLAT)).toBeNull();
    expect(offerPrice(199, FLAT)).toBeNull();
  });

  it('still prices percentages, from an offer, a coupon or a number', () => {
    expect(offerPrice(1299, { discountPct: 30 })).toBe(909);
    expect(offerPrice(1299, { percentOff: 30, amountOff: null })).toBe(909);
    expect(offerPrice(1299, 30)).toBe(909);
  });

  it('words it in rupees', () => {
    expect(offerHeadline(FLAT)).toBe('Flat ₹299 off every payment — any plan');
    expect(discountWording(FLAT)).toBe('₹299 off every payment');
    expect(discountWording({ amountOff: 299, percentOff: null, cycles: 1 })).toBe('₹299 off your first payment');
    expect(offerPriceLine(FLAT, { monthly: 1299, format: formatInr })).toBe('Pro from ₹1,000/mo');
  });
});
