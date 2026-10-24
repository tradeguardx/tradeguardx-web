import { detectCountry, guessCountrySync } from './geo';

/**
 * Who pays what — a DISPLAY copy of payments-service src/config/priceBands.ts.
 *
 *   India  → rupees (₹1,299 / ₹3,299 / ₹8,999)
 *   Band A → $29 / $75 / $249 — the 48 countries below
 *   Band B → $15 / $39 / $129 — everyone else
 *
 * Checkout decides the band itself from a country Vercel signed, so if these
 * lists ever drift, a page shows the wrong price but nobody is charged it.
 * Keep them in step anyway.
 */

export const BAND_A_COUNTRIES = new Set([
  'US', 'CA', 'GB', 'IE', 'DE', 'FR', 'NL', 'BE', 'LU', 'AT', 'CH', 'IT', 'ES', 'PT', 'MC', 'LI', 'AD',
  'DK', 'SE', 'NO', 'FI', 'IS', 'CZ', 'PL', 'EE', 'LV', 'LT', 'SK', 'SI', 'HR', 'HU', 'GR', 'CY', 'MT',
  'AU', 'NZ', 'JP', 'KR', 'TW', 'SG', 'HK', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL',
]);

/** Display fallback when the pricing API has no bands (it normally does). */
export const BAND_PRICES = {
  a: { currency: 'USD', monthly: 29, quarterly: 75, yearly: 249 },
  b: { currency: 'USD', monthly: 15, quarterly: 39, yearly: 129 },
};

/** "in" | "a" | "b". Unknown country → "a" (list price), as checkout does. */
export function bandForCountry(country) {
  const c = String(country ?? '').trim().toUpperCase();
  if (c === 'IN') return 'in';
  if (!/^[A-Z]{2}$/.test(c)) return 'a';
  return BAND_A_COUNTRIES.has(c) ? 'a' : 'b';
}

export const currencyForBand = (band) => (band === 'in' ? 'INR' : 'USD');

/**
 * ₹1,299 / ₹1,24,900 for rupees; $29 / $20.75 for dollars (cents only when
 * there are any, so whole prices stay whole).
 */
export function formatMoney(amount, currency = 'INR') {
  if (!Number.isFinite(amount)) return '—';
  if (currency === 'INR') return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  const cents = Math.round(amount * 100) % 100 !== 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** The visitor's band now, from what is known without the network. */
export function bandSync() {
  return bandForCountry(guessCountrySync());
}

/** The visitor's band once /api/geo has answered. */
export async function detectBand() {
  return bandForCountry(await detectCountry());
}

/**
 * A plan from GET /pricing/plans, re-priced for a band: `intervals` and
 * `priceMonthly` become that band's, and `currency` says which money it is.
 * The rupee prices stay what the API sent for India or when the API has no
 * entry for the band.
 */
export function planForBand(plan, band) {
  if (!plan) return plan;
  const b = band !== 'in' ? plan.bands?.[band] : null;
  if (!b?.intervals?.length) {
    if (band === 'in' || !Number(plan.priceMonthly)) return { ...plan, currency: 'INR' };
    // API without bands for a paid plan abroad: use the built-in table.
    const t = BAND_PRICES[band];
    const months = { monthly: 1, quarterly: 3, yearly: 12 };
    const intervals = (plan.intervals ?? []).map((iv) => {
      const price = t[iv.interval] ?? t.monthly;
      const n = months[iv.interval] ?? 1;
      return { ...iv, price, perMonth: Math.round((price / n) * 100) / 100, savingsPct: Math.max(0, Math.round((1 - price / (t.monthly * n)) * 100)) };
    });
    return { ...plan, priceMonthly: t.monthly, intervals, currency: t.currency };
  }
  const monthly = b.intervals.find((iv) => iv.interval === 'monthly');
  return { ...plan, priceMonthly: monthly?.price ?? plan.priceMonthly, intervals: b.intervals, currency: b.currency };
}
