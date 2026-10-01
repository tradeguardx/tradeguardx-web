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
 * The restriction was not wrong, only misapplied: a site-wide promo IS
 * advertised against the monthly price, so it has to stay monthly-only. A
 * referral code has no such tie.
 */

vi.mock('../lib/referralCode', () => ({ getStoredReferralCode: vi.fn() }));
vi.mock('../lib/promoLink', () => ({ getLinkPromoCode: vi.fn(), captureLinkPromoFromUrl: vi.fn() }));
vi.mock('../lib/activePromo', () => ({ getActivePromo: vi.fn(), discountedPrice: vi.fn() }));

const { getStoredReferralCode } = await import('../lib/referralCode');
const { getLinkPromoCode } = await import('../lib/promoLink');
const { getActivePromo } = await import('../lib/activePromo');
const { checkoutCouponCode } = await import('./PricingPage');

const none = () => {
  getStoredReferralCode.mockReturnValue(null);
  getLinkPromoCode.mockReturnValue(null);
  getActivePromo.mockReturnValue(null);
};

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
    getActivePromo.mockReturnValue({ code: 'SITEPROMO' });
    expect(checkoutCouponCode({ interval: 'yearly', multiInterval: true })).toBe('PRSH2K');
  });
});

describe('promos stay monthly-only', () => {
  it('sends a promo-link code on monthly', () => {
    none();
    getLinkPromoCode.mockReturnValue('LINKPROMO');
    expect(checkoutCouponCode({ interval: 'monthly', multiInterval: true })).toBe('LINKPROMO');
  });

  it.each(['quarterly', 'yearly'])('withholds a promo on %s', (interval) => {
    // activePromo.discountedPrice takes a MONTHLY figure, so the banner's
    // promise is only true on monthly. Applying it elsewhere would advertise
    // a discount the checkout does not give.
    none();
    getLinkPromoCode.mockReturnValue('LINKPROMO');
    getActivePromo.mockReturnValue({ code: 'SITEPROMO' });
    expect(checkoutCouponCode({ interval, multiInterval: true })).toBeUndefined();
  });

  it('falls back to the site-wide promo when there is no link code', () => {
    none();
    getActivePromo.mockReturnValue({ code: 'SITEPROMO' });
    expect(checkoutCouponCode({ interval: 'monthly', multiInterval: true })).toBe('SITEPROMO');
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
