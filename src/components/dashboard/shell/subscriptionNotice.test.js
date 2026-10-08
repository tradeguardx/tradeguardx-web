import { describe, expect, it } from 'vitest';
import { subscriptionNotice } from './subscriptionNotice';

const trial = (p) => ({ isTrial: true, trialDaysLeft: 5, trialEndsAt: '2026-10-15T00:00:00Z', ...p });

describe('subscriptionNotice — who gets told what', () => {
  it('says nothing to a paying customer', () => {
    expect(subscriptionNotice({ isTrial: false, plan: 'pro' })).toBeNull();
  });

  /* An unloaded user is not a cancelled one. Flashing "set up payment" at
     someone who already has is the mistake worth most here. */
  it('says nothing from an unloaded state', () => {
    expect(subscriptionNotice(null)).toBeNull();
    expect(subscriptionNotice(undefined)).toBeNull();
    expect(subscriptionNotice({})).toBeNull();
  });
});

describe('subscriptionNotice — cancelled', () => {
  const n = subscriptionNotice(trial({ subscriptionCanceled: true, trialAutoRenews: true }));

  it('leads with the cancellation and offers the way back', () => {
    expect(n.strong).toBe('Cancelled.');
    expect(n.cta).toBe('Resubscribe');
    expect(n.to).toBe('/dashboard/account/billing');
  });

  /* The whole point of cancelling is that there is no payment date. Naming
     one sends people to their bank instead of to us. */
  it('never names a payment date, and says they keep their days', () => {
    /* Asserted by parts: the day order is the viewer's locale, so pinning
       "15 Oct" would pass in London and fail in New York. */
    expect(n.text).toMatch(/Oct/);
    expect(n.text).toMatch(/15/);
    expect(n.text).toContain('won’t be charged');
    expect(n.text).not.toMatch(/first payment|renew/i);
  });

  it('still works when the end date is missing', () => {
    const m = subscriptionNotice(trial({ subscriptionCanceled: true, trialEndsAt: null }));
    expect(m.text).toContain('end of the trial');
    expect(m.text).not.toContain('null');
  });
});

describe('subscriptionNotice — the two kinds of trial', () => {
  it('names the charge date on a mandate trial', () => {
    const n = subscriptionNotice(trial({ trialAutoRenews: true }));
    expect(n.text).toMatch(/first payment is on Oct 15|first payment is on 15 Oct/);
    expect(n.text).toContain('5 days left');
    expect(n.cta).toBe('Manage');
  });

  /* A no-card trial just stops. Telling this person a charge is coming is as
     wrong as hiding one from the other. */
  it('promises no charge on a no-card trial, and asks for payment', () => {
    const n = subscriptionNotice(trial({ trialAutoRenews: false }));
    expect(n.text).not.toMatch(/first payment/i);
    expect(n.text).toContain('keep the days you have left');
    expect(n.cta).toBe('Set up');
    /* In-product, not the public pricing page: the same place the billing
       page's own CTA goes, so one job does not land in two places. */
    expect(n.to).toBe('/dashboard/activate');
  });

  it('counts the last day down without going plural or negative', () => {
    expect(subscriptionNotice(trial({ trialDaysLeft: 1 })).text).toContain('1 day left');
    expect(subscriptionNotice(trial({ trialDaysLeft: 0 })).text).toContain('Your trial ends today');
    expect(subscriptionNotice(trial({ trialDaysLeft: null })).text).toContain('Your free trial is active');
  });
});
