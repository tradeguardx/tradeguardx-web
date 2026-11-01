import { useEffect, useState } from 'react';
import { loadActiveOffer } from '../api/offersApi';
import { detectBand } from '../lib/priceBands';
import { offerApplies } from '../lib/siteOffer';

/* One band lookup per page load, shared like the offer request. */
let bandPromise = null;
const loadBand = () => {
  if (!bandPromise) bandPromise = detectBand().catch(() => 'a');
  return bandPromise;
};

/** Tests only. */
export function __resetBandCache() {
  bandPromise = null;
}

/* setTimeout overflows past ~24.8 days; an offer ending later than that is
   re-checked on the next page load instead. */
const MAX_DELAY = 2 ** 31 - 1;

/**
 * `{ ready, offer, band }` — `offer` is the API offer ONLY once it is known
 * to apply to this visitor (before endsAt, and audience 'all' or band 'in').
 *
 * `ready` stays false until BOTH the offer and the band have answered, and
 * `offer` is null until then: nothing is shown from unloaded state, so an
 * Indian-only offer never flashes for a visitor abroad. Flips back to null at
 * endsAt, so a page left open does not keep quoting an ended price.
 */
export function useActiveOffer() {
  const [state, setState] = useState({ ready: false, offer: null, band: null });

  useEffect(() => {
    let alive = true;
    let timer;
    Promise.all([loadActiveOffer(), loadBand()]).then(([offer, band]) => {
      if (!alive) return;
      const ok = offerApplies(offer, band);
      setState({ ready: true, offer: ok ? offer : null, band });
      if (ok) {
        const ms = offer.endsAt - Date.now();
        if (ms < MAX_DELAY) {
          timer = setTimeout(() => { if (alive) setState((s) => ({ ...s, offer: null })); }, Math.max(0, ms));
        }
      }
    });
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  return state;
}
