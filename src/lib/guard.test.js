import { describe, expect, it } from 'vitest';
import { canLockOutOf, enforcementOf, guardOf, gapsOf, describeGuard } from './guard';

const account = { id: 'a', name: 'Delta main', propFirmSlug: 'delta_india', accountSize: 5000, cooldownUntil: null };
const key = { status: 'active', enforcementCapable: true };
const readOnly = { status: 'active', enforcementCapable: false };
const rules = { templates: [{ slug: 'daily-loss' }, { slug: 'max-trades-day' }], instances: [{ templateSlug: 'daily-loss', enabled: true }] };
const noRules = { templates: rules.templates, instances: [] };
const alerts = { telegramConnected: true };

describe('enforcementOf', () => {
  it('is armed with a trading key, a rule on, and setup complete', () => {
    expect(enforcementOf({ account, connection: key, rules })).toBe('armed');
  });
  it('is watching with a read-only key — we see fills, cannot act', () => {
    expect(enforcementOf({ account, connection: readOnly, rules })).toBe('watching');
  });
  it('is unprotected with no key, no rules on, or incomplete setup', () => {
    expect(enforcementOf({ account, connection: null, rules })).toBe('unprotected');
    expect(enforcementOf({ account, connection: key, rules: noRules })).toBe('unprotected');
    // a live exchange account needs no sizing balance; a funded one does
    expect(enforcementOf({ account: { ...account, accountSize: null }, connection: key, rules })).toBe('armed');
    expect(enforcementOf({ account: { ...account, equityMode: 'funded', accountSize: null }, connection: key, rules })).toBe('unprotected');
    expect(enforcementOf({ account: { ...account, propFirmSlug: null }, connection: key, rules })).toBe('unprotected');
  });
});

describe('canLockOutOf', () => {
  it('holds with a trading key and NO rules — a lockout is not a rule', () => {
    expect(canLockOutOf({ account, connection: key, rules: noRules })).toBe(true);
  });
  it('cannot hold with a read-only key: nothing could close what it stops', () => {
    expect(canLockOutOf({ account, connection: readOnly })).toBe(false);
  });
  it('cannot hold with no key, or before setup is complete', () => {
    expect(canLockOutOf({ account, connection: null })).toBe(false);
    expect(canLockOutOf({ account: { ...account, propFirmSlug: null }, connection: key })).toBe(false);
    expect(canLockOutOf({ account, connection: key, loaded: false })).toBe(false);
  });
});

describe('guardOf', () => {
  it('is locked while a cooldown runs, regardless of enforcement', () => {
    const now = Date.now();
    const locked = { ...account, cooldownUntil: new Date(now + 60_000).toISOString() };
    expect(guardOf({ account: locked, connection: key, rules }, now)).toBe('locked');
    expect(guardOf({ account: locked, connection: null, rules }, now)).toBe('locked');
  });
  it('ignores a lock that has already passed', () => {
    const now = Date.now();
    const expired = { ...account, cooldownUntil: new Date(now - 1000).toISOString() };
    expect(guardOf({ account: expired, connection: key, rules }, now)).toBe('armed');
  });
});

describe('gapsOf — first unmet wins, in the brief order', () => {
  it('setup → key → readonly → rules → alerts', () => {
    expect(gapsOf({ account: { ...account, propFirmSlug: null }, connection: null, rules: noRules, notifications: null }).map((g) => g.key))
      .toEqual(['setup', 'key', 'rules', 'alerts']);
    // read-only is the 'watching' state, not a gap
    expect(gapsOf({ account, connection: readOnly, rules, notifications: alerts })).toEqual([]);
    expect(gapsOf({ account, connection: key, rules, notifications: null }).map((g) => g.key)).toEqual(['alerts']);
    expect(gapsOf({ account, connection: key, rules, notifications: alerts })).toEqual([]);
  });
  it('alerts is a gap but does not lower enforcement', () => {
    expect(enforcementOf({ account, connection: key, rules })).toBe('armed');
    expect(gapsOf({ account, connection: key, rules, notifications: null })[0].key).toBe('alerts');
  });
});

describe('describeGuard', () => {
  it('names the count and never over-promises', () => {
    expect(describeGuard('armed', { on: 1, total: 2 }).title).toBe('Armed. 1 of your 2 rules is watching every fill.');
    expect(describeGuard('watching').title).toMatch(/cannot stop it/);
    expect(describeGuard('unprotected', { gap: { title: 'No key with trading scope' } }).title).toBe('Not protected. No key with trading scope');
  });
});

describe('ruleLockNow', () => {
  const t0 = Date.parse('2026-09-20T10:00:00Z');
  const rl = { days: 7, mode: 'window', locksAt: '2026-09-20T10:15:00Z', lockedUntil: '2026-09-27T10:00:00Z', locked: false, settling: true };
  it('is settling before locksAt, locked after it, off after lockedUntil — whatever the payload said', async () => {
    const { ruleLockNow } = await import('./guard');
    expect(ruleLockNow(rl, t0)).toMatchObject({ settling: true, locked: false });
    expect(ruleLockNow(rl, t0 + 16 * 60000)).toMatchObject({ settling: false, locked: true });
    expect(ruleLockNow(rl, Date.parse('2026-09-28T00:00:00Z'))).toMatchObject({ settling: false, locked: false });
  });
});

/**
 * Regression guard for the false "not protected" flash on login.
 *
 * `connection: null` means two different things — "no key" and "not fetched
 * yet" — and the derivations used to treat both as unprotected. For the
 * half-second before the first fetch landed, a fully armed account was told
 * its key was missing, which is the most alarming claim this product makes.
 */
describe('guard state before data arrives', () => {
  const armedInput = {
    account: { propFirmSlug: 'coindcx', equityMode: 'live' },
    connection: { status: 'active', enforcementCapable: true },
    rules: { instances: [{ enabled: true }], templates: [{ slug: 'daily-loss' }] },
    notifications: { telegramConnected: true },
  };

  it('is "loading", never "unprotected", while the fetch is in flight', () => {
    expect(enforcementOf({ ...armedInput, connection: null, rules: null, loaded: false })).toBe('loading');
    expect(guardOf({ ...armedInput, connection: null, rules: null, loaded: false })).toBe('loading');
  });

  it('claims no gaps while loading, so no screen tells the user to connect a key', () => {
    expect(gapsOf({ ...armedInput, connection: null, rules: null, loaded: false })).toEqual([]);
  });

  it('describes loading with no verdict and no band', () => {
    const d = describeGuard('loading', {});
    expect(d.loading).toBe(true);
    expect(d.showBand).toBe(false);
    expect(d.pill).toBe('');
  });

  it('still reports an active lock before the fetch — that comes from the account row', () => {
    const locked = { ...armedInput, connection: null, rules: null, loaded: false, account: { ...armedInput.account, cooldownUntil: new Date(Date.now() + 60_000).toISOString() } };
    expect(guardOf(locked)).toBe('locked');
  });

  it('returns the real verdict once loaded', () => {
    expect(guardOf({ ...armedInput, loaded: true })).toBe('armed');
    expect(guardOf({ ...armedInput, connection: null, loaded: true })).toBe('unprotected');
  });
});

describe('gapsOf — billing', () => {
  /* The module-level fixtures, so this block cannot drift into testing a
     shape the rest of the file does not use. */
  const noRulesOn = noRules;

  it('is a gap when the guard is not paid for, however complete everything else is', () => {
    // Account, live key, rules on, alerts connected — and the engine still
    // arms nothing. Every line used to say they were done.
    const keys = gapsOf({ account, connection: key, rules, notifications: alerts, entitled: false }).map((g) => g.key);
    expect(keys).toEqual(['billing']);
  });

  it('sits before rules, so nobody writes rules nothing will enforce', () => {
    const keys = gapsOf({ account, connection: key, rules: noRulesOn, notifications: alerts, entitled: false }).map((g) => g.key);
    expect(keys).toEqual(['billing', 'rules']);
  });

  /* Unknown entitlement must never read as unpaid — the same fail-open rule
     the key and rules gaps follow. */
  it('is not a gap while entitlement is unknown', () => {
    expect(gapsOf({ account, connection: key, rules, notifications: alerts }).map((g) => g.key)).toEqual([]);
  });

  it('stops promising the guard arms itself when it will not', () => {
    const g = gapsOf({ account, connection: key, rules: noRulesOn, notifications: alerts, entitled: false })
      .find((x) => x.key === 'rules');
    expect(g.body).not.toMatch(/arms itself/);
  });
});

/**
 * THE LEGACY NO-CARD TRIAL.
 *
 * Users who signed up before mandate-first are entitled today with nothing
 * attached. `entitled` was doing double duty — "has access" and "has billing"
 * — which for these users ticked the billing step as done and then let the
 * guard go quiet on the day the trial lapsed, having never asked.
 *
 * They are asked. They are not blocked.
 */
describe('gapsOf — asked for billing, not blocked', () => {
  const base = { account, connection: readOnly, rules, notifications: alerts };

  it('asks a trialist with no payment method attached', () => {
    const gaps = gapsOf({ ...base, entitled: true, mandate: false });
    const billing = gaps.find((g) => g.key === 'billing');
    expect(billing).toBeTruthy();
    /* Not "billing is not set up / nothing is enforced" — that is false for
       someone whose guard is running right now, and it reads as a lockout. */
    expect(billing.title).toBe('No payment method on your trial');
    expect(billing.cta).toBe('Set up billing');
  });

  it('says nothing to a trialist who has one attached', () => {
    expect(gapsOf({ ...base, entitled: true, mandate: true }).some((g) => g.key === 'billing')).toBe(false);
  });

  it('keeps the harder copy for someone with no access at all', () => {
    const billing = gapsOf({ ...base, entitled: false, mandate: false }).find((g) => g.key === 'billing');
    expect(billing.title).toBe('Billing is not set up');
    expect(billing.cta).toBe('Start 7 days free');
  });

  /* Fail-open: an unloaded subscription must never accuse someone who has
     paid of not having paid. Both default to true. */
  it('asks nobody from an unloaded state', () => {
    expect(gapsOf({ ...base }).some((g) => g.key === 'billing')).toBe(false);
  });
});

/**
 * THE FREE WEEK IS ONLY OFFERED TO SOMEONE WHO HAS NOT HAD IT.
 *
 * `trialDaysForUser` returns 0 for a spent trial, so "the first 7 days are
 * free and nothing is charged today" was a promise checkout would not keep —
 * shown to the one group who would be debited in full on the next click.
 */
describe('gapsOf — the trial that has already been used', () => {
  const base = { account, connection: readOnly, rules, notifications: alerts, entitled: false, mandate: false };

  it('offers the free week to someone who never started', () => {
    const billing = gapsOf({ ...base, trialSpent: false }).find((g) => g.key === 'billing');
    expect(billing.title).toBe('Billing is not set up');
    expect(billing.body).toMatch(/first 7 days are free/);
  });

  it('does not re-offer it to someone whose trial ended', () => {
    const billing = gapsOf({ ...base, trialSpent: true }).find((g) => g.key === 'billing');
    expect(billing.title).toBe('Your free trial has ended');
    expect(billing.body).not.toMatch(/7 days are free|nothing is charged today/);
    expect(billing.body).toMatch(/first charge is today/);
    expect(billing.cta).toBe('See plans');
  });

  /* Still a billing gap either way — the guard is off for both. */
  it('reports a billing gap in both cases', () => {
    expect(gapsOf({ ...base, trialSpent: true }).some((g) => g.key === 'billing')).toBe(true);
    expect(gapsOf({ ...base, trialSpent: false }).some((g) => g.key === 'billing')).toBe(true);
  });

  /* A running trial is not a spent one: that user is asked to attach a card,
     not told their trial is over. */
  it('does not confuse a running trial with a spent one', () => {
    const billing = gapsOf({ ...base, entitled: true, trialSpent: false }).find((g) => g.key === 'billing');
    expect(billing.title).toBe('No payment method on your trial');
  });
});
