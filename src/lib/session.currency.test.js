import { describe, expect, it } from 'vitest';
import { currencySymbol, fmtMoney } from './session';

/**
 * Shark settles in INR while Delta and CoinDCX quote USD, and the rule
 * templates ship a hardcoded "$" prefix from the database — one template row
 * serves every venue.
 *
 * So a Shark user setting a 500 daily-loss limit saw "$500" in the field and
 * "$500 · warns at $400" in the summary, for a limit the engine enforces as
 * ₹500. At roughly eighty to one that is not a formatting nit: it is the
 * difference between a limit that never fires and one that fires immediately.
 */
describe('the account decides the currency, not the template', () => {
  it('gives INR accounts a rupee symbol', () => {
    expect(currencySymbol('INR')).toBe('₹');
  });

  it('leaves USD and USDT accounts on the dollar', () => {
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('USDT')).toBe('$');
  });

  it('falls back to the dollar for an unknown or missing currency', () => {
    // Erring to the existing behaviour: every venue but Shark is dollar-quoted
    // today, so an absent value is far more likely to be a USD account than
    // an INR one.
    expect(currencySymbol(undefined)).toBe('$');
    expect(currencySymbol(null)).toBe('$');
  });

  it('formats money in the account currency', () => {
    expect(fmtMoney(500, 'INR')).toBe('₹500.00');
    expect(fmtMoney(500, 'USD')).toBe('$500.00');
  });
});
