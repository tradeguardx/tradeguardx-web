/**
 * Referral / influencer coupon code capture.
 *
 * - Captured from `?ref=CODE` on any URL (homepage, pricing, etc).
 * - Persisted in localStorage so the code survives navigation, tab switches,
 *   and same-browser sessions until checkout (or the 30-day TTL).
 * - Last-click wins: a fresh `?ref=` overwrites any existing stored code.
 * - The code is uppercased + alphanumeric-validated locally, but final
 *   validity is checked server-side at checkout (the backend looks it up in
 *   `influencer_profiles` and skips silently if it doesn't match).
 */

const STORAGE_KEY = 'tgx_referral_code';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CODE_PATTERN = /^[A-Z0-9]{2,16}$/;

function normalize(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase();
  return CODE_PATTERN.test(trimmed) ? trimmed : null;
}

function safeReadStorage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWriteStorage(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private mode / quota — ignore */
  }
}

function safeRemoveStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function storeReferralCode(rawCode) {
  const code = normalize(rawCode);
  if (!code) return null;
  safeWriteStorage(JSON.stringify({ code, expiresAt: Date.now() + MAX_AGE_MS }));
  return code;
}

/**
 * Read `?ref=...` from the current URL and persist it.
 *
 * Returns `null` if no valid `?ref=` param is present, otherwise
 * `{ code, isNew }` where `isNew` is true only when the captured code differs
 * from what was already stored — useful for triggering a one-time celebration
 * UI without re-firing on every route change while the URL still has the
 * param. Safe to call on every render.
 */
export function captureReferralFromUrl(search) {
  if (typeof window === 'undefined') return null;
  const query = search ?? window.location.search;
  if (!query) return null;
  const params = new URLSearchParams(query);
  const raw = params.get('ref');
  if (!raw) return null;
  const code = normalize(raw);
  if (!code) return null;
  const previous = getStoredReferralCode();
  storeReferralCode(code);
  return { code, isNew: previous !== code };
}

export function getStoredReferralCode() {
  const raw = safeReadStorage();
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    safeRemoveStorage();
    return null;
  }
  if (!parsed || typeof parsed.code !== 'string' || typeof parsed.expiresAt !== 'number') {
    safeRemoveStorage();
    return null;
  }
  if (parsed.expiresAt < Date.now()) {
    safeRemoveStorage();
    return null;
  }
  return normalize(parsed.code);
}

export function clearReferralCode() {
  safeRemoveStorage();
}

/*
 * "Pending bind": a code was captured and the server has not yet been told
 * who brought this person. Set on every capture; cleared on any 200 from
 * POST /payments/referral/bind (bound or not — the server has answered, and
 * first bind wins there anyway). A failed call leaves it set, so the next
 * signed-in load tries again.
 */
const PENDING_KEY = 'tgx_referral_bind_pending';

export function markReferralBindPending() {
  try { localStorage.setItem(PENDING_KEY, '1'); } catch { /* ignore */ }
}

export function isReferralBindPending() {
  try { return localStorage.getItem(PENDING_KEY) === '1'; } catch { return false; }
}

export function clearReferralBindPending() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

/**
 * Take `ref` out of the address bar once it is stored, keeping every other
 * param, the hash and the router's history state. A shared or bookmarked
 * URL then no longer carries somebody's code, and a reload does not
 * re-capture it. Returns true when it changed the URL.
 */
export function stripRefFromAddressBar() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return false;
  let url;
  try { url = new URL(window.location.href); } catch { return false; }
  if (!url.searchParams.has('ref')) return false;
  url.searchParams.delete('ref');
  const search = url.searchParams.toString();
  try {
    window.history.replaceState(window.history.state, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`);
  } catch {
    return false;
  }
  return true;
}
