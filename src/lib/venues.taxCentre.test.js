import { describe, expect, it } from 'vitest';
import { accountHasTaxCentre } from './venues';

describe('accountHasTaxCentre', () => {
  it('Indian exchanges keep the tax centre; Exness and BloFin do not', () => {
    for (const slug of ['delta_india', 'coindcx', 'shark']) expect(accountHasTaxCentre({ propFirmSlug: slug })).toBe(true);
    for (const slug of ['exness', 'blofin']) expect(accountHasTaxCentre({ propFirmSlug: slug })).toBe(false);
  });

  it('an account with no venue keeps it', () => {
    expect(accountHasTaxCentre({})).toBe(true);
    expect(accountHasTaxCentre(null)).toBe(true);
  });
});
