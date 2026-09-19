/**
 * Promo code carried on a link — `?promo=CODE`.
 *
 * The promo email's button lands on /pricing?promo=CODE. Captured here and
 * kept in localStorage (30 days) so the code reaches checkout however the
 * user gets there afterwards. Dodo silently ignores a code that is never
 * sent, so relying on them to retype it from the email would quietly charge
 * full price. Same shape as lib/referralCode.js; an influencer `?ref=` still
 * wins at checkout because it also carries a commission.
 */

const STORAGE_KEY = 'tgx_link_promo_code';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_PATTERN = /^[A-Z0-9]{2,16}$/;

function normalize(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase();
  return CODE_PATTERN.test(trimmed) ? trimmed : null;
}

export function captureLinkPromoFromUrl(search) {
  if (typeof window === 'undefined') return null;
  const query = search ?? window.location.search;
  if (!query) return null;
  const code = normalize(new URLSearchParams(query).get('promo'));
  if (!code) return null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, expiresAt: Date.now() + MAX_AGE_MS }));
  } catch {
    /* private mode / quota — the code still applies for this page load via the URL */
  }
  return code;
}

export function getLinkPromoCode() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.code !== 'string' || parsed.expiresAt < Date.now()) return null;
    return normalize(parsed.code);
  } catch {
    return null;
  }
}
