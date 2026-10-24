import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { detectCountry, guessCountrySync, loadRates, makeMoney, ratesSync } from '../lib/geo';
import { BAND_PRICES, bandForCountry, formatMoney } from '../lib/priceBands';

/**
 * The landing page's money: who is looking, and our rupee figures in their
 * currency. Only the homepage provides it — every other page (and anything that
 * renders a landing component outside the provider) gets plain rupees.
 */
const INR_PLAN = { monthly: 1299, quarterly: 3299, yearly: 8999 };
const MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };

/**
 * What a band pays, for the pricing cards: the price, the per-month figure and
 * the saving against monthly. India is the rupee plan; A and B are the USD
 * bands (lib/priceBands). Display only — checkout prices by signed country.
 */
function bandPricing(band) {
  const t = band === 'in' ? { currency: 'INR', ...INR_PLAN } : BAND_PRICES[band];
  const line = (interval) => {
    const price = t[interval];
    const n = MONTHS[interval];
    const perMonth = t.currency === 'INR' ? Math.round(price / n) : Math.round((price / n) * 100) / 100;
    return { price, perMonth, savingsPct: Math.max(0, Math.round((1 - price / (t.monthly * n)) * 100)) };
  };
  return { currency: t.currency, monthly: line('monthly'), quarterly: line('quarterly'), yearly: line('yearly') };
}

function moneyFor(band, rates) {
  const pricing = bandPricing(band);
  return {
    band,
    // Example amounts follow the money they pay in: rupees, or US dollars.
    ...makeMoney(pricing.currency, rates),
    pricing,
    /** "$29" / "₹1,299" — a band price is exact, never "≈". */
    plan: (interval, field = 'price') => formatMoney(pricing[interval]?.[field], pricing.currency),
  };
}

const INR_MONEY = { country: 'IN', region: 'in', ...moneyFor('in') };
const LandingMoneyContext = createContext(INR_MONEY);

// The prerenderer is headless Chrome (navigator.webdriver). Whatever timezone
// the build machine has must not decide what "/" says in its static HTML, so
// the snapshot is always the no-location default: global copy, US dollars.
const isPrerender = () => typeof navigator !== 'undefined' && navigator.webdriver === true;

/**
 * `forceIndia` is the /india page: rupees and Indian copy whatever the
 * visitor's location. Otherwise the region is "in" for Indian visitors and
 * "global" for everyone else — and "global" too before anything is known, which
 * is what the prerenderer (and so a crawler) sees on "/".
 */
export function LandingMoneyProvider({ forceIndia = false, children }) {
  const [country, setCountry] = useState(() => (forceIndia ? 'IN' : isPrerender() ? null : guessCountrySync()));
  const [rates, setRates] = useState(() => ratesSync());

  useEffect(() => {
    if (forceIndia || isPrerender()) return undefined;
    let live = true;
    detectCountry().then((c) => { if (live && c) setCountry(c); });
    loadRates().then((r) => { if (live) setRates(r); });
    return () => { live = false; };
  }, [forceIndia]);

  const value = useMemo(() => {
    const band = forceIndia ? 'in' : bandForCountry(country);
    return {
      country,
      region: band === 'in' ? 'in' : 'global',
      ...moneyFor(band, rates),
    };
  }, [forceIndia, country, rates]);

  return <LandingMoneyContext.Provider value={value}>{children}</LandingMoneyContext.Provider>;
}

export function useLandingMoney() {
  return useContext(LandingMoneyContext);
}
