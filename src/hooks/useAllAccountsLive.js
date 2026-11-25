import { useEffect, useRef, useState } from 'react';
import { fetchLive, rowFromLive } from '../api/liveApi';

/** How often every account is checked in the cache (one request, all accounts). */
export const ALL_LIVE_MS = 20_000;
const MAX_PER_CALL = 20;
const NONE = Object.freeze({ ok: false, open: Object.freeze({}), alertsKey: '', missing: Object.freeze([]) });

/**
 * EVERY ACCOUNT, FROM THE CACHE, IN ONE CALL (21 Nov 2026).
 *
 * Every ~20 s, cache only (`fallback=none`: never a database read), for all
 * the user's accounts:
 * - each account's lock goes to `onRows` (the switcher's lock dots), which
 *   the 30 s account-list database poll used to provide;
 * - open-trade counts, for the "● 13 open" marker on accounts not on screen;
 * - `alertsKey`, the newest alert stamp per account: when it moves, the
 *   unread alerts are re-read (instead of every 20 s from the database).
 *
 * `ok` is true only when the cache answered for EVERY account with change
 * stamps. Anything less (an account with no snapshot, the cache down, an
 * engine without stamps yet) and the old database polls stay on, so this can
 * only ever make the screen quieter, never staler.
 */
export function useAllAccountsLive({ accessToken, accountIds, onRows }) {
  const [state, setState] = useState({ ...NONE, forKey: null });
  const onRowsRef = useRef(onRows);
  useEffect(() => { onRowsRef.current = onRows; }, [onRows]);
  const key = [...new Set(accountIds.filter(Boolean))].sort().join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (!accessToken || ids.length === 0) return undefined;
    let cancelled = false;
    let stopped = false;
    const run = async () => {
      if (cancelled || stopped) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const chunks = [];
        for (let i = 0; i < ids.length; i += MAX_PER_CALL) chunks.push(ids.slice(i, i + MAX_PER_CALL));
        const results = await Promise.all(chunks.map((c) => fetchLive({ accessToken, accountIds: c, cacheOnly: true })));
        if (cancelled) return;
        const snaps = results.flatMap((r) => r.accounts);
        const missing = results.flatMap((r) => r.missing);
        const cacheOk = results.every((r) => r.cache === 'ok');
        const rows = snaps.map((s) => rowFromLive(s)).filter(Boolean);
        onRowsRef.current?.(rows);
        const open = {};
        for (const r of rows) {
          const n = r.livePositions?.length ?? Object.keys(r.openPnl ?? {}).length;
          if (n > 0) open[r.id] = n;
        }
        const alertsKey = rows.map((r) => `${r.id}:${r.ver?.alerts ?? ''}`).sort().join(',');
        const ok = cacheOk && missing.length === 0 && rows.length === ids.length && rows.every((r) => r.ver && r.ver.alerts != null);
        setState({ ok, open, alertsKey, missing, forKey: key });
      } catch (err) {
        if (cancelled) return;
        // A rejected login does not fix itself; a new token restarts this.
        if (err?.status === 401) stopped = true;
        setState((s) => (s.ok ? { ...s, ok: false } : s));
      }
    };
    run();
    const id = setInterval(run, ALL_LIVE_MS);
    const onVisible = () => { if (typeof document !== 'undefined' && !document.hidden) run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [accessToken, key]);

  // Only an answer for exactly these accounts counts: a new or removed
  // account is not covered until it has been checked. No accounts (or no
  // login): nothing is covered, so the old polls stay on.
  return key && accessToken && state.forKey === key ? state : NONE;
}
