/**
 * WHICH ROUTE LIVE NUMBERS TAKE (Phase 3a switch).
 *
 *   'realtime': Supabase Realtime + a 30 s snapshot poll (the old way).
 *   'poll':     GET /user/live about once a second, served from the engine's
 *               ElastiCache snapshots. Postgres is not involved.
 *
 * Resolution, first match wins:
 *   1. `?live=poll` or `?live=realtime` in the URL, remembered in this browser
 *      (how the owner turns it on for himself first);
 *   2. this browser's remembered choice;
 *   3. VITE_LIVE_TRANSPORT at build time ('realtime' turns it off for everyone);
 *   4. 'poll': on for everyone since 20 Nov 2026 (owner: "lets go live").
 */
const KEY = 'tgx.liveTransport';
const VALID = new Set(['poll', 'realtime']);

export function liveTransport() {
  try {
    const q = new URLSearchParams(window.location.search).get('live');
    if (VALID.has(q)) {
      localStorage.setItem(KEY, q);
      return q;
    }
    const saved = localStorage.getItem(KEY);
    if (VALID.has(saved)) return saved;
  } catch {
    /* private mode or no window: fall through */
  }
  const env = String(import.meta.env.VITE_LIVE_TRANSPORT ?? '').trim();
  return VALID.has(env) ? env : 'poll';
}

/** Poll cadence: 1 s with a trade open, 5 s when flat. A hidden tab polls nothing. */
export const LIVE_POLL_OPEN_MS = 1_000;
export const LIVE_POLL_FLAT_MS = 5_000;
/**
 * No engine is watching the account (no key, no plan, key deleted), so the
 * cache has no snapshot and the API answers from the database. Nothing there
 * changes second to second; asking every 5 s would only add database reads.
 */
export const LIVE_POLL_UNWATCHED_MS = 30_000;

/*
 * PAGES THAT DO NOT SHOW LIVE NUMBERS (21 Nov 2026).
 *
 * Only Overview and Live guard show P&L moving. Every other dashboard page
 * (Journal, Tax, Billing, Settings…) uses the live row for the shell's
 * Armed / Locked pill and the lock banner alone, and a lock is a rare event,
 * so there it is read every 15 s with a trade open and 30 s when flat.
 * Enforcement is on the server and is not affected. Coming back to a live
 * page polls at once.
 */
export const LIVE_POLL_BACKGROUND_OPEN_MS = 15_000;
export const LIVE_POLL_BACKGROUND_FLAT_MS = 30_000;

/** True on the pages that show live numbers (and the dashboard landing). */
export function isLivePage(pathname = '') {
  const p = String(pathname).replace(/\/+$/, '');
  return p === '/dashboard' || p.startsWith('/dashboard/overview') || p.startsWith('/dashboard/live');
}
