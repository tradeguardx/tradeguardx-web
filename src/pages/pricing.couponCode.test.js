import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Which code the pricing page sends to checkout, per billing interval: only
 * the site offer it shows, where the offer covers that interval. Saved
 * referral / promo-link codes used to ride along unseen; since 21 Nov 2026 a
 * code is typed and applied by the buyer (setup / Plan & billing coupon box,
 * or Dodo's payment page). Referral attribution is kept server-side by the
 * signup bind (payments boundReferralCode).
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

describe('a code saved from a link is never sent unseen (owner, 21 Nov 2026)', () => {
  it.each(['monthly', 'quarterly', 'yearly'])('sends no saved referral on %s', (interval) => {
    none();
    getStoredReferralCode.mockReturnValue('PRSH2K');
    expect(checkoutCouponCode({ interval, multiInterval: true })).toBeUndefined();
  });

  it('sends no saved promo-link code (a dead one failed checkout: PRODUCTHUNT)', () => {
    none();
    getLinkPromoCode.mockReturnValue('PRODUCTHUNT');
    expect(checkoutCouponCode({ interval: 'monthly', multiInterval: true })).toBeUndefined();
  });

  it('sends the offer the page shows, even with a saved code', () => {
    getStoredReferralCode.mockReturnValue('PRSH2K');
    getLinkPromoCode.mockReturnValue('LINKPROMO');
    expect(checkoutCouponCode({ interval: 'yearly', multiInterval: true, offer: OFFER })).toBe('DIWALI30');
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
