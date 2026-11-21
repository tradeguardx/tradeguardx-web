import { useEffect, useRef, useState } from 'react';
import { fetchTradingAccounts } from '../api/tradingAccountsApi';
import { fetchLive, rowFromLive } from '../api/liveApi';
import { LIVE_POLL_BACKGROUND_FLAT_MS, LIVE_POLL_BACKGROUND_OPEN_MS, LIVE_POLL_FLAT_MS, LIVE_POLL_OPEN_MS, LIVE_POLL_UNWATCHED_MS, liveTransport } from '../lib/liveTransport';
import { supabase } from '../lib/supabaseClient';

const FALLBACK_POLL_MS = 30_000;
/*
 * While Realtime is down (subscribe error, timeout, closed channel) the poll
 * is the ONLY feed, and 30 s is too slow to be the only feed for a screen
 * that shows a lockout. 10 s is the compromise: one /trading-accounts read
 * per open tab every 10 s, only while the push channel is actually broken,
 * and it snaps back to 30 s the moment the channel subscribes again.
 */
const DEGRADED_POLL_MS = 10_000;
/*
 * A push in the last 45 s means Realtime is delivering. Without one, the
 * poll is the real feed even if the channel says SUBSCRIBED (mirror view,
 * an RLS or publication gap), and the staleness label must allow for it.
 */
const PUSH_RECENT_MS = 45_000;
/*
 * Mirrors PENDING_LOCK_MAX_WAIT_MS in user-service lockoutService.ts. The API
 * hands us `pendingLock.startsBy` already computed; a Realtime row carries
 * only the raw columns, so the one derived field is rebuilt here the same way.
 */
const PENDING_LOCK_MAX_WAIT_MS = 24 * 3_600_000;

function n(v) {
  // Number(null) is 0. A column the engine has never written is "no
  // reading", and turning it into 0 is how a new account showed "$0.00 —
  // Flat" before anything had been measured.
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/**
 * The live row for one trading account — pushed over Supabase Realtime with a
 * slow poll as the fallback. One source for session P&L, counters and lock,
 * shared by Overview and Live guard so the same figure never disagrees.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THE ROW BELONGS TO ONE ACCOUNT, AND SAYS SO.
 *
 * This used to hold the row in plain state and reset it in an effect on
 * account switch. Effects run AFTER the render, so the first frame under a
 * newly selected account still showed the previous account's P&L, counters
 * and lock — and a snapshot request started for the old account could land
 * after the switch and write the old row back. The row is now stored with
 * the id it belongs to, a mismatch is resolved during render (never shown),
 * and every write checks the id it was fetched for.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * `source` is 'initial' for the seed taken from the account list (which can
 * be up to an hour old — it is fetched once per login token) and 'server' for
 * anything that came from Realtime or the snapshot poll. `receivedAt` is when
 * this browser got it. GuardContext uses both to decide which copy of the
 * lock is freshest; lib/liveFeed uses `equityUpdatedAt` for staleness.
 *
 * `onRow` (optional) receives each normalised row from the server as it
 * arrives — Realtime or snapshot, never the seed.
 *
 * `onList` (optional) receives the whole account list every time the
 * snapshot poll fetches it. The poll already pays for every account's row;
 * handing it on lets the switcher's per-account lock dots stay fresh without
 * a second request.
 */
export function useLiveAccount({ accessToken, tradingAccountId, initial, onList, onRow, fast = true }) {
  const seed = (id) => (initial && initial.id === id ? normalise(initial, 'initial') : null);
  const [state, setState] = useState(() => ({ id: tradingAccountId ?? null, row: seed(tradingAccountId) }));
  const topic = useRef(Math.random().toString(36).slice(2, 10));
  const onListRef = useRef(onList);
  const onRowRef = useRef(onRow);
  // The account list knows each account's currency; the live poll falls back
  // to it if a snapshot ever arrives without one.
  const initialCurrencyRef = useRef(null);
  initialCurrencyRef.current = initial?.accountCurrency ?? initial?.account_currency ?? initialCurrencyRef.current;
  useEffect(() => { onListRef.current = onList; onRowRef.current = onRow; }, [onList, onRow]);
  /* Fast on the pages that show live numbers, slow elsewhere (liveTransport).
     Read through a ref so a page change does not restart the poll; going TO
     a live page polls at once instead of waiting out the slow timer. */
  const fastRef = useRef(fast);
  const kickRef = useRef(null);
  useEffect(() => {
    const was = fastRef.current;
    fastRef.current = fast;
    if (fast && !was) kickRef.current?.();
  }, [fast]);

  // Account switched: adopt the new account's seed in THIS render. React
  // re-renders immediately with the new state and nothing of the old row is
  // ever committed to the screen.
  let current = state;
  if (state.id !== (tradingAccountId ?? null)) {
    current = { id: tradingAccountId ?? null, row: seed(tradingAccountId) };
    setState(current);
  }

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;
    let pollMs = FALLBACK_POLL_MS;
    let timer = null;
    let lastPushAt = 0;
    const apply = (row, via = 'poll', liveEveryMs = null) => {
      if (!row || cancelled) return;
      // A row for any other account is not ours to show (a late response, or
      // a payload Realtime routed to a stale channel).
      if (row.id != null && row.id !== tradingAccountId) return;
      const next = normalise(row, 'server');
      // Fed by the engine's cache (not its database fallback): its age is
      // judged against its own poll interval (useLiveDrivenRefresh).
      next.viaCache = via === 'live' && row.liveSource !== 'db';
      if (via === 'push') lastPushAt = next.receivedAt;
      /*
       * `expectMs`: how long this browser can go between readings with
       * nothing wrong. ~0 while pushes arrive; one poll interval when the
       * poll is all we have. lib/liveFeed adds it to its thresholds, so a
       * healthy engine read every 30 s is never called "Delayed" (owner,
       * 20 Nov: mirror view showed Delayed with the engine writing every 3 s).
       */
      next.expectMs = via === 'live' ? liveEveryMs : next.receivedAt - lastPushAt < PUSH_RECENT_MS ? 0 : pollMs;
      /*
       * `changedAt`: THIS browser's clock when equity_updated_at last moved.
       * lib/liveFeed measures staleness from it, so a phone clock that is off
       * by twenty seconds cannot paint every fresh row "Delayed". Null on the
       * first server row (only the server's timestamp is known then).
       */
      setState((prev) => {
        const before = prev.id === tradingAccountId && prev.row?.source === 'server' ? prev.row : null;
        // Live cache: the engine's heartbeat (hb) moving is the proof the feed
        // is alive, since a quiet price leaves equity unchanged for minutes.
        const key = (r) => (via === 'live' ? r.liveHb : r.equityUpdatedAt);
        const changedAt = !before
          ? null
          : key(before) !== key(next) ? next.receivedAt : before.changedAt;
        return { id: tradingAccountId, row: { ...next, changedAt } };
      });
      onRowRef.current?.(next);
    };
    const snapshot = async () => {
      try {
        const accounts = await fetchTradingAccounts({ accessToken });
        if (cancelled) return;
        const list = Array.isArray(accounts) ? accounts : [];
        const a = list.find((x) => x.id === tradingAccountId);
        if (a) apply(a);
        onListRef.current?.(list);
      } catch { /* keep last known */ }
    };
    /*
     * PHASE 3a: LIVE NUMBERS FROM THE ENGINE'S CACHE (switch: lib/liveTransport).
     *
     * GET /user/live about once a second with a trade open (5 s when flat,
     * nothing while the tab is hidden), served from ElastiCache, so Postgres
     * is not involved. No Realtime channel is opened. The slow account-list
     * poll stays only to keep the OTHER accounts' lock dots fresh (onList);
     * it no longer writes this account's row, because the list carries the
     * database's copy and the cache is fresher.
     */
    if (liveTransport() === 'poll') {
      let liveTimer = null;
      const run = async () => {
        liveTimer = null;
        if (cancelled) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        let every = LIVE_POLL_FLAT_MS;
        try {
          const { accounts } = await fetchLive({ accessToken, accountIds: [tradingAccountId] });
          if (cancelled) return;
          const s = accounts.find((a) => a.accountId === tradingAccountId);
          const row = rowFromLive(s, initialCurrencyRef.current);
          if (row) {
            const open = (row.livePositions?.length ?? 0) > 0 || Object.keys(row.openPnl ?? {}).length > 0;
            every = row.liveSource === 'db'
              ? LIVE_POLL_UNWATCHED_MS
              : fastRef.current
                ? (open ? LIVE_POLL_OPEN_MS : LIVE_POLL_FLAT_MS)
                : (open ? LIVE_POLL_BACKGROUND_OPEN_MS : LIVE_POLL_BACKGROUND_FLAT_MS);
            apply(row, 'live', every);
          }
        } catch (err) {
          /* Keep last known; the staleness label says so. A rejected login
             (expired session or mirror pass) will not fix itself by retrying:
             stop here. A fresh token re-runs this effect and polling resumes. */
          if (err?.status === 401) return;
        }
        if (!cancelled) liveTimer = setTimeout(run, every);
      };
      const onVisible = () => {
        if (document.visibilityState === 'visible' && !liveTimer) run();
        if (document.visibilityState === 'visible') listOnly();
      };
      const listOnly = async () => {
        // A hidden tab shows no list; coming back refreshes it (onVisible).
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        try {
          const list = await fetchTradingAccounts({ accessToken });
          if (!cancelled) onListRef.current?.(Array.isArray(list) ? list : []);
        } catch { /* next round */ }
      };
      document.addEventListener('visibilitychange', onVisible);
      kickRef.current = () => {
        if (cancelled || !liveTimer) return; // in flight: it reschedules itself
        clearTimeout(liveTimer);
        run();
      };
      run();
      const listTimer = setInterval(listOnly, FALLBACK_POLL_MS);
      return () => {
        cancelled = true;
        clearTimeout(liveTimer);
        clearInterval(listTimer);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }

    const schedule = () => {
      clearInterval(timer);
      timer = setInterval(snapshot, pollMs);
    };
    snapshot();
    const channel = supabase
      .channel(`live-account-${tradingAccountId}-${topic.current}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trading_accounts', filter: `id=eq.${tradingAccountId}` }, (p) => apply(p.new, 'push'))
      .subscribe((status) => {
        if (cancelled) return;
        /*
         * A broken push channel used to fail silently: the screen kept the
         * last row and nothing said the feed had stopped. Now a failure pulls
         * a snapshot straight away and tightens the poll until the channel is
         * back. The staleness label (lib/liveFeed) covers what is left.
         */
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (pollMs !== DEGRADED_POLL_MS) { pollMs = DEGRADED_POLL_MS; schedule(); snapshot(); }
        } else if (status === 'SUBSCRIBED' && pollMs !== FALLBACK_POLL_MS) {
          pollMs = FALLBACK_POLL_MS; schedule(); snapshot();
        }
      });
    schedule();
    return () => { cancelled = true; clearInterval(timer); supabase.removeChannel(channel); };
  }, [accessToken, tradingAccountId]);

  return current.row;
}

/**
 * The account's pending (after_close) manual lock, from either shape: the
 * API's `pendingLock` object, or the raw `pending_lock_*` columns a Realtime
 * row carries. Undefined when the row says nothing either way, so a caller can
 * tell "no pending lock" from "this payload does not carry the field".
 */
function pendingLockOf(row) {
  if (Object.prototype.hasOwnProperty.call(row, 'pendingLock')) return row.pendingLock ?? null;
  if (!Object.prototype.hasOwnProperty.call(row, 'pending_lock_hours')) return undefined;
  const hours = row.pending_lock_hours;
  const requestedAt = row.pending_lock_requested_at;
  if (hours == null || !requestedAt) return null;
  const t = new Date(requestedAt).getTime();
  if (!Number.isFinite(t)) return null;
  return {
    hours: Number(hours),
    requestedAt: new Date(t).toISOString(),
    symbols: Array.isArray(row.pending_lock_symbols) ? row.pending_lock_symbols : [],
    startsBy: new Date(t + PENDING_LOCK_MAX_WAIT_MS).toISOString(),
  };
}

export function normalise(row, source = 'server') {
  if (!row) return null;
  return {
    id: row.id ?? null,
    source,
    receivedAt: Date.now(),
    changedAt: null,
    dailyPnl: n(row.daily_pnl ?? row.dailyPnl),
    /** Live P&L per open position, keyed by product symbol — null until the venue's engine writes it. */
    openPnl: row.open_pnl ?? row.openPnl ?? null,
    dailyStartingEquity: n(row.daily_starting_equity ?? row.dailyStartingEquity),
    currentEquity: n(row.current_equity ?? row.currentEquity),
    equityUpdatedAt: row.equity_updated_at ?? row.equityUpdatedAt ?? null,
    tradeCountToday: n(row.trade_count_today ?? row.tradeCountToday),
    consecutiveLosses: n(row.consecutive_losses ?? row.consecutiveLosses),
    cooldownUntil: row.cooldown_until ?? row.cooldownUntil ?? null,
    cooldownReason: row.cooldown_reason ?? row.cooldownReason ?? null,
    pendingLock: pendingLockOf(row),
    accountSize: n(row.account_size ?? row.accountSize),
    accountCurrency: row.account_currency ?? row.accountCurrency ?? 'USD',
    dailyResetTimeLocal: row.daily_reset_time_local ?? row.dailyResetTimeLocal ?? null,
    timezone: row.timezone ?? null,
  };
}
