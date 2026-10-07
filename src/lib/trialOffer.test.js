import { describe, expect, it } from 'vitest';
import { trialDaysOnOffer, trialOfferLine, firstChargeDate } from './trialOffer';

describe('trialDaysOnOffer', () => {
  it('offers the full window to someone who has not started', () => {
    expect(trialDaysOnOffer({ needsMandate: true })).toBe(7);
  });

  it('carries the remaining days of a no-card trial', () => {
    expect(trialDaysOnOffer({ isTrial: true, trialAutoRenews: false, trialDaysLeft: 3 })).toBe(3);
  });

  it('never offers more than the full window', () => {
    expect(trialDaysOnOffer({ isTrial: true, trialAutoRenews: false, trialDaysLeft: 40 })).toBe(7);
  });

  it('offers nothing to someone already on a mandate', () => {
    expect(trialDaysOnOffer({ isTrial: true, trialAutoRenews: true, trialDaysLeft: 5 })).toBe(0);
  });

  it.each([
    ['a lapsed user', { access: 'expired' }],
    ['a paying customer', { access: 'active' }],
    ['a legacy free row', { access: 'free' }],
    ['a trial with no days left', { isTrial: true, trialAutoRenews: false, trialDaysLeft: 0 }],
    ['nobody at all', null],
  ])('offers nothing to %s', (_label, user) => {
    expect(trialDaysOnOffer(user)).toBe(0);
  });
});

describe('trialOfferLine', () => {
  it('leads with the zero, because that is the question being asked', () => {
    expect(trialOfferLine(7, '₹1,299', '14 Oct')).toBe('₹0 today · ₹1,299 on 14 Oct · cancel any time before');
  });

  it('falls back to a day count when the date is not known yet', () => {
    expect(trialOfferLine(3, '₹1,299', null)).toBe('₹0 today · ₹1,299 in 3 days · cancel any time before');
  });

  it('says nothing at all when no trial is on offer', () => {
    expect(trialOfferLine(0, '₹1,299', '14 Oct')).toBeNull();
  });
});

describe('firstChargeDate', () => {
  it('is today plus the free days', () => {
    const now = new Date('2026-10-07T12:00:00.000Z');
    expect(firstChargeDate(7, now)?.toISOString()).toBe('2026-10-14T12:00:00.000Z');
  });

  it('is null when nothing is free', () => {
    expect(firstChargeDate(0)).toBeNull();
  });
});
