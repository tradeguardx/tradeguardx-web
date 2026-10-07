/**
 * Read-only mirror sessions.
 *
 * An operator mints a short-lived token in the admin panel and opens the
 * dashboard at `/dashboard#mirror=<token>`. The app then renders THAT USER's
 * account — their guard state, their rules, their positions, the exact copy
 * they are reading — with nothing mocked and nothing to keep in sync.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THE TOKEN IS HELD IN MEMORY AND NOWHERE ELSE.
 *
 * Not localStorage, not sessionStorage, not a cookie. The reason is specific:
 * a mirror token looks exactly like a user session to every service, so one
 * that survived a reload would become a persistent login as someone else,
 * sitting in a browser the operator then walks away from. Keeping it in a
 * module variable means closing the tab ends it, and a refresh ends it too.
 *
 * It is read from the URL FRAGMENT because a fragment is never sent to a
 * server — it stays out of access logs, proxy logs and the Referer header. A
 * query string would be in all four. It is also stripped from the address bar
 * immediately, so the token does not end up in browser history or a screenshot.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * READ-ONLY IS NOT ENFORCED HERE. Every service refuses any non-GET request
 * carrying the `tgx_mirror` claim, at the HTTP wrapper, before a handler runs.
 * What this file does is make that visible — a banner, and buttons that do not
 * pretend. If this file were the only protection it would be worth nothing:
 * anyone with the token and a terminal could POST whatever they liked.
 */

let token = null;
let claims = null;

/** Decode a JWT payload without verifying. Display only. */
function payloadOf(jwt) {
  try {
    const part = String(jwt).split('.')[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Called once, as early as possible. Picks the token out of the fragment,
 * clears the fragment, and keeps the token in memory.
 *
 * Returns true when a mirror session was adopted.
 */
export function adoptMirrorFromUrl() {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash ?? '';
  if (!hash.includes('mirror=')) return false;

  const found = new URLSearchParams(hash.replace(/^#/, '')).get('mirror');
  if (!found) return false;

  const p = payloadOf(found);
  // A token that is not a mirror token must never be adopted this way. If it
  // were, this fragment would be a way to hand the app any session at all.
  if (!p || p.tgx_mirror !== true || !p.sub) return false;

  // Already expired tokens are refused here so the operator gets the banner's
  // "expired" state rather than a dashboard full of 401s.
  const expired = typeof p.exp === 'number' && p.exp * 1000 <= Date.now();

  token = found;
  claims = { ...p, expired };

  // Out of the address bar before the next paint.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
}

export function isMirroring() {
  return token != null;
}

/**
 * A session object shaped like Supabase's, so every existing code path —
 * `session.access_token`, `session.user.id` — works untouched.
 */
export function mirrorSession() {
  if (!token || !claims) return null;
  return {
    access_token: token,
    token_type: 'bearer',
    expires_at: claims.exp ?? null,
    user: {
      id: claims.sub,
      email: claims.email ?? null,
      user_metadata: {},
      app_metadata: { tgx_mirror: true },
    },
  };
}

export function mirrorInfo() {
  if (!claims) return null;
  return {
    userId: claims.sub,
    email: claims.email ?? null,
    by: claims.tgx_mirror_by ?? null,
    sessionId: claims.tgx_mirror_session ?? null,
    expiresAt: claims.exp ? new Date(claims.exp * 1000) : null,
    expired: Boolean(claims.expired),
  };
}

/** Drops the token. Only a reload or closing the tab can bring one back. */
export function endMirror() {
  token = null;
  claims = null;
}
