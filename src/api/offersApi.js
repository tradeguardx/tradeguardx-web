import { apiGet } from './httpClient';
import { resolvePaymentsApiBaseUrl } from './config';

/**
 * The site-wide offer (e.g. Diwali), run from the admin panel and served by
 * payments-service: `GET {payments}/offers/active` → `{ data: { offer } }`.
 * See tradeguardx-wt/OFFERS_CONTRACT.md.
 *
 * It used to come from VITE_ACTIVE_PROMO_* at build time, which meant a stale
 * Vercel variable could keep advertising a code long after it had expired.
 * Nothing here reads env any more: no API answer, no offer.
 *
 * FAILS CLOSED. Any error, a timeout, or a malformed body is "no offer". A
 * banner promising a discount checkout may not give is worse than no banner.
 */

const TIMEOUT_MS = 5000;
const INTERVALS = ['monthly', 'quarterly', 'yearly'];
const CODE = /^[A-Z0-9]{3,16}$/;

/** The public offer, checked field by field. Anything off → null. */
export function normalizeOffer(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const code = String(raw.code ?? '').trim().toUpperCase();
  if (!CODE.test(code)) return null;
  const discountPct = Number(raw.discountPct);
  if (!Number.isInteger(discountPct) || discountPct < 1 || discountPct > 90) return null;
  const endsAt = Date.parse(raw.endsAt);
  if (!Number.isFinite(endsAt)) return null;
  const startsAt = raw.startsAt ? Date.parse(raw.startsAt) : NaN;
  const intervals = Array.isArray(raw.intervals)
    ? INTERVALS.filter((iv) => raw.intervals.includes(iv))
    : [];
  if (intervals.length === 0) return null;
  const cycles = raw.cycles == null ? null : Number(raw.cycles);
  if (cycles !== null && !(Number.isInteger(cycles) && cycles > 0)) return null;
  const audience = raw.audience === 'all' ? 'all' : 'in';
  const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    code,
    discountPct,
    cycles,
    intervals,
    audience,
    headline: text(raw.headline) ?? 'Limited offer',
    title: text(raw.title),
    theme: raw.theme === 'diwali' ? 'diwali' : null,
    startsAt: Number.isFinite(startsAt) ? startsAt : null,
    endsAt,
  };
}

/** One request, no cache in front of it. Throws on failure. */
export async function fetchActiveOffer({ signal } = {}) {
  const payload = await apiGet('/offers/active', { baseUrl: resolvePaymentsApiBaseUrl(), signal });
  return normalizeOffer(payload?.data?.offer);
}

let pending = null;

/**
 * The offer for this page load: one request however many components ask,
 * resolved to `null` on any failure or after TIMEOUT_MS.
 *
 * Skipped under a headless renderer (`navigator.webdriver`): the build
 * prerenders '/' and '/pricing' with Puppeteer, and an offer fetched then
 * would be baked into the static HTML and shown before the app boots — for
 * as long as that build is live, ended offer or not.
 */
export function loadActiveOffer() {
  if (pending) return pending;
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    pending = Promise.resolve(null);
    return pending;
  }
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => { ctrl?.abort(); resolve(null); }, TIMEOUT_MS);
  });
  pending = Promise.race([
    fetchActiveOffer({ signal: ctrl?.signal }).catch(() => null),
    timeout,
  ]).finally(() => clearTimeout(timer));
  return pending;
}

/** Tests only: forget the cached request. */
export function __resetOfferCache() {
  pending = null;
}
