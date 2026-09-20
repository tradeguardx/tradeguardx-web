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
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Screens with their own countdowns (economic calendar) subscribe to the
  // same clock instead of starting a second interval.
  const [tickSubscribers, setTickSubscribers] = useState(0);
  const subscribeTick = useCallback(() => { setTickSubscribers((n) => n + 1); return () => setTickSubscribers((n) => Math.max(0, n - 1)); }, []);
  const inflight = useRef(0);

  const load = useCallback(
    async (signal) => {
      if (!accessToken || accountsLoading) return;
      const myRun = ++inflight.current;
      const ids = accounts.map((a) => a.id);

      const [notif, breaches, ...pairs] = await Promise.all([
        settle(fetchNotificationSettings({ accessToken, signal })),
        settle(fetchBreaches({ accessToken, unreadOnly: true, limit: 50, signal })),
        ...ids.flatMap((id) => [
          settle(getExchangeCredentialsStatus({ accessToken, accountId: id, signal })),
          settle(fetchRulesBundle({ accessToken, tradingAccountId: id, signal })),
        ]),
      ]);
      if (signal?.aborted || myRun !== inflight.current) return;

      const next = {};
      ids.forEach((id, i) => {
        next[id] = { connection: pairs[i * 2].v, rules: pairs[i * 2 + 1].v, loaded: true };
      });
      setPerAccount(next);
      if (notif.ok) setNotifications(notif.v);
      if (breaches.ok) setUnreadBreaches(Array.isArray(breaches.v) ? breaches.v.length : 0);
      setLoaded(true);
    },
    [accessToken, accounts, accountsLoading],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    const poll = setInterval(() => load(ctrl.signal), POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(poll);
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
      const input = { account, connection: slice.connection, rules: slice.rules, notifications };
      const enforcement = enforcementOf(input);
      const guard = guardOf(input, now);
      const gaps = gapsOf(input);
      const on = enabledRuleCount(slice.rules);
      const total = totalRuleCount(slice.rules);
      const lockUntil = lockUntilOf(account, now);
      return {
        account,
        accountId,
        loaded: slice.loaded && loaded,
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
      hasAlertChannel: gapsOf({ account: null, connection: null, rules: null, notifications }).every(
        (g) => g.key !== 'alerts',
      ),
      selected: stateFor(selectedTradingAccountId),
      stateFor,
      all: accounts.map((a) => stateFor(a.id)),
      refresh,
      user,
      subscribeTick,
    }),
    [loaded, now, notifications, unreadBreaches, stateFor, selectedTradingAccountId, accounts, refresh, user, subscribeTick],
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
