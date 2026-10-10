import { describe, expect, it } from 'vitest';
import {
  entryToastFor,
  lifecycleIdOf,
  lifecycleView,
  keyStateOf,
  lockedRouteOf,
  PROTECTED_STATES,
  UNPROTECTED_STATES,
} from './lifecycle';
import { heroOf, pillOf, planNoticeOf } from '../components/dashboard/shell/lifecycleShell';

const ALL = ['s0', 's2', 's3', 't1', 't6', 'tc', 'tx', 'p', 'pf', 'pc', 'te', 'pe', 'pg', 'ac', 'lf', 'nr'];
const ARMED = { pill: 'Armed', tone: 'mint', title: 'Armed.' };

describe('which state, in the spec’s order (first match wins)', () => {
  it('is unknown until the plan state arrives — never a guess', () => {
    expect(lifecycleIdOf({ planState: null, accountsCount: 2, keyState: 'ok' })).toBeNull();
  });

  it('no account is s0 and a key never connected is s2 — whatever the plan', () => {
    expect(lifecycleIdOf({ planState: 'p', accountsCount: 0, keyState: 'none' })).toBe('s0');
    // The tester's case: a cancelled trial on a fresh Shark account.
    expect(lifecycleIdOf({ planState: 'tc', accountsCount: 1, keyState: 'none' })).toBe('s2');
    expect(lifecycleIdOf({ planState: 'none', accountsCount: 1, keyState: 'none' })).toBe('s2');
  });

  it('a connected key with no plan yet is s3', () => {
    expect(lifecycleIdOf({ planState: 'none', accountsCount: 1, keyState: 'ok' })).toBe('s3');
  });

  it('a key that failed after connecting keeps the plan state (§5, scenario Q)', () => {
    expect(lifecycleIdOf({ planState: 'p', accountsCount: 1, keyState: 'failed' })).toBe('p');
    expect(lifecycleIdOf({ planState: 'pe', accountsCount: 1, keyState: 'failed' })).toBe('pe');
  });

  it('no plan and a disconnected key is setup (s2), never "Key connected" (s3)', () => {
    expect(lifecycleIdOf({ planState: 'none', accountsCount: 1, keyState: 'failed' })).toBe('s2');
    const v = lifecycleView('s2', { accountName: 'Delta-Ex', keyState: 'failed' });
    expect(v.band.title).toBe("Delta-Ex's key is disconnected.");
    expect(v.band.cta).toBe('Reconnect key');
    expect(lifecycleView('s2', { accountName: 'Delta-Ex', keyState: 'none' }).band.title).toBe('Nothing is watching Delta-Ex yet.');
  });

  it('reads key states from the credentials status', () => {
    expect(keyStateOf({ status: 'active' })).toBe('ok');
    expect(keyStateOf({ status: 'invalid' })).toBe('failed');
    expect(keyStateOf({ status: 'revoked' })).toBe('failed');
    // the engine writes `failed`; reading it as "never connected" put paying
    // users with a dead key into setup
    expect(keyStateOf({ status: 'failed' })).toBe('failed');
    expect(keyStateOf(null)).toBe('none');
    expect(keyStateOf({ status: 'not_connected' })).toBe('none');
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

describe('setup states carry the spec’s own pill and band', () => {
  it('s2 names the account and points at the key', () => {
    const v = lifecycleView('s2', { accountName: 'Shark' });
    expect(v.pill).toBe('Not protected');
    expect(v.band.title).toBe('Nothing is watching Shark yet.');
    // Setup CTAs go to onboarding, which opens at the case's step (handoff 11).
    expect(v.band.to).toBe('/dashboard/setup');
    expect(v.lock.to).toBe('/dashboard/setup');
    expect(v.lock.title).toBe('Connect your key to see this');
  });

  it('s3 offers the trial with ₹0 today', () => {
    const v = lifecycleView('s3');
    expect(v.pill).toBe('Guard off');
    expect(v.band.body).toMatch(/₹0 today/);
  });
});

describe('handoff 11 details', () => {
  it('s0 band is grey', () => {
    expect(lifecycleView('s0').band.tone).toBe('neutral');
  });

  it('states the amount where the spec does, and drops it when unknown', () => {
    const pf = lifecycleView('pf', { price: '₹1,299', periodEnd: '2026-10-15T12:00:00Z' });
    expect(pf.band.cta).toBe('Pay ₹1,299');
    expect(pf.lock.cta).toBe('Pay ₹1,299');
    expect(pf.hero.sub).toMatch(/declined ₹1,299 on 15 Oct/);
    expect(lifecycleView('pf').band.cta).toBe('Pay now');
    expect(lifecycleView('p', { price: '₹1,299' }).toast).toBe('Payment received · ₹1,299. Invoice in Plan & billing.');
    expect(lifecycleView('t6', { price: '₹1,299', autoRenews: true, endsAt: '2026-10-15T12:00:00Z' }).band.body).toMatch(/We’ll charge ₹1,299/);
  });

  it('t6 hides for the day, pc for three', () => {
    expect(lifecycleView('t6', { autoRenews: true, endsAt: '2026-10-15T12:00:00Z' }).band.dismissDays).toBe(1);
    expect(lifecycleView('pc', { endsAt: '2026-11-15T12:00:00Z' }).band.dismissDays).toBe(3);
    expect(lifecycleView('tc', { endsAt: '2026-10-15T12:00:00Z' }).band.dismissible).toBeFalsy();
  });

  it('suffixes account labels in tc and pc', () => {
    expect(lifecycleView('tc', { endsAt: '2026-10-15T12:00:00Z' }).accountSuffix).toBe('until 15 Oct');
  });

  it('names the switch-off reason, with lf as "plan ended"', () => {
    expect(lifecycleView('lf').offReason).toBe('plan ended');
    expect(lifecycleView('te').offReason).toBe('trial ended');
    expect(lifecycleView('pf').offReason).toBe('payment failed');
  });

  it('a flip with no toast of its own says "Your guard is on/off."', () => {
    expect(entryToastFor('tx', 'pf', lifecycleView('pf'))).toBe('Payment failed. Your guard is off until it goes through.');
    expect(entryToastFor('pc', 'pe', lifecycleView('pe'))).toBe('Your guard is off.');
    expect(entryToastFor('p', 'pc', { toast: null })).toBeNull();
  });

  it('names the account in t1 and tx', () => {
    expect(lifecycleView('t1', { accountName: 'Delta · Main' }).toast).toBe('Guard on. Delta · Main is protected.');
    expect(lifecycleView('tx', { accountName: 'Delta · Main', autoRenews: true }).hero.title).toBe('Delta · Main is protected.');
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

describe('not enforced (spec §1.5)', () => {
  it('names the rule and the plan as the reason when the engine says so', async () => {
    const { unenforcedLabel, isUnenforced } = await import('./lifecycle');
    const b = { breachType: 'enforcement_unavailable', ruleSlug: 'daily-loss', context: { reason: 'unentitled' } };
    expect(isUnenforced(b)).toBe(true);
    expect(unenforcedLabel(b)).toBe('Daily loss limit reached · not enforced (no active plan)');
    expect(unenforcedLabel(b, { timeline: true })).toBe('Daily loss limit reached · not enforced: plan inactive');
    // A key problem is not blamed on the plan.
    expect(unenforcedLabel({ ...b, context: { reason: 'incapable' } }, { unprotected: true })).toBe('Daily loss limit reached · not enforced');
  });
});

describe('the Overview hero never contradicts the pill', () => {
  const noRules = { pill: 'Not protected', tone: 'red', title: 'Not protected. No rules are switched on yet.', sub: 'Nothing is enforcing this account yet.' };
  const armed = { pill: 'Armed', tone: 'mint', title: 'Armed.', sub: 'Watching every fill.' };
  const tc = lifecycleView('tc', { endsAt: '2026-10-15T12:00:00Z' });

  it('a cancelled trial with no rules on says "Not protected", like the pill', () => {
    expect(heroOf(tc, noRules, 'unprotected').title).toBe('Not protected. No rules are switched on yet.');
    expect(pillOf(tc, noRules, 'unprotected').pill).toBe('Not protected');
  });

  it('once armed, the plan’s date leads', () => {
    expect(heroOf(tc, armed, 'armed').title).toBe('Protected until 15 Oct.');
  });

  it('with no plan the plan’s hero always leads', () => {
    expect(heroOf(lifecycleView('te'), noRules, 'watching').title).toBe('Nothing is protecting your accounts.');
  });
});
