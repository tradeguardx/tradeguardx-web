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
    expect(enforcementOf({ account: { ...account, accountSize: null }, connection: key, rules })).toBe('unprotected');
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
    expect(gapsOf({ account, connection: readOnly, rules, notifications: alerts }).map((g) => g.key)).toEqual(['readonly']);
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
    expect(describeGuard('watching').title).toMatch(/cannot close/);
    expect(describeGuard('unprotected', { gap: { title: 'No key with trading scope' } }).title).toBe('Not protected. No key with trading scope.');
  });
});
