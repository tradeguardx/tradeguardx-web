/**
 * First-party analytics — PRODUCER side.
 *
 * Fire-and-forget emitter that POSTs typed events to the analytics service's
 * public ingest endpoint (see ../../../tradeguardx-analytics-service). The
 * ingest Lambda enriches server-only fields (IP hash, country) and fans the
 * event into DynamoDB. No secret is needed here — the endpoint is public by
 * design (like Plausible/GA) and rate-limited at the API Gateway.
 *
 * Runs ALONGSIDE Vercel Web Analytics: Vercel gives quick page stats, this
 * gives the owned, queryable funnel we render in the admin panel.
 *
 * OPT-IN: emits happen only when `VITE_ANALYTICS_INGEST_URL` is set. Unset (the
 * default, incl. local dev) makes every emit a silent no-op — so a dev machine
 * can never pollute production counters. Every call is best-effort and
 * non-blocking; failures are swallowed.
 *
 * Event contract MUST stay in sync with
 * tradeguardx-analytics-service/src/events/types.ts.
 */

const INGEST_URL = (import.meta.env.VITE_ANALYTICS_INGEST_URL || '').trim();

const VID_KEY = 'tgx_vid';
const IST_OFFSET_MIN = 330;

/** Authenticated user id, attached to events once we know it. */
let currentUserId = null;

export function isAnalyticsEnabled() {
  return Boolean(INGEST_URL);
}

/** Call on login/session-restore so subsequent events carry the user id. */
export function setAnalyticsUser(userId) {
  currentUserId = userId || null;
}

function uuid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Persistent first-party visitor id (localStorage). Stable across sessions —
 * this is THE anonymous identity behind unique-visitor and new/returning.
 * Returns `{ vid, isNew }`; isNew is true only on the very first visit ever.
 */
function visitor() {
  try {
    const existing = localStorage.getItem(VID_KEY);
    if (existing) return { vid: existing, isNew: false };
    const vid = uuid();
    localStorage.setItem(VID_KEY, vid);
    return { vid, isNew: true };
  } catch {
    // Private mode / storage blocked — emit without a vid (counts as a
    // pageview, just not a unique visitor).
    return { vid: undefined, isNew: false };
  }
}

/** The analytics "day" is IST — matches the service's bucketing. */
function istDate(ts = Date.now()) {
  return new Date(ts + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** Coarse device class from the UA — mobile vs desktop UX comparison. */
function device() {
  const ua = (navigator.userAgent || '').toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))|kindle|silk|playbook/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|phone|blackberry|opera mini|iemobile/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Low-cardinality traffic source from the referrer: "direct", "internal", or
 * the referring hostname (google.com, x.com, …).
 */
function originOf() {
  const ref = document.referrer || '';
  if (!ref) return { origin: 'direct', ref: undefined };
  try {
    const url = new URL(ref);
    if (url.hostname === location.hostname) return { origin: 'internal', ref: undefined };
    return { origin: url.hostname.replace(/^www\./, ''), ref };
  } catch {
    return { origin: 'direct', ref: undefined };
  }
}

/**
 * POST an event. Uses sendBeacon when available so the event survives a page
 * unload (nav away / tab close); falls back to keepalive fetch. Never throws,
 * never blocks — do not await this on a user-visible path.
 */
function send(envelope) {
  if (!INGEST_URL) return;
  try {
    const body = JSON.stringify(envelope);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(INGEST_URL, blob)) return;
    }
    fetch(INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
  } catch {
    /* analytics must never break the app */
  }
}

function emit(type, extra = {}) {
  if (!INGEST_URL) return;
  send({
    id: uuid(),
    type,
    ts: Date.now(),
    date: istDate(),
    userId: currentUserId ?? undefined,
    ...extra,
  });
}

/** A page/route view. Called on every SPA navigation. */
export function trackPageview(path) {
  const { vid, isNew } = visitor();
  const { origin, ref } = originOf();
  emit('pageview', {
    vid,
    isNew,
    path: path || location.pathname,
    origin,
    ref,
    device: device(),
  });
}

/** New account created. */
export function trackSignup(userId) {
  const { vid } = visitor();
  emit('signup', { vid, userId: userId ?? currentUserId ?? undefined });
}

/** Existing user signed in. */
export function trackLogin(userId) {
  const { vid } = visitor();
  emit('login', { vid, userId: userId ?? currentUserId ?? undefined });
}

/** A call-to-action was clicked. `source` labels which one (hero, pricing, …). */
export function trackCtaClick(source) {
  const { vid } = visitor();
  emit('cta_click', { vid, props: { source: source || 'unknown' } });
}

/** User was sent to the payment provider's checkout. */
export function trackCheckoutStarted(plan) {
  const { vid } = visitor();
  emit('checkout_started', { vid, props: { plan: plan || 'unknown' } });
}
