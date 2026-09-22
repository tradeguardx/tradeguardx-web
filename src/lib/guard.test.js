import { describe, expect, it } from 'vitest';
import { enforcementOf, guardOf, gapsOf, describeGuard } from './guard';

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
