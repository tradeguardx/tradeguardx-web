import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRevengeStatus, unlockRevengeReport } from '../api/syncApi';

/**
 * Unlock a revenge report and follow its data read until it is ready.
 *
 * The server decides the source: the tax import (ready at once) or a one-time
 * read of the exchange (queued → fetching → analysing → ready). The page's
 * animation follows `status` — real progress, never a timer pretending.
 *
 * MIN_SHOW_MS: when the tax import answers instantly, the animation still
 * plays long enough to be read. It is a beat, not a delay: the data is there.
 */
const POLL_MS = 1200;
const MIN_SHOW_MS = 2600;
const GIVE_UP_MS = 3 * 60_000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function useRevengeUnlock({ accessToken, tradingAccountId }) {
  const [state, setStateRaw] = useState({ phase: 'idle', status: null, error: null });
  /* The latest status, readable right after `await start()` — the state
     itself is a render behind at that moment. */
  const statusRef = useRef(null);
  const setState = useCallback((next) => {
    statusRef.current = next.status ?? statusRef.current;
    setStateRaw(next);
  }, []);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const settle = useCallback(async (startedAt, status) => {
    const left = MIN_SHOW_MS - (Date.now() - startedAt);
    if (left > 0) await wait(left);
    if (!alive.current) return 'gone';
    setState({ phase: 'ready', status, error: null });
    return 'ready';
  }, [setState]);

  const follow = useCallback(async (startedAt = Date.now()) => {
    for (;;) {
      if (!alive.current) return 'gone';
      let s = null;
      try {
        s = await fetchRevengeStatus({ accessToken, tradingAccountId });
      } catch { /* a missed poll is not a failure; try again */ }
      if (!alive.current) return 'gone';
      if (s) setState({ phase: 'building', status: s, error: null });
      if (s?.status === 'ready') return settle(startedAt, s);
      if (s?.status === 'error') {
        setState({ phase: 'error', status: s, error: s.error || 'We couldn’t read your trades.' });
        return 'error';
      }
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setState({ phase: 'error', status: s, error: 'This is taking longer than it should. Try again in a few minutes.' });
        return 'error';
      }
      await wait(POLL_MS);
    }
  }, [accessToken, tradingAccountId, settle, setState]);

  const start = useCallback(async (months = 'auto') => {
    const startedAt = Date.now();
    setState({ phase: 'building', status: { status: 'queued' }, error: null });
    try {
      const r = await unlockRevengeReport({ accessToken, tradingAccountId, months });
      if (r?.status === 'ready') return settle(startedAt, { status: 'ready', source: r.source });
      return follow(startedAt);
    } catch (e) {
      if (!alive.current) return 'gone';
      setState({ phase: 'error', status: null, error: e?.message || 'We couldn’t start your report.' });
      return 'error';
    }
  }, [accessToken, tradingAccountId, follow, settle, setState]);

  return { ...state, start, resume: follow, statusRef };
}
