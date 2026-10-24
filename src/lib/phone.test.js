import { describe, expect, it, vi } from 'vitest';

// The default country falls back to the visitor's guess; pin it per test.
const geo = vi.hoisted(() => ({ guess: null }));
vi.mock('./geo', () => ({ guessCountrySync: () => geo.guess }));

const {
  countryOptions, defaultPhoneCountry, dialCodeOf, examplePlaceholder, flagOf,
  formatTyped, isValidE164, searchCountries, splitE164, toE164,
} = await import('./phone');

/**
 * Phone entry went international: the picker stores E.164 for any country and
 * shows the national number the way people there write it.
 */
describe('phone helpers', () => {
  it('builds flags and dial codes from the ISO code', () => {
    expect(flagOf('AE')).toBe('🇦🇪');
    expect(flagOf('IN')).toBe('🇮🇳');
    expect(flagOf('nope')).toBe('');
    expect(dialCodeOf('AE')).toBe('+971');
    expect(dialCodeOf('GB')).toBe('+44');
  });

  it('lists every country with a readable name, sorted', () => {
    const opts = countryOptions();
    expect(opts.length).toBeGreaterThan(200);
    expect(opts.find((o) => o.code === 'AE')).toMatchObject({ name: 'United Arab Emirates', dial: '+971' });
    const names = opts.map((o) => o.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it('searches by name, ISO code and dial code', () => {
    expect(searchCountries('india')[0].code).toBe('IN');
    expect(searchCountries('ae')[0].code).toBe('AE');
    expect(searchCountries('+971').map((o) => o.code)).toEqual(['AE']);
    expect(searchCountries('44').map((o) => o.code)).toContain('GB');
    expect(searchCountries('')).toHaveLength(countryOptions().length);
  });

  it('turns a national number + country into E.164', () => {
    expect(toE164('98765 43210', 'IN')).toBe('+919876543210');
    expect(toE164('050 123 4567', 'AE')).toBe('+971501234567');
    expect(toE164('07400 123456', 'GB')).toBe('+447400123456');
    expect(toE164('(202) 555-0123', 'US')).toBe('+12025550123');
    // an international text wins over the selected country
    expect(toE164('+44 7400 123456', 'IN')).toBe('+447400123456');
    expect(toE164('', 'IN')).toBe('');
  });

  it('validates per country', () => {
    expect(isValidE164('+919876543210')).toBe(true);
    expect(isValidE164('+971501234567')).toBe(true);
    expect(isValidE164('+91987654')).toBe(false);
    expect(isValidE164('9876543210')).toBe(false); // no "+": not E.164
    expect(isValidE164('')).toBe(false);
    expect(isValidE164(null)).toBe(false);
  });

  it('splits a stored E.164 into country + national display', () => {
    expect(splitE164('+919876543210')).toEqual({ country: 'IN', national: '98765 43210' });
    expect(splitE164('+971501234567')).toEqual({ country: 'AE', national: '050 123 4567' });
    expect(splitE164('+447400123456')).toEqual({ country: 'GB', national: '07400 123456' });
    expect(splitE164('')).toBeNull();
    expect(splitE164('9876543210')).toBeNull();
  });

  it('formats as typed, and switches country on a complete international number', () => {
    expect(formatTyped('9876543210', 'IN')).toEqual({ text: '98765 43210', country: null });
    expect(formatTyped('2025550123', 'US')).toEqual({ text: '(202) 555-0123', country: null });
    expect(formatTyped('+971 50 123 4567', 'IN')).toEqual({ text: '050 123 4567', country: 'AE' });
    // half-typed international stays international — no premature switch
    expect(formatTyped('+1 20', 'IN')).toMatchObject({ text: '+1 20', country: null, shownCountry: 'US' });
    expect(formatTyped('', 'IN')).toEqual({ text: '', country: null });
  });

  it('defaults the country: stored number, else visitor guess, else India', () => {
    geo.guess = 'GB';
    expect(defaultPhoneCountry('+971501234567')).toBe('AE');
    expect(defaultPhoneCountry('')).toBe('GB');
    geo.guess = null;
    expect(defaultPhoneCountry('')).toBe('IN');
    geo.guess = 'ZZ'; // garbage guess
    expect(defaultPhoneCountry('')).toBe('IN');
  });

  it('shows a local example as the placeholder', () => {
    expect(examplePlaceholder('IN')).toMatch(/^\d{5} \d{5}$/);
    expect(examplePlaceholder('US')).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
  });
});

describe('searchCountries — the names people actually type', () => {
  it('finds the UAE as uae, dubai, emirates, AE or 971', async () => {
    const { searchCountries } = await import('./phone');
    for (const q of ['uae', 'UAE', 'dubai', 'emirates', 'ae', '971', '+971']) {
      expect(searchCountries(q)[0]?.code).toBe('AE');
    }
  });

  it('finds the US as usa and the UK as uk', async () => {
    const { searchCountries } = await import('./phone');
    expect(searchCountries('usa')[0]?.code).toBe('US');
    expect(searchCountries('uk')[0]?.code).toBe('GB');
  });
});

describe('typo-tolerant short names and calling codes', () => {
  it('finds the UAE from "aue" and the US from "uas"', async () => {
    const { searchCountries } = await import('./phone');
    expect(searchCountries('aue')[0]?.code).toBe('AE');
    expect(searchCountries('uas')[0]?.code).toBe('US');
  });

  it('knows the country from the calling code alone', async () => {
    const { countryOfInternational } = await import('./phone');
    expect(countryOfInternational('+971')).toBe('AE');
    expect(countryOfInternational('+44')).toBe('GB');
    expect(countryOfInternational('+1')).toBe('US');
    expect(countryOfInternational('+91')).toBe('IN');
    expect(countryOfInternational('+')).toBeNull();
  });
});
