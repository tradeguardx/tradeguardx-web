import { describe, expect, it } from 'vitest';
import {
  entryToastFor,
  lifecycleIdOf,
  lifecycleView,
  lockedRouteOf,
  withMissingKey,
  PROTECTED_STATES,
  UNPROTECTED_STATES,
} from './lifecycle';
import { pillOf, planNoticeOf } from '../components/dashboard/shell/lifecycleShell';

const ALL = ['s0', 's2', 's3', 't1', 't6', 'tc', 'tx', 'p', 'pf', 'pc', 'te', 'pe', 'pg', 'ac', 'lf', 'nr'];
const ARMED = { pill: 'Armed', tone: 'mint', title: 'Armed.' };

describe('which state', () => {
  it('is unknown until the plan state arrives — never a guess', () => {
    expect(lifecycleIdOf({ planState: null, accountsCount: 2, keyConnected: true })).toBeNull();
  });

  it('splits "no plan yet" by setup progress', () => {
    expect(lifecycleIdOf({ planState: 'none', accountsCount: 0 })).toBe('s0');
    expect(lifecycleIdOf({ planState: 'none', accountsCount: 1, keyConnected: false })).toBe('s2');
    expect(lifecycleIdOf({ planState: 'none', accountsCount: 1, keyConnected: true })).toBe('s3');
  });

  it('takes any plan state as it comes', () => {
    expect(lifecycleIdOf({ planState: 'pf', accountsCount: 0 })).toBe('pf');
  });
});

describe('the view of every state', () => {
  it.each(ALL)('%s is complete and consistent', (id) => {
    const v = lifecycleView(id, { endsAt: '2026-10-15T12:00:00Z', periodEnd: '2026-10-01T12:00:00Z', autoRenews: true });
    expect(v.id).toBe(id);
    expect(v.protected).toBe(PROTECTED_STATES.includes(id));
    // Anything locked says why and where to go.
    if (v.locks.length) expect(v.lock).toEqual(expect.objectContaining({ title: expect.any(String), cta: expect.any(String), to: expect.stringMatching(/^\/dashboard\//) }));
    // Nothing protected ever locks a page.
    if (v.protected) expect(v.locks).toEqual([]);
    // Never the word "Free" for a plan.
    expect(JSON.stringify(v)).not.toMatch(/\bFree plan\b|\bon Free\b/);
  });

  it('keeps the kill switch working with no plan, and only setup disables it', () => {
    for (const id of UNPROTECTED_STATES) expect(lifecycleView(id).ks.enabled).toBe(true);
    for (const id of ['s0', 's2', 's3']) expect(lifecycleView(id).ks.enabled).toBe(false);
    expect(lifecycleView('pf').ks.tip).toBe('Works without a plan: your rules are off, your kill switch is not');
  });

  it('locks Live guard and Journal while unprotected, and nothing else', () => {
    for (const id of UNPROTECTED_STATES) expect(lifecycleView(id).locks).toEqual(['live', 'journal']);
  });

  it('red, not dismissible, and pointing at Plan & billing while unprotected', () => {
    for (const id of UNPROTECTED_STATES) {
      const b = lifecycleView(id).band;
      expect(b.tone).toBe('red');
      expect(b.dismissible).toBeFalsy();
      expect(b.to).toBe('/dashboard/account/billing');
    }
  });

  it('puts the date into the cancelled states', () => {
    const tc = lifecycleView('tc', { endsAt: '2026-10-15T12:00:00Z' });
    expect(tc.pill).toMatch(/^Protected · until 15 Oct/);
    expect(tc.band.body).toMatch(/until 15 Oct/);
    expect(lifecycleView('pc', { endsAt: '2026-11-15T12:00:00Z' }).band.title).toMatch(/Pro ends 15 Nov/);
  });

  it('drops a date it does not have rather than inventing one', () => {
    expect(lifecycleView('pc', {}).band.title).toBe('Pro is cancelled.');
    expect(lifecycleView('pe', {}).band.title).toBe('Your plan has ended.');
  });

  it('only warns of a charge when a card is on file', () => {
    expect(lifecycleView('t6', { endsAt: '2026-10-15T12:00:00Z', autoRenews: true }).band.dismissible).toBe(true);
    expect(lifecycleView('t6', { endsAt: '2026-10-15T12:00:00Z', autoRenews: false }).band).toBeNull();
  });

  it('says "payment failed" in the failed state, and plan ended elsewhere', () => {
    expect(lifecycleView('pf').dial.label).toBe('guard off · payment failed');
    expect(lifecycleView('te').dial.label).toBe('guard off · no active plan');
    expect(lifecycleView('lf').pill).toBe('Not protected · no plan');
  });
});

describe('tx without a card (the old no-card trial)', () => {
  it('never claims a payment is being confirmed', () => {
    const v = lifecycleView('tx', { endsAt: '2026-10-13T12:00:00Z', autoRenews: false });
    expect(JSON.stringify(v)).not.toMatch(/confirming/i);
    expect(v.protected).toBe(true);
    expect(v.band.to).toBe('/dashboard/activate');
  });

  it('a card trial does wait on its first payment', () => {
    expect(lifecycleView('tx', { autoRenews: true }).pill).toBe('Protected · confirming payment');
  });
});

describe('an account with no key, under any plan', () => {
  it('locks the pages that read the exchange, even on a protected plan', () => {
    const v = withMissingKey(lifecycleView('tc', { endsAt: '2026-10-15T12:00:00Z' }));
    expect(v.locks).toEqual(['live', 'journal', 'trades', 'tax']);
    expect(v.lockFor('live').title).toBe('Connect your key to see this');
    expect(v.lockFor('live').to).toBe('/dashboard/connect');
    expect(v.ks.enabled).toBe(false);
    expect(v.badges.connect).toBe('!');
  });

  it('keeps the plan lock on Live guard and Journal when the plan is off too', () => {
    const v = withMissingKey(lifecycleView('te'));
    expect(v.lockFor('live').title).toBe('Needs an active plan');
    expect(v.lockFor('trades').title).toBe('Connect your key to see this');
  });
});

describe('locked routes', () => {
  it('matches the page and its children only', () => {
    expect(lockedRouteOf('/dashboard/live', ['live'])).toBe('live');
    expect(lockedRouteOf('/dashboard/trades/abc', ['trades'])).toBe('trades');
    expect(lockedRouteOf('/dashboard/livestream', ['live'])).toBeNull();
    expect(lockedRouteOf('/dashboard/tax', ['live', 'journal'])).toBeNull();
  });
});

describe('the pill, in the spec’s precedence', () => {
  it('an unprotected plan wins over whatever the key says', () => {
    const watching = { pill: 'Watching only', tone: 'amber', title: '' };
    expect(pillOf(lifecycleView('pf'), watching, 'watching').pill).toBe('Not protected · payment failed');
  });

  it('the account’s own problem wins over a protected plan’s wording', () => {
    const keyGap = { pill: 'Not protected', tone: 'red', title: '' };
    expect(pillOf(lifecycleView('tc'), keyGap, 'unprotected').pill).toBe('Not protected');
  });

  it('a protected plan names itself once the account is armed', () => {
    expect(pillOf(lifecycleView('tx', { autoRenews: true }), ARMED, 'armed').pill).toBe('Protected · confirming payment');
    expect(pillOf(lifecycleView('p'), ARMED, 'armed').pill).toBe('Armed');
  });

  it('unknown state leaves the existing pill alone', () => {
    expect(pillOf(null, ARMED, 'armed').pill).toBe('Armed');
  });
});

describe('the plan line in the band', () => {
  const cardTrial = { isTrial: true, trialAutoRenews: true, trialDaysLeft: 5, trialEndsAt: '2026-10-15T12:00:00Z' };
  const noCardTrial = { isTrial: true, trialAutoRenews: false, trialDaysLeft: 5, trialEndsAt: '2026-10-15T12:00:00Z' };

  it('is quiet in t1 with a card — no banner, by the spec', () => {
    expect(planNoticeOf(lifecycleView('t1', { autoRenews: true }), cardTrial)).toBeNull();
  });

  it('keeps prompting a no-card trial to set up billing', () => {
    expect(planNoticeOf(lifecycleView('t1', { autoRenews: false }), noCardTrial).to).toBe('/dashboard/activate');
  });

  it('says nothing about a plan in tx (card), p, ac or nr', () => {
    expect(planNoticeOf(lifecycleView('tx', { autoRenews: true }), cardTrial)).toBeNull();
    for (const id of ['p', 'ac', 'nr']) expect(planNoticeOf(lifecycleView(id), cardTrial)).toBeNull();
  });

  it('carries the cancelled band in tc', () => {
    expect(planNoticeOf(lifecycleView('tc', { endsAt: '2026-10-15T12:00:00Z' }), cardTrial).cta).toBe('Resume trial');
  });
});

describe('entry toasts', () => {
  it('welcomes a return from any unprotected state the same way', () => {
    for (const from of UNPROTECTED_STATES) expect(entryToastFor(from, 'p', lifecycleView('p'))).toBe('Payment went through. Your guard is back on.');
  });

  it('says nothing when the state has not changed', () => {
    expect(entryToastFor('pf', 'pf', lifecycleView('pf'))).toBeNull();
  });

  it('uses the state’s own toast otherwise', () => {
    expect(entryToastFor('t1', 'tc', lifecycleView('tc'))).toBe('Trial cancelled. You won’t be charged.');
  });
});
