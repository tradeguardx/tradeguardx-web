import { afterEach, describe, expect, it, vi } from 'vitest';
import { currencyFor, FALLBACK_RATES, guessCountrySync, makeMoney } from './geo';

describe('makeMoney', () => {
  it('leaves rupees exactly as written, Indian grouping included', () => {
    const m = makeMoney('INR');
    expect(m.price(1299)).toBe('₹1,299');
    expect(m.example(124900)).toBe('₹1,24,900');
    expect(m.exampleValue(-5000)).toBe(-5000);
  });

  it('marks converted prices as approximate, at the real rate', () => {
    const m = makeMoney('USD', { ...FALLBACK_RATES, USD: 0.0105 });
    expect(m.price(1299)).toBe('≈ $14');
    expect(m.price(8999)).toBe('≈ $94');
  });

  it('keeps round example figures round and consistent with each other', () => {
    const m = makeMoney('USD', { ...FALLBACK_RATES, USD: 0.010522 });
    // 0.010522 → 0.011: ₹25,000 reads as $275, and ₹24,800 stays just under it.
    expect(m.example(25000)).toBe('$275');
    expect(m.exampleValue(24800)).toBeLessThan(m.exampleValue(25000));
    expect(m.exampleValue(-25000)).toBe(-275);
  });

  it('uses the local symbol', () => {
    expect(makeMoney('EUR').symbol).toBe('€');
    expect(makeMoney('GBP').price(1299)).toMatch(/^≈ £\d+$/);
  });

  it('falls back to dollars for a currency we have no rate for', () => {
    const m = makeMoney('XYZ');
    expect(m.currency).toBe('USD');
    expect(m.price(1299)).toMatch(/^≈ \$\d+$/);
  });

  it('never shows a price as zero', () => {
    expect(makeMoney('KWD').price(10)).not.toMatch(/\b0$/);
  });
});

describe('currencyFor', () => {
  it('maps countries, the euro area, and everyone else to USD', () => {
    expect(currencyFor('IN')).toBe('INR');
    expect(currencyFor('DE')).toBe('EUR');
    expect(currencyFor('GB')).toBe('GBP');
    expect(currencyFor('ZZ')).toBe('USD');
    expect(currencyFor(null)).toBe('USD');
  });
});

describe('guessCountrySync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('reads India from the device timezone, before any network call', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({ resolvedOptions: () => ({ timeZone: 'Asia/Kolkata' }) });
    expect(guessCountrySync()).toBe('IN');
  });

  it('prefers a recent answer from /api/geo cached on this device', () => {
    localStorage.setItem('tgx:country:v1', JSON.stringify({ c: 'AE', t: Date.now() }));
    expect(guessCountrySync()).toBe('AE');
  });

  it('ignores a cached answer older than a week', () => {
    localStorage.setItem('tgx:country:v1', JSON.stringify({ c: 'AE', t: Date.now() - 8 * 24 * 3600 * 1000 }));
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({ resolvedOptions: () => ({ timeZone: 'Europe/London' }) });
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-GB']);
    expect(guessCountrySync()).toBe('GB');
  });
});
