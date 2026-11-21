import { useEffect, useRef } from 'react';

/**
 * REFRESH WHEN SOMETHING CHANGED, NOT ON A CLOCK (20 Nov 2026).
 *
 * The live row (useLiveAccount) arrives every 1-5 s from the engine's cache.
 * It already says when anything worth re-fetching has happened: a trade opened
 * or closed (the set of open symbols, the day's trade count), a lock started
 * or ended, a lock was queued. So the screen's slower lists (trades, alerts,
 * rules) are re-fetched the moment that happens, and the timer becomes a
 * backstop:
 *
 * - live feed healthy: the backstop runs every `slowMs` (changes arrive by
 *   event, usually within 1-2 s, which is faster than the old fixed poll);
 * - live feed missing or stale: every `fastMs`, exactly the old poll, so
 *   nothing is ever slower than before;
 * - tab hidden: nothing runs. Coming back runs a full refresh at once.
 *
 * Event refreshes are spaced at least `minGapMs` apart (a trailing call
 * catches the last change), so a burst of fills, or a key that flaps, can
 * never turn into a request storm. Each change also gets one follow-up
 * `settleMs` later: the live row can show a close a moment before the trade
 * record is written, and the first re-read must not be the last word.
 */

/** No reading for this long means the live feed is not driving the screen. */
export const LIVE_HEALTHY_AGE_MS = 15_000;

/** True while live readings arrive often enough to be trusted for changes. */
export function liveIsHealthy(row, now = Date.now()) {
  if (!row || row.source !== 'server' || !Number.isFinite(row.receivedAt)) return false;
  if (!Number.isFinite(row.expectMs)) return false;
  // From the cache: a reading every 1-30 s depending on the page and whether
  // a trade is open. Healthy while the next one is not overdue.
  if (row.viaCache) return now - row.receivedAt <= row.expectMs + LIVE_HEALTHY_AGE_MS;
  // Pushes (~0) or a 5 s poll; a 30 s database fallback is not fresh enough
  // to replace the timer.
  if (now - row.receivedAt > LIVE_HEALTHY_AGE_MS) return false;
  return row.expectMs <= 5_000;
}

/**
 * The parts of a live row that mean "go and re-read the lists". P&L and
 * equity are left out on purpose: they move on every tick.
 */
export function liveChangeKey(row) {
  if (!row || row.source !== 'server') return null;
  const symbols = Object.keys(row.openPnl ?? {}).sort().join(',');
  const t = (iso) => (iso ? new Date(iso).getTime() : '');
  return [
    row.id ?? '',
    row.tradeCountToday ?? '',
    row.consecutiveLosses ?? '',
    t(row.cooldownUntil),
    row.cooldownReason ?? '',
    JSON.stringify(row.pendingLock ?? null),
    symbols,
  ].join('|');
}

function hidden() {
  return typeof document !== 'undefined' && document.hidden;
}

/**
 * @param {object} o
 * @param {(signal: AbortSignal, info: { full: boolean, first: boolean }) => unknown} o.load
 *        A full pass re-reads everything; a light pass (only with `light`) is
 *        the cheap part that keeps its old interval.
 * @param {boolean} [o.enabled]
 * @param {unknown} o.resetKey  Restart (abort + fresh first pass) when this changes.
 * @param {object|null} o.row   The live row driving the refresh.
 * @param {string} [o.extraKey] More "something changed" signal (e.g. newest alert id).
 * @param {number} o.fastMs     Backstop when the feed is not healthy (the old poll).
 * @param {number} o.slowMs     Backstop when the feed is healthy.
 * @param {boolean} [o.light]   Also call load({ full:false }) every fastMs between full passes.
 * @param {number} [o.minGapMs]
 * @param {number} [o.settleMs]
 * @returns {() => void} run a full pass now (after a mutation)
 */
export function useLiveDrivenRefresh({ load, enabled = true, resetKey, row, extraKey = '', fastMs, slowMs, light = false, minGapMs = 5_000, settleMs = 8_000 }) {
  const loadRef = useRef(load);
  const rowRef = useRef(row);
  useEffect(() => { loadRef.current = load; rowRef.current = row; });

  const runRef = useRef(() => {});
  const lastFullRef = useRef(0);
  const trailingRef = useRef(null);
  const settleRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const ctrl = new AbortController();
    let first = true;
    const full = () => {
      if (ctrl.signal.aborted) return;
      clearTimeout(trailingRef.current);
      trailingRef.current = null;
      lastFullRef.current = Date.now();
      const isFirst = first;
      first = false;
      loadRef.current(ctrl.signal, { full: true, first: isFirst });
    };
    runRef.current = full;
    full();
    const tick = setInterval(() => {
      if (hidden()) return;
      const every = liveIsHealthy(rowRef.current) ? slowMs : fastMs;
      // A little slack so a 20 s tick is not skipped for being 20 ms early.
      if (Date.now() - lastFullRef.current >= every - 500) full();
      else if (light) loadRef.current(ctrl.signal, { full: false, first: false });
    }, fastMs);
    const onVisible = () => { if (!hidden()) full(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ctrl.abort();
      clearInterval(tick);
      clearTimeout(trailingRef.current);
      trailingRef.current = null;
      clearTimeout(settleRef.current);
      settleRef.current = null;
      runRef.current = () => {};
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, resetKey, fastMs, slowMs, light]);

  // Something changed on the live row (or the extra signal): refresh now.
  const key = `${liveChangeKey(row) ?? ''}#${extraKey}`;
  const rowId = row?.id ?? null;
  const prevKeyRef = useRef(null);
  useEffect(() => {
    const prev = prevKeyRef.current;
    prevKeyRef.current = { key, rowId, resetKey };
    // The first reading, a row for another account, or a restart is not a
    // change: the first pass already ran (or is about to).
    if (!prev || prev.resetKey !== resetKey || prev.rowId !== rowId) return;
    if (prev.key === key || !enabled || hidden()) return;
    const gap = Date.now() - lastFullRef.current;
    if (gap >= minGapMs) runRef.current();
    else if (!trailingRef.current) {
      trailingRef.current = setTimeout(() => runRef.current(), minGapMs - gap);
    }
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => { settleRef.current = null; runRef.current(); }, Math.max(settleMs, minGapMs));
  }, [key, rowId, resetKey, enabled, minGapMs, settleMs]);

  return () => runRef.current();
}
