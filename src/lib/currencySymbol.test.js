import { describe, expect, it } from 'vitest';
import { currencySymbol, fmtMoney } from './session';

/* 21 Nov 2026: every non-rupee account showed "$", euros included. */
describe('currencySymbol: the account\'s own currency, whatever it is', () => {
  it.each([
    ['INR', '₹'], ['USD', '$'], ['USDT', '$'], ['USC', '$'],
    ['EUR', '€'], ['GBP', '£'], ['JPY', '¥'], ['eur', '€'],
  ])('%s → %s', (code, sym) => expect(currencySymbol(code)).toBe(sym));

  it('a code with no short symbol shows the code', () => {
    expect(currencySymbol('AED')).toBe('AED ');
    expect(fmtMoney(-1234.5, 'AED')).toBe('−AED 1,234.50');
  });

  it('a non-ISO code shows itself; nothing missing falls back to $', () => {
    expect(currencySymbol('XYZ1')).toBe('XYZ1 ');
    expect(currencySymbol(null)).toBe('$');
  });

  it('money in euros reads as euros', () => {
    expect(fmtMoney(50.5, 'EUR', { sign: true })).toBe('+€50.50');
  });
});
