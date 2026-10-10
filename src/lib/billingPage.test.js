import { describe, expect, it } from 'vitest';
import { billingPageOf } from './billingPage';
import { lifecycleView } from './lifecycle';

const pageFor = (id, opts) => billingPageOf(lifecycleView(id), opts);

describe('Plan & billing renders the spec’s page state for every case', () => {
  it.each([
    ['s0', 'setupEarly'], ['s2', 'setupEarly'], ['s3', 'setup'],
    ['p', 'active'], ['pf', 'failed'], ['tc', 'cancelled'], ['pc', 'cancelled'],
    ['te', 'ended'], ['pe', 'ended'], ['pg', 'ended'], ['lf', 'ended'],
    ['ac', 'comp'], ['nr', 'unknown'],
  ])('%s → %s', (id, page) => {
    expect(pageFor(id, { autoRenews: true }).page).toBe(page);
  });

  it('a card trial is `trial`, then `confirming`; without a card it keeps the legacy card', () => {
    expect(pageFor('t1', { autoRenews: true }).page).toBe('trial');
    expect(pageFor('tx', { autoRenews: true }).page).toBe('confirming');
    expect(pageFor('t6', { autoRenews: false }).page).toBe('legacy');
    expect(pageFor('tx', { autoRenews: false }).page).toBe('legacy');
  });

  it('passes endedFrom only for ended', () => {
    expect(pageFor('te').endedFrom).toBe('trial');
    expect(pageFor('lf').endedFrom).toBe('trial');
    expect(pageFor('pe').endedFrom).toBe('pro');
    expect(pageFor('pg').endedFrom).toBe('unpaid');
    expect(pageFor('p').endedFrom).toBeUndefined();
  });

  it('uses the trial end for tc and the period end for pc', () => {
    expect(pageFor('tc').trial).toBe(true);
    expect(pageFor('pc').trial).toBe(false);
  });

  /* Paid, then deleted every account: the shell says s0, but this page is
     about the subscription, which still renews. */
  it('a paying user with no accounts still sees their plan, not the setup step', () => {
    expect(billingPageOf(lifecycleView('s0'), { planState: 'p' }).page).toBe('active');
    expect(billingPageOf(lifecycleView('s2'), { planState: 'tc' }).page).toBe('cancelled');
    expect(billingPageOf(lifecycleView('s2'), { planState: 'te' }).page).toBe('ended');
    expect(billingPageOf(lifecycleView('s0'), { planState: 'none' }).page).toBe('setupEarly');
  });

  it('is null when the case is unknown', () => {
    expect(billingPageOf(null)).toBeNull();
  });
});
