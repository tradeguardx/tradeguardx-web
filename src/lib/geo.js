/**
 * Where a landing-page visitor is, and what our rupee figures are in their money.
 *
 * Ported from unknow.chat's lib/geo.ts, with one change: the country comes from
 * our own /api/geo (Vercel's x-vercel-ip-country header, read at the edge)
 * instead of a third-party IP lookup, so no visitor IP leaves our hosting.
 *
 * Display only. Checkout is still billed in INR — every converted price is shown
 * with "≈" and the page says what the card is actually charged.
 *
 * Order for the country:
 *   1. a cached answer from this device (7 days — long enough to skip the
 *      network on repeat visits, short enough to follow someone who moved);
 *   2. synchronously, a guess from the device timezone and language, so an
 *      Indian visitor never sees a dollar price flash before the rupee one;
 *   3. /api/geo, which replaces the guess.
 */

const COUNTRY_KEY = 'tgx:country:v1';
const RATES_KEY = 'tgx:fx-inr:v1';
const COUNTRY_TTL_MS = 7 * 24 * 3600 * 1000;
const RATES_TTL_MS = 24 * 3600 * 1000;

/**
 * Units of each currency per 1 INR (open.er-api.com, 24 Oct 2026). Only used
 * until /api/fx answers, or if it never does — close is good enough, the page
 * says "≈" either way.
 */
export const FALLBACK_RATES = {
  INR: 1,
  USD: 0.0105,
  EUR: 0.00941,
  GBP: 0.00788,
  AUD: 0.015,
  CAD: 0.0148,
  SGD: 0.0135,
  AED: 0.0386,
  SAR: 0.0395,
  QAR: 0.0383,
  KWD: 0.00327,
  JPY: 1.65,
  CNY: 0.0704,
  HKD: 0.0826,
  KRW: 13.9,
  MYR: 0.0431,
  IDR: 190,
  THB: 0.356,
  PHP: 0.669,
  VND: 272,
  PKR: 2.92,
  BDT: 1.3,
  LKR: 3.5,
  NPR: 1.6,
  NGN: 14.2,
  KES: 1.37,
  ZAR: 0.175,
  BRL: 0.0532,
  MXN: 0.197,
  TRY: 0.524,
  CHF: 0.00869,
  SEK: 0.105,
  NOK: 0.0984,
  DKK: 0.0703,
  PLN: 0.0414,
  NZD: 0.0185,
  ILS: 0.0327,
  EGP: 0.583,
  UAH: 0.476,
  RUB: 0.858,
};

const EURO = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'];

const COUNTRY_CURRENCY = {
  IN: 'INR', US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', SG: 'SGD', AE: 'AED',
  SA: 'SAR', QA: 'QAR', KW: 'KWD', JP: 'JPY', CN: 'CNY', HK: 'HKD', KR: 'KRW',
  MY: 'MYR', ID: 'IDR', TH: 'THB', PH: 'PHP', VN: 'VND', PK: 'PKR', BD: 'BDT',
  LK: 'LKR', NP: 'NPR', NG: 'NGN', KE: 'KES', ZA: 'ZAR', BR: 'BRL', MX: 'MXN',
  TR: 'TRY', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', NZ: 'NZD',
  IL: 'ILS', EG: 'EGP', UA: 'UAH', RU: 'RUB',
  ...Object.fromEntries(EURO.map((c) => [c, 'EUR'])),
};

/** Everything we have no rate or mapping for is shown in US dollars. */
export function currencyFor(country) {
  return COUNTRY_CURRENCY[country] ?? 'USD';
}

const TZ_COUNTRY = { 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN' };

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / blocked storage — the page still works, it just asks again */
  }
}

/** The best answer available without the network. Null when there is no hint at all. */
export function guessCountrySync() {
  const cached = readJson(COUNTRY_KEY);
  if (cached && /^[A-Z]{2}$/.test(cached.c) && Date.now() - cached.t < COUNTRY_TTL_MS) return cached.c;
  try {
    const tz = TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone];
    if (tz) return tz;
  } catch {
    /* no Intl timezone */
  }
  // "en-GB" → GB. Weaker than the timezone (plenty of Indians run en-US), so
  // it only decides when the timezone said nothing.
  if (typeof navigator !== 'undefined') {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const region = /^[a-z]{2,3}-([A-Z]{2})$/.exec(lang ?? '')?.[1];
      if (region) return region;
    }
  }
  return null;
}

async function getJson(url, ms = 2500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

let countryPromise;

/** The visitor's country from their IP, falling back to the sync guess. */
export function detectCountry() {
  countryPromise ??= (async () => {
    const cached = readJson(COUNTRY_KEY);
    if (cached && /^[A-Z]{2}$/.test(cached.c) && Date.now() - cached.t < COUNTRY_TTL_MS) return cached.c;
    const res = await getJson('/api/geo');
    const c = typeof res?.country === 'string' ? res.country.toUpperCase() : null;
    if (c && /^[A-Z]{2}$/.test(c)) {
      writeJson(COUNTRY_KEY, { c, t: Date.now() });
      return c;
    }
    return guessCountrySync();
  })();
  return countryPromise;
}

/** Cached or fallback INR rates, synchronously. */
export function ratesSync() {
  const cached = readJson(RATES_KEY);
  return cached?.rates && typeof cached.rates.USD === 'number' ? { ...FALLBACK_RATES, ...cached.rates } : FALLBACK_RATES;
}

let ratesPromise;

/** INR → everything, from /api/fx (CDN-cached), refreshed at most daily per device. */
export function loadRates() {
  ratesPromise ??= (async () => {
    const cached = readJson(RATES_KEY);
    if (cached?.rates && Date.now() - cached.t < RATES_TTL_MS) return { ...FALLBACK_RATES, ...cached.rates };
    const res = await getJson('/api/fx', 4000);
    const rates = res?.rates;
    if (rates && typeof rates.USD === 'number' && rates.USD > 0) {
      writeJson(RATES_KEY, { rates, t: Date.now() });
      return { ...FALLBACK_RATES, ...rates };
    }
    return ratesSync();
  })();
  return ratesPromise;
}

/** Two significant figures: 0.011524 → 0.012, 1.7234 → 1.7. */
function twoSig(x) {
  if (!(x > 0)) return x;
  const p = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / p) * p;
}

/**
 * Formatters for one currency.
 *
 * `price(inr)` converts at the real rate — it is a price, so it should be as
 * close as we can make it. `example(inr)` is for the illustrative figures (a
 * ₹25,000 daily cap): those use the rate rounded to two significant figures, so
 * a round rupee number stays round ($300, not $287) and the story's figures stay
 * consistent with each other.
 */
export function makeMoney(currency, rates = FALLBACK_RATES) {
  const isInr = currency === 'INR';
  const rate = rates[currency] ?? rates.USD ?? FALLBACK_RATES.USD;
  const cur = rates[currency] ? currency : 'USD';
  const exampleRate = isInr ? 1 : twoSig(rate);

  let fmt;
  try {
    fmt = new Intl.NumberFormat(isInr ? 'en-IN' : 'en', {
      style: 'currency',
      currency: cur,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    });
  } catch {
    fmt = { format: (n) => `${cur} ${Math.round(n).toLocaleString('en')}` };
  }
  const format = (n) => fmt.format(n);
  const symbol = (fmt.formatToParts?.(0).find((p) => p.type === 'currency')?.value) ?? cur;

  return {
    currency: cur,
    isInr,
    symbol,
    format,
    /** A rupee amount at the real rate, rounded to whole units. */
    priceValue: (inr) => (isInr ? inr : Math.round(inr * rate)),
    /** "₹1,299" in India, "≈ $15" elsewhere. */
    price: (inr) => (isInr ? format(inr) : `≈ ${format(Math.round(inr * rate) || 1)}`),
    /** A rupee example amount in round local units. */
    exampleValue: (inr) => (isInr ? inr : Math.round(inr * exampleRate)),
    example: (inr) => format(isInr ? inr : Math.round(inr * exampleRate)),
  };
}
