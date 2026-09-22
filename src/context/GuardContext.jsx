import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useTradingAccounts } from './TradingAccountContext';
import { getExchangeCredentialsStatus } from '../api/exchangeCredentialsApi';
import { fetchRulesBundle } from '../api/rulesApi';
import { fetchNotificationSettings } from '../api/notificationsApi';
import { fetchBreaches } from '../api/breachesApi';
import {
  describeGuard,
  enabledRuleCount,
  enforcementCopy,
  enforcementOf,
  gapsOf,
  guardOf,
  lockUntilOf,
  totalRuleCount,
} from '../lib/guard';

/**
 * Guard state for every account the user has, kept fresh, read everywhere.
 *
 * One fetch set per account (connection, rules) plus one per user (alert
 * settings, unread breaches). Recomputed on account switch, on an explicit
 * `refresh()` after a mutation, and on a slow poll — the lock countdown ticks
 * off ONE shared interval so figures never drift between components.
 *
 * Read with `useGuard()` for the selected account, or `useGuardFor(id)` for
 * any account (the switcher lists every account with its state).
 */

const GuardContext = createContext(null);
const POLL_MS = 20_000;
const TICK_MS = 1_000;

function settle(p) {
  return p.then((v) => ({ ok: true, v }), () => ({ ok: false, v: null }));
}

export function GuardProvider({ children }) {
  const { session, user } = useAuth();
  const { accounts, accountsLoading, selectedTradingAccountId, refreshTradingAccounts } = useTradingAccounts();
  const accessToken = session?.access_token;

  const [perAccount, setPerAccount] = useState({}); // id → { connection, rules, loaded }
  const [notifications, setNotifications] = useState(null);
  const [unreadBreaches, setUnreadBreaches] = useState(0);
  // The unread rows themselves, so the toast doesn't poll /breaches a second
  // time for data this context already has.
  const [unreadList, setUnreadList] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Screens with their own countdowns (economic calendar) subscribe to the
  // same clock instead of starting a second interval.
  const [tickSubscribers, setTickSubscribers] = useState(0);
  const subscribeTick = useCallback(() => { setTickSubscribers((n) => n + 1); return () => setTickSubscribers((n) => Math.max(0, n - 1)); }, []);
  const inflight = useRef(0);

  /**
   * One pass of the guard fetch.
   *
   * `scope` is what makes the idle cost bounded: a poll only needs the account
   * the user is looking at, while the switcher's per-account states barely
   * change and are refreshed when the account list changes, on switch, and on
   * any explicit refresh() after a mutation. Polling every account was 2+2N
   * requests every 20s — 126/min for someone at the 20-account ceiling, to
   * re-learn facts that had not moved.
   */
  const load = useCallback(
    async (signal, { scope = 'all' } = {}) => {
      if (!accessToken || accountsLoading) return;
      const myRun = ++inflight.current;
      const all = accounts.map((a) => a.id);
      const ids = scope === 'selected' && selectedTradingAccountId && all.includes(selectedTradingAccountId)
        ? [selectedTradingAccountId]
        : all;

      const [notif, breaches, ...pairs] = await Promise.all([
        settle(fetchNotificationSettings({ accessToken, signal })),
        settle(fetchBreaches({ accessToken, unreadOnly: true, limit: 50, signal })),
        ...ids.flatMap((id) => [
          settle(getExchangeCredentialsStatus({ accessToken, accountId: id, signal })),
          settle(fetchRulesBundle({ accessToken, tradingAccountId: id, signal })),
        ]),
      ]);
      if (signal?.aborted || myRun !== inflight.current) return;

      const fetched = {};
      ids.forEach((id, i) => {
        fetched[id] = { connection: pairs[i * 2].v, rules: pairs[i * 2 + 1].v, loaded: true };
      });
      // Merge rather than replace: a scoped pass must not wipe the states the
      // switcher is still showing for the other accounts.
      setPerAccount((prev) => {
        const next = { ...fetched };
        for (const id of all) if (!next[id] && prev[id]) next[id] = prev[id];
        return next;
      });
      if (notif.ok) setNotifications(notif.v);
      if (breaches.ok) setUnreadBreaches(Array.isArray(breaches.v) ? breaches.v.length : 0);
      if (breaches.ok) setUnreadList(Array.isArray(breaches.v) ? breaches.v : []);
      setLoaded(true);
    },
    [accessToken, accounts, accountsLoading, selectedTradingAccountId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // Full pass when the account set or the selection changes; polls after
    // that are scoped to the selected account.
    load(ctrl.signal, { scope: 'all' });
    const poll = setInterval(() => {
      // A hidden tab is not watching anything. The engine enforces server-side
      // regardless, so polling a background tab buys nothing and costs a
      // Lambda invocation every 20 seconds for as long as it stays open.
      if (typeof document !== 'undefined' && document.hidden) return;
      load(ctrl.signal, { scope: 'selected' });
    }, POLL_MS);
    // Catch up immediately on return, so the first thing a returning user sees
    // is current rather than up to 20s stale.
    const onVisible = () => { if (!document.hidden) load(ctrl.signal, { scope: 'selected' }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ctrl.abort();
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // One clock for every countdown on screen.
  useEffect(() => {
    const anyLock = accounts.some((a) => lockUntilOf(a));
    if (!anyLock && tickSubscribers === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [accounts, tickSubscribers]);

  const refresh = useCallback(async () => {
    await refreshTradingAccounts?.();
    await load();
  }, [refreshTradingAccounts, load]);

  const stateFor = useCallback(
    (accountId) => {
      const account = accounts.find((a) => a.id === accountId) ?? null;
      const slice = perAccount[accountId] ?? { connection: null, rules: null, loaded: false };
      // `loaded` rides along so nothing downstream mistakes "not fetched yet"
      // for "not connected" — see guard.js.
      const isLoaded = slice.loaded && loaded;
      const input = { account, connection: slice.connection, rules: slice.rules, notifications, loaded: isLoaded };
      const enforcement = enforcementOf(input);
      const guard = guardOf(input, now);
      const gaps = gapsOf(input);
      const on = enabledRuleCount(slice.rules);
      const total = totalRuleCount(slice.rules);
      const lockUntil = lockUntilOf(account, now);
      return {
        account,
        accountId,
        loaded: isLoaded,
        connection: slice.connection,
        rules: slice.rules,
        enforcement,
        guard,
        gaps,
        gap: gaps[0] ?? null,
        rulesOn: on,
        rulesTotal: total,
        lockUntil,
        lockReason: account?.cooldownReason ?? null,
        lockRemainingMs: lockUntil ? Math.max(0, lockUntil - now) : 0,
        describe: describeGuard(guard, { on, total, gap: gaps[0] ?? null, label: account?.name ?? '', readOnly: slice.connection?.enforcementCapable === false }),
        copy: enforcementCopy(enforcement),
        setupDone: gaps.filter((g) => g.key !== 'alerts').length === 0,
        readOnly: slice.connection?.enforcementCapable === false,
      };
    },
    [accounts, perAccount, notifications, now, loaded],
  );

  const value = useMemo(
    () => ({
      loaded,
      now,
      notifications,
      unreadBreaches,
      unreadList,
      hasAlertChannel: gapsOf({ account: null, connection: null, rules: null, notifications, loaded }).every(
        (g) => g.key !== 'alerts',
      ),
      selected: stateFor(selectedTradingAccountId),
      stateFor,
      all: accounts.map((a) => stateFor(a.id)),
      refresh,
      user,
      subscribeTick,
    }),
    [loaded, now, notifications, unreadBreaches, unreadList, stateFor, selectedTradingAccountId, accounts, refresh, user, subscribeTick],
  );

  return <GuardContext.Provider value={value}>{children}</GuardContext.Provider>;
}

export function useGuard() {
  const ctx = useContext(GuardContext);
  if (!ctx) throw new Error('useGuard must be used within GuardProvider');
  return ctx;
}

export function useGuardFor(accountId) {
  const { stateFor } = useGuard();
  return stateFor(accountId);
}

/** The app's one 1-second clock. Mount this in any screen that shows a live countdown. */
export function useSecondTick() {
  const { now, subscribeTick } = useGuard();
  useEffect(() => subscribeTick(), [subscribeTick]);
  return now;
}
