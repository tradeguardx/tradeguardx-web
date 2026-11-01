import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Which code gets sent to checkout, per billing interval.
 *
 * This existed as a one-line ternary and was wrong in a way nothing could
 * surface:
 *
 *   couponCode: plan.intervals.length > 1 && interval !== 'monthly'
 *     ? undefined
 *     : checkoutCouponCode()
 *
 * On any interval but monthly the referral code was dropped, so no
 * metadata.referral_code reached Dodo and no attribution was ever recorded.
 * The referrer saw a signup, the referee paid, and nothing happened — with no
 * error anywhere. And because the voucher is tiered BY the plan bought, the
 * two tiers worth most (quarterly ₹400, yearly ₹1,000) were exactly the ones
 * that could never be paid.
 *
 * The restriction was not wrong, only misapplied: a promo-link code IS
 * advertised against the monthly price, so it has to stay monthly-only. A
 * referral code has no such tie, and the site offer (admin panel, via
 * payments-service) names its own intervals.
 */

vi.mock('../lib/referralCode', () => ({ getStoredReferralCode: vi.fn() }));
vi.mock('../lib/promoLink', () => ({ getLinkPromoCode: vi.fn(), captureLinkPromoFromUrl: vi.fn() }));

const { getStoredReferralCode } = await import('../lib/referralCode');
const { getLinkPromoCode } = await import('../lib/promoLink');
const { checkoutCouponCode } = await import('./PricingPage');

const none = () => {
  getStoredReferralCode.mockReturnValue(null);
  getLinkPromoCode.mockReturnValue(null);
};

const OFFER = { code: 'DIWALI30', intervals: ['monthly', 'quarterly', 'yearly'] };

afterEach(() => vi.clearAllMocks());

describe('a referral code rides on every interval', () => {
  it.each(['monthly', 'quarterly', 'yearly'])('is sent for %s', (interval) => {
    none();
    getStoredReferralCode.mockReturnValue('PRSH2K');
    expect(checkoutCouponCode({ interval, multiInterval: true })).toBe('PRSH2K');
  });

  it('is sent on a single-interval plan too', () => {
    none();
    getStoredReferralCode.mockReturnValue('PRSH2K');
    expect(checkoutCouponCode({ interval: 'monthly', multiInterval: false })).toBe('PRSH2K');
  });

  it('wins over both promo sources', () => {
    // Referral first: it is the only one of the three that owes somebody money.
    getStoredReferralCode.mockReturnValue('PRSH2K');
    getLinkPromoCode.mockReturnValue('LINKPROMO');
    expect(checkoutCouponCode({ interval: 'yearly', multiInterval: true, offer: OFFER })).toBe('PRSH2K');
  });
});

describe('a promo-link code stays monthly-only', () => {
  it('sends a promo-link code on monthly', () => {
    none();
    getLinkPromoCode.mockReturnValue('LINKPROMO');
    expect(checkoutCouponCode({ interval: 'monthly', multiInterval: true, offer: OFFER })).toBe('LINKPROMO');
  });

  it.each(['quarterly', 'yearly'])('withholds a promo-link code on %s', (interval) => {
    none();
    getLinkPromoCode.mockReturnValue('LINKPROMO');
    expect(checkoutCouponCode({ interval, multiInterval: true })).toBeUndefined();
  });

  it.each(['quarterly', 'yearly'])('lets the offer cover %s where the link code does not', (interval) => {
    // What the server does when no code is sent; sending it keeps the two in step.
    none();
    getLinkPromoCode.mockReturnValue('LINKPROMO');
    expect(checkoutCouponCode({ interval, multiInterval: true, offer: OFFER })).toBe('DIWALI30');
  });
});

describe('the site offer follows its own intervals', () => {
  it.each(['monthly', 'quarterly', 'yearly'])('is sent on %s when it covers it', (interval) => {
    none();
    expect(checkoutCouponCode({ interval, multiInterval: true, offer: OFFER })).toBe('DIWALI30');
  });

  it.each(['quarterly', 'yearly'])('is not sent on %s for a monthly-only offer', (interval) => {
    none();
    const offer = { code: 'MONTH20', intervals: ['monthly'] };
    expect(checkoutCouponCode({ interval, multiInterval: true, offer })).toBeUndefined();
  });

  it('sends nothing while the offer is unloaded (null)', () => {
    none();
    expect(checkoutCouponCode({ interval: 'monthly', multiInterval: true, offer: null })).toBeUndefined();
  });
});

describe('nothing to send', () => {
  it('returns undefined rather than an empty string', () => {
    // An empty string would be passed to Dodo as a discount_code and is a
    // different thing from omitting the field.
    none();
    expect(checkoutCouponCode({ interval: 'monthly', multiInterval: true })).toBeUndefined();
  });
});
