/**
 * How fresh is the live row? The one answer every live figure is labelled by.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY THIS ONLY JUDGES AN ACCOUNT WITH A POSITION OPEN.
 *
 * The engine's EquityPersister flushes each account every 3 s, but it SKIPS
 * the write when nothing changed (equity, trade count, streak, P&L) — so a
 * flat account's `equity_updated_at` can sit still for hours while the engine
 * is perfectly healthy. Reading age alone would call every quiet, flat
 * account "Reconnecting", which is the false alarm this product must never
 * raise. With a position open the mark price moves the unrealised P&L on
 * nearly every tick, so a write every few seconds is expected and silence
 * really does mean the feed has stopped (engine restart, dropped exchange
 * socket). That is the only case where age is evidence, so it is the only
 * case judged. A flat account is 'idle': nothing to update, nothing claimed.
 *
 * Positions unknown (not fetched yet) is treated like flat — no verdict from
 * unloaded state.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Age is measured on THIS browser's clock where it can be: `changedAt` is the
 * local time `equity_updated_at` last moved (tracked by useLiveAccount).
 * A phone whose clock is 20 s off would otherwise read every fresh row as
 * "Delayed". The server timestamp is used only until the first change is seen.
 */

export const FEED = {
  /** No row from the server yet — show skeletons, never a figure. */
  LOADING: 'loading',
  /** Row is in and current. */
  LIVE: 'live',
  /** Row is in, the account is flat; nothing to judge freshness by. */
  IDLE: 'idle',
  /** A position is open and no update for > DELAYED_MS. */
  DELAYED: 'delayed',
  /** A position is open and no update for > RECONNECTING_MS. */
  RECONNECTING: 'reconnecting',
};

export const DELAYED_MS = 15_000;
export const RECONNECTING_MS = 60_000;

/**
 * @param {object|null} live    useLiveAccount's row (has `source`, `equityUpdatedAt`)
 * @param {object} o
 * @param {number} o.now
 * @param {boolean|null} o.positionsOpen  true/false, or null while unknown
 * @param {number|null} [o.changedAt]     local ms when equityUpdatedAt last changed (defaults to live.changedAt)
 * @returns {{ status: string, ageMs: number|null }}
 */
export function feedOf(live, { now = Date.now(), positionsOpen = null, changedAt } = {}) {
  if (!live || live.source !== 'server') return { status: FEED.LOADING, ageMs: null };
  if (changedAt === undefined) changedAt = live.changedAt ?? null;
  const serverAt = live.equityUpdatedAt ? new Date(live.equityUpdatedAt).getTime() : null;
  const at = Number.isFinite(changedAt) ? changedAt : Number.isFinite(serverAt) ? serverAt : null;
  const ageMs = at != null ? Math.max(0, now - at) : null;
  if (positionsOpen !== true) return { status: FEED.IDLE, ageMs };
  // An open position and no equity reading at all: unknown, not stale.
  if (ageMs == null) return { status: FEED.LIVE, ageMs };
  // Allow for how this browser is fed: a reading every 30 s by poll is not
  // a stalled engine (expectMs from useLiveAccount; 0 while pushes arrive).
  const slack = Number.isFinite(live.expectMs) ? live.expectMs : 0;
  if (ageMs > RECONNECTING_MS + slack) return { status: FEED.RECONNECTING, ageMs };
  if (ageMs > DELAYED_MS + slack) return { status: FEED.DELAYED, ageMs };
  return { status: FEED.LIVE, ageMs };
}

/** "8s ago", "3m ago", "2h ago" — for the "Updated …" label. */
export function agoLabel(ms) {
  if (ms == null || !Number.isFinite(ms)) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
