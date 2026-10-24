import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currencyFor, detectCountry, guessCountrySync, loadRates, makeMoney, ratesSync } from '../lib/geo';

/**
 * The landing page's money: who is looking, and our rupee figures in their
 * currency. Only the homepage provides it — every other page (and anything that
 * renders a landing component outside the provider) gets plain rupees.
 */
const INR_MONEY = { country: 'IN', region: 'in', ...makeMoney('INR') };
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
    const currency = forceIndia ? 'INR' : currencyFor(country);
    return {
      country,
      region: forceIndia || country === 'IN' ? 'in' : 'global',
      ...makeMoney(currency, rates),
    };
  }, [forceIndia, country, rates]);

  return <LandingMoneyContext.Provider value={value}>{children}</LandingMoneyContext.Provider>;
}

export function useLandingMoney() {
  return useContext(LandingMoneyContext);
}
