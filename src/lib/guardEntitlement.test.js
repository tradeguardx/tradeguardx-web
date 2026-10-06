import { describe, expect, it } from 'vitest';
import { ENFORCEMENT, describeGuard, enforcementOf, GUARD } from './guard';

/**
 * THE DASHBOARD MUST NOT CLAIM PROTECTION THE ENGINE WILL NOT PROVIDE.
 *
 * The engine now refuses to act for an account whose plan has lapsed — it has
 * no agreement to place a close order on one. This screen has to agree with
 * it. A dashboard reading ARMED over an engine that will not act is the most
 * dangerous state this product can produce: someone sizes a position believing
 * a killswitch is behind it when there is none.
 */
const ok = {
  account: { propFirmSlug: 'shark', equityMode: 'live' },
  connection: { status: 'active', enforcementCapable: true },
  rules: { instances: [{ enabled: true }] },
  loaded: true,
};

describe('a lapsed plan is not armed', () => {
  it('is armed when entitled', () => {
    expect(enforcementOf({ ...ok, entitled: true })).toBe(ENFORCEMENT.ARMED);
  });

  it('drops to watching when the plan has lapsed', () => {
    expect(enforcementOf({ ...ok, entitled: false })).toBe(ENFORCEMENT.WATCHING);
  });

  it('defaults to armed, so an unloaded plan is never a false alarm', () => {
    // `access` is null until the subscription call lands. Unknown must never
    // read as unprotected — the same rule `loaded` enforces everywhere else.
    expect(enforcementOf(ok)).toBe(ENFORCEMENT.ARMED);
    expect(enforcementOf({ ...ok, entitled: undefined })).toBe(ENFORCEMENT.ARMED);
  });

  it('still reports the bigger problems first', () => {
    // No key and no rules are worse than a lapsed plan, and their copy is the
    // copy that helps.
    expect(enforcementOf({ ...ok, entitled: false, connection: null })).toBe(ENFORCEMENT.UNPROTECTED);
    expect(enforcementOf({ ...ok, entitled: false, rules: { instances: [] } })).toBe(ENFORCEMENT.UNPROTECTED);
    expect(enforcementOf({ ...ok, entitled: false, loaded: false })).toBe(ENFORCEMENT.LOADING);
  });
});

describe('the two ways to be "watching only" read differently', () => {
  it('does not blame the key when the plan is what lapsed', () => {
    // Sending someone to replace a key that works perfectly wastes their time
    // and leaves the actual problem untouched.
    const d = describeGuard(GUARD.WATCHING, { entitled: false });
    expect(d.title).toMatch(/plan ended/i);
    expect(d.bandBody).toMatch(/key is fine/i);
    expect(d.to).toBe('/dashboard/account/billing');
    expect(d.sub).not.toMatch(/read-only/i);
  });

  it('still blames the key when the key is what is wrong', () => {
    const d = describeGuard(GUARD.WATCHING, { entitled: true, readOnly: true });
    expect(d.sub).toMatch(/read-only/i);
    expect(d.to).toBe('/dashboard/connect');
  });

  it('says plainly in both cases that nothing is being enforced', () => {
    for (const entitled of [true, false]) {
      const d = describeGuard(GUARD.WATCHING, { entitled });
      expect(d.pill).toBe('Watching only');
      expect(d.tone).toBe('amber');
      expect(`${d.title} ${d.sub} ${d.bandBody}`).toMatch(/nothing is being enforced|cannot stop it|not live/i);
    }
  });

  it('tells a lapsed user their data and rules are still there', () => {
    // The product keeps ingesting. Someone who thinks they have lost their
    // journal has no reason to come back.
    const d = describeGuard(GUARD.WATCHING, { entitled: false });
    expect(d.sub).toMatch(/journal|trades/i);
    expect(d.sub).toMatch(/rules are still here|still here/i);
  });
});
