import { describe, expect, it } from 'vitest';
import { billingStateOf, daysUntil, gstInside, savingVsMonthly } from './billingState';

const sub = (over) => ({ subscription: { source: 'payment', ...over } });

describe('billingStateOf', () => {
  it('reads a mandate-backed trial as trial', () => {
    expect(billingStateOf({ ...sub({ status: 'trialing' }), access: 'trial', trial: { autoRenews: true } })).toBe('trial');
  });

  /* A legacy no-card trial has no card saved and no charge coming, so none of
     this page's copy is true for it. */
  it('does not read a no-card trial as trial', () => {
    expect(billingStateOf({ subscription: { source: 'free', status: 'trialing' }, access: 'trial', trial: { autoRenews: false } })).toBe('none');
  });

  it('reads a paying customer as active', () => {
    expect(billingStateOf({ ...sub({ status: 'active' }), access: 'active' })).toBe('active');
  });

  it('reads a cancellation still inside its period as cancelled', () => {
    expect(billingStateOf({ ...sub({ status: 'canceled' }), access: 'active', canceled: true })).toBe('cancelled');
  });

  /* Someone whose bank declined needs to see that before a renewal date, so
     it outranks everything else that might also be true. */
  it('puts a failed charge ahead of the rest', () => {
    expect(billingStateOf({ ...sub({ status: 'past_due' }), access: 'active', canceled: true })).toBe('failed');
  });

  it.each([undefined, null, {}, { access: 'free' }, { access: 'expired' }])('has no state for %s', (me) => {
    expect(billingStateOf(me)).toBe('none');
  });
});

describe('daysUntil', () => {
  const now = new Date('2026-10-08T00:00:00.000Z');
  it('counts whole days, rounding up', () => {
    expect(daysUntil('2026-10-15T00:00:00.000Z', now)).toBe(7);
    expect(daysUntil('2026-10-15T06:00:00.000Z', now)).toBe(8);
  });
  it('never goes negative', () => {
    expect(daysUntil('2026-10-01T00:00:00.000Z', now)).toBe(0);
  });
  it('is null without a date', () => {
    expect(daysUntil(null, now)).toBeNull();
    expect(daysUntil('nonsense', now)).toBeNull();
  });
});

describe('gstInside', () => {
  /* Indian prices are quoted inclusive, so this is tax to claim back, not tax
     added on top. The brief's three figures, to the paisa. */
  it.each([
    [1299, '198.15'],
    [3299, '503.24'],
    [8999, '1372.73'],
  ])('finds the GST already inside ₹%i', (amount, expected) => {
    expect(gstInside(amount).toFixed(2)).toBe(expected);
  });

  it('is null for a non-number', () => {
    expect(gstInside(undefined)).toBeNull();
  });
});

describe('savingVsMonthly', () => {
  it.each([
    ['quarterly', 3299, 598],
    ['yearly', 8999, 6589],
  ])('%s saves ₹%i', (id, price, saving) => {
    expect(savingVsMonthly({ id, price }, 1299)).toBe(saving);
  });

  it('is zero for monthly, and never negative', () => {
    expect(savingVsMonthly({ id: 'monthly', price: 1299 }, 1299)).toBe(0);
    expect(savingVsMonthly({ id: 'yearly', price: 99999 }, 1299)).toBe(0);
  });
});
