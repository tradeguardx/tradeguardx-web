import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useTradingAccounts } from './TradingAccountContext';
import { getExchangeCredentialsStatus } from '../api/exchangeCredentialsApi';
import { fetchRulesBundle } from '../api/rulesApi';
import { fetchNotificationSettings } from '../api/notificationsApi';
import { fetchBreaches } from '../api/breachesApi';
import {
  canLockOutOf,
  describeGuard,
  enabledRuleCount,
  enforcementCopy,
  enforcementOf,
  gapsOf,
  guardOf,
  lockUntilOf,
  totalRuleCount,
} from '../lib/guard';
import { keyStateOf, lifecycleIdOf, lifecycleView } from '../lib/lifecycle';
import { getPricingPlans } from '../api/pricingApi';
import { formatMoney } from '../lib/priceBands';
import { useLiveAccount } from '../hooks/useLiveAccount';

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
/*
 * The selected account's live row, in its own context so the P&L ticking
 * every few seconds re-renders only the screens that print it (Overview,
 * Live guard) — not the whole shell, which reads GuardContext.
 */
const LiveRowContext = createContext(undefined);
const POLL_MS = 20_000;
/** Longest the dashboard waits for its inputs before rendering regardless. */
const READY_TIMEOUT_MS = 8_000;
const TICK_MS = 1_000;

/*
 * The three lock fields, compared by value. The live row changes every few
 * seconds while a position is open; the lock almost never does. Writing the
 * overlay only on a real change keeps the guard context — and so the whole
 * shell — from re-rendering on every P&L tick.
 */
function lockFieldsOf(row) {
  const f = { cooldownUntil: row?.cooldownUntil ?? null, cooldownReason: row?.cooldownReason ?? null };
  // undefined = the payload did not carry it; keep whatever we already had.
  if (row?.pendingLock !== undefined) f.pendingLock = row.pendingLock ?? null;
  return f;
}
function sameLock(a, b) {
  if (!a || !b) return false;
  const t = (iso) => (iso ? new Date(iso).getTime() : null);
  return t(a.cooldownUntil) === t(b.cooldownUntil)
    && (a.cooldownReason ?? null) === (b.cooldownReason ?? null)
    && JSON.stringify(a.pendingLock) === JSON.stringify(b.pendingLock);
}

function settle(p) {
  return p.then((v) => ({ ok: true, v }), () => ({ ok: false, v: null }));
}

export function GuardProvider({ children }) {
  const { session, user, subscription, subscriptionError } = useAuth();
  /*
   * Entitlement, mirroring isEntitled() in the engine's exchange/credentials.ts
   * and the `access` the subscription API computes. The engine stopped acting
   * for lapsed plans; this screen must not keep claiming it does.
   *
   * ──────────────────────────────────────────────────────────────────────
   * IT IS READ OFF `user`, BECAUSE THE CONTEXT HAS NO `access` OF ITS OWN.
   *
   * This destructured `access` from useAuth(), which does not publish one —
   * AuthContext puts it on the user object instead. So it was `undefined`,
   * `undefined == null` is true, and this resolved to `entitled: true` for
   * everybody, always. Every guard screen has been treating lapsed and unpaid
   * accounts as entitled since the line was written, which is the same failure
   * as the user who traded for six weeks with nothing enforcing anything: the
   * UI claiming a protection that was not there.
   * ──────────────────────────────────────────────────────────────────────
   *
   * Null until the subscription call lands, and unknown must never read as
   * unprotected — same rule as `loaded` everywhere else in this file.
   */
  const access = user?.access ?? null;
  /*
   * `planProtected` is subscription-service's verdict, the one the risk
   * engine is tested against row for row. It wins whenever it is present;
   * `access` is the fallback for an older API.
   */
  const planProtected = typeof user?.planProtected === 'boolean' ? user.planProtected : null;
  const entitled = planProtected != null
    ? planProtected
    : access == null ? true : access === 'trial' || access === 'active';
  /*
   * HAS A PAYMENT METHOD ATTACHED — WHICH IS NOT THE SAME AS HAVING ACCESS.
   *
   * For a mandate-first signup the two always agree, which is why they were
   * ever conflated. They come apart for the users who signed up under the old
   * no-card trial: entitled today, nothing attached, and on the day the trial
   * lapses the guard switches off. Reading `entitled` for this told them
   * "Set up billing — Done" and then took the guard away without ever asking.
   *
   * A cancelled mandate still counts: they attached a method, they just told
   * us to stop using it. That case is an "ending" step, not an unmet one.
   *
   * Defaults to true while unknown — same fail-open rule as `entitled`: never
   * tell someone who has paid that they have not.
   */
  const mandate =
    access == null
      ? true
      : access === 'active' || Boolean(user?.trialAutoRenews) || Boolean(user?.subscriptionCanceled);
  /* Already had the free week. `none` means nothing ever started and the
     offer is real; `expired` means it ran out and checkout will charge them
     today. The two must not be told the same thing. */
  const trialSpent = access === 'expired';
  const { accounts, accountsLoading, selectedTradingAccountId, selectedAccount, refreshTradingAccounts } = useTradingAccounts();
  const accessToken = session?.access_token;

  /*
   * ──────────────────────────────────────────────────────────────────────
   * THE LOCK COMES FROM THE FRESHEST COPY OF THE ROW, NOT THE ACCOUNT LIST.
   *
   * `accounts` is fetched once per login token — about hourly — and on an
   * explicit refresh after the user's own mutation. Every lock surface (the
   * header kill switch, the guard pill, the Locked out view, the switcher
   * and mobile dots) read cooldown_until from it, so a lock the ENGINE set
   * (daily loss, trade cap, loss streak, profit lock, an after_close lock
   * starting) could stay invisible for up to an hour while the P&L beside it
   * updated every three seconds from the live row.
   *
   * The live row (Realtime + a 30 s snapshot poll) now feeds an overlay of
   * the three lock fields, per account id. Whichever arrived LAST wins:
   *   - a live push or snapshot writes its account(s) into the overlay;
   *   - a new account list (login, or refresh() after arming a lock) clears
   *     the overlay, because that list was fetched after everything in it.
   * The snapshot poll already fetches every account's row, so the other
   * accounts' dots ride along at no extra cost (≤ 30 s fresh).
   *
   * Only DISPLAY changes. The engine and user-service decide the lock; this
   * only decides which copy of their decision is newest.
   * ──────────────────────────────────────────────────────────────────────
   */
  const [now, setNow] = useState(() => Date.now());
  const [lockOverlay, setLockOverlay] = useState({});
  const [overlayBase, setOverlayBase] = useState(accounts);
  if (overlayBase !== accounts) {
    setOverlayBase(accounts);
    setLockOverlay({});
  }
  /*
   * Both callbacks fire from the live hook as rows ARRIVE (never from an
   * effect on the row), and both bring the shared clock up to date: nothing
   * ticks while nothing is locked, so a lock that just arrived would
   * otherwise be judged against a clock that stopped minutes ago.
   *
   * Compared against a ref of the committed overlay, not inside the state
   * updater, so the clock is bumped ONLY on a real lock change. Bumping it on
   * every row would re-render the whole shell every 3 s with an open trade.
   */
  const overlayRef = useRef(lockOverlay);
  useEffect(() => { overlayRef.current = lockOverlay; }, [lockOverlay]);
  const writeLocks = useCallback((rows) => {
    const prev = overlayRef.current;
    let next = prev;
    for (const row of rows) {
      if (!row?.id) continue;
      const merged = { ...prev[row.id], ...lockFieldsOf(row) };
      if (prev[row.id] && sameLock(prev[row.id], merged)) continue;
      if (next === prev) next = { ...prev };
      next[row.id] = merged;
    }
    if (next === prev) return;
    overlayRef.current = next;
    setLockOverlay(next);
    setNow(Date.now());
  }, []);
  const onLiveList = useCallback((list) => writeLocks(list), [writeLocks]);
  // Only rows from the server reach this: the seed is the (old) list itself.
  const onLiveRow = useCallback((row) => writeLocks([row]), [writeLocks]);
  const liveRow = useLiveAccount({ accessToken, tradingAccountId: selectedTradingAccountId, initial: selectedAccount, onList: onLiveList, onRow: onLiveRow });
  const liveAccounts = useMemo(
    () => accounts.map((a) => (lockOverlay[a.id] ? { ...a, ...lockOverlay[a.id] } : a)),
    [accounts, lockOverlay],
  );

  const [perAccount, setPerAccount] = useState({}); // id → { connection, rules, loaded }
  const [notifications, setNotifications] = useState(null);
  const [unreadBreaches, setUnreadBreaches] = useState(0);
  // The unread rows themselves, so the toast doesn't poll /breaches a second
  // time for data this context already has.
  const [unreadList, setUnreadList] = useState([]);
  const [loaded, setLoaded] = useState(false);
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

      // A fetch that FAILED is not an answer. settle() flattens a rejection
      // into { ok:false, v:null }, and a null rules bundle is indistinguishable
      // downstream from a real one with every rule switched off — so a single
      // 5xx on /rules (a cold Lambda is enough) rendered a fully-armed account
      // as "Not protected. No rules are switched on", with three of the four
      // setup steps ticked and the fourth saying "do this next", until the poll
      // 20s later quietly corrected it. Only write a slice when BOTH halves
      // landed; the merge below then keeps whatever we already knew, or leaves
      // the account in `loading` if we knew nothing yet.
      const fetched = {};
      ids.forEach((id, i) => {
        const conn = pairs[i * 2];
        const bundle = pairs[i * 2 + 1];
        if (!conn.ok || !bundle.ok) return;
        fetched[id] = { connection: conn.v, rules: bundle.v, loaded: true };
      });
      // Merge rather than replace: a scoped pass must not wipe the states the
      // switcher is still showing for the other accounts.
      setPerAccount((prev) => {
        const next = { ...fetched };
        for (const id of all) if (!next[id] && prev[id]) next[id] = prev[id];
        return next;
      });
      if (notif.ok) setNotifications(notif.v);
      /* Only what needs the user's attention counts as unread: the engine also
         logs every trade opened and closed (severity info), and counting those
         put "143 NEW" on the bell and a red "Limit hit" toast after an
         ordinary trade. They stay in the notifications list. */
      const attention = breaches.ok && Array.isArray(breaches.v) ? breaches.v.filter((b) => String(b?.severity).toLowerCase() !== 'info') : null;
      if (attention) setUnreadBreaches(attention.length);
      if (attention) setUnreadList(attention);
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

  /*
   * One clock for every countdown on screen.
   *
   * `anyLock` is read against the shared clock, so the tick that carries a
   * lock past its end is the same render that clears it — and the next
   * render stops the interval. It used to be computed inside the effect off
   * `accounts`, which kept ticking after a lock expired and, worse, only
   * started ticking when the hourly list happened to carry the lock.
   *
   * A lock that just ARRIVED is checked against a clock that may not have
   * moved for a while (nothing ticks while nothing is locked), so writeLocks
   * above brings the clock up to date with every arrival.
   */
  const anyLock = liveAccounts.some((a) => lockUntilOf(a, now));
  useEffect(() => {
    if (!anyLock && tickSubscribers === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [anyLock, tickSubscribers]);

  const refresh = useCallback(async () => {
    await refreshTradingAccounts?.();
    await load();
  }, [refreshTradingAccounts, load]);

  const stateFor = useCallback(
    (accountId) => {
      const account = liveAccounts.find((a) => a.id === accountId) ?? null;
      const slice = perAccount[accountId] ?? { connection: null, rules: null, loaded: false };
      // `loaded` rides along so nothing downstream mistakes "not fetched yet"
      // for "not connected" — see guard.js.
      const isLoaded = slice.loaded && loaded;
      const input = { account, connection: slice.connection, rules: slice.rules, notifications, loaded: isLoaded, entitled, mandate, trialSpent };
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
        // A manual lock waiting for the open trade to close (LockChoice.jsx).
        pendingLock: lockUntil ? null : account?.pendingLock ?? null,
        lockRemainingMs: lockUntil ? Math.max(0, lockUntil - now) : 0,
        describe: describeGuard(guard, { on, total, gap: gaps[0] ?? null, label: account?.name ?? '', readOnly: slice.connection?.status === 'active' && slice.connection?.enforcementCapable === false, entitled }),
        copy: enforcementCopy(enforcement),
        setupDone: gaps.filter((g) => g.key !== 'alerts').length === 0,
        // Read-only describes a CONNECTED key that cannot act. A disconnected
        // key keeps its last enforcement_capable value in the database, and
        // reading that alone called a revoked key "read-only — we can alert
        // you", when nothing at all is watching the account.
        readOnly: slice.connection?.status === 'active' && slice.connection?.enforcementCapable === false,
        /** false only once we KNOW there is no live key; undefined while loading (fail open). */
        keyLive: isLoaded && slice.connection ? slice.connection.status === 'active' : undefined,
        // A lockout needs a key that can act, not rules — see canLockOutOf.
        canLockOut: canLockOutOf(input),
      };
    },
    [liveAccounts, perAccount, notifications, now, loaded, entitled, mandate, trialSpent],
  );

  /*
   * The lifecycle state the shell renders (s0 … lf). Setup states need to
   * know whether the selected account's key is connected, so they wait for
   * the guard fetch; a plan state does not. Null means "unknown" and every
   * consumer then leaves the shell as it was — never a red verdict from an
   * unloaded state.
   */
  // Memoised: the context value below must stay referentially stable.
  const selectedState = useMemo(() => stateFor(selectedTradingAccountId), [stateFor, selectedTradingAccountId]);
  const keyState = keyStateOf(selectedState.connection);
  const lifeId = (() => {
    const planState = user?.planState ?? null;
    if (accountsLoading) return null;
    // s2 vs a plan state turns on the selected account's key, so wait for it.
    if (accounts.length > 0 && !selectedState.loaded) return null;
    return lifecycleIdOf({
      planState,
      accountsCount: accounts.length,
      keyState,
    });
  })();
  const accountName = selectedState.account?.name ?? '';
  /* The plan's list price for the user's billing period, for "Pay ₹1,299"
     and "Payment received · ₹1,299". Unknown until the pricing call lands;
     the sentences drop the figure until then rather than guess. */
  const [plans, setPlans] = useState(null);
  useEffect(() => {
    let alive = true;
    getPricingPlans().then((p) => { if (alive) setPlans(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const interval = subscription?.subscription?.billingInterval ?? 'monthly';
  const price = useMemo(() => {
    const pro = (plans ?? []).find((p) => String(p.slug || '').toLowerCase() === 'pro');
    const row = pro?.intervals?.find((x) => x.interval === interval);
    // Rupees in India, US dollars elsewhere (pricingApi prices by band).
    return typeof row?.price === 'number' ? formatMoney(row.price, pro.currency ?? 'INR') : null;
  }, [plans, interval]);
  const life = useMemo(
    () => lifecycleView(lifeId, {
      endsAt: user?.planStateEndsAt ?? null,
      periodEnd: user?.currentPeriodEnd ?? null,
      autoRenews: Boolean(user?.trialAutoRenews),
      accountName,
      keyState,
      price,
    }),
    [lifeId, accountName, keyState, price, user?.planStateEndsAt, user?.currentPeriodEnd, user?.trialAutoRenews],
  );

  /*
   * READY: EVERYTHING THAT DECIDES WHAT THE DASHBOARD SAYS IS KNOWN.
   *
   * On a reload the inputs land one at a time — session, then the plan,
   * then the accounts, then the selected account's key — and every screen
   * used to render its best guess at each step: the "no plan" card before
   * the plan, step one of setup before the accounts, an open page before its
   * lock. Each guess was replaced a moment later, so a reload walked through
   * three or four different pages before settling.
   *
   * Nothing state-dependent renders until all of them are in; the shell
   * shows one skeleton meanwhile and then the real page, once. A failed
   * plan call counts as an answer (the old behaviour takes over), and a
   * safety valve renders anyway after READY_TIMEOUT_MS so a hung request can
   * never leave someone staring at a skeleton.
   */
  const planAnswered = Boolean(user?.planKnown) || Boolean(subscriptionError) || !accessToken;
  const keyAnswered = accounts.length === 0 || selectedState.loaded;
  const inputsReady = planAnswered && !accountsLoading && keyAnswered;
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (inputsReady) return undefined;
    const t = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [inputsReady]);
  /*
   * READY LATCHES. The skeleton is for the FIRST load only. Without the
   * latch, any later refresh (creating an account, switching the selected
   * one) dropped `ready` back to false, swapped the page for the skeleton
   * and unmounted it — so setup lost its place after "Continue" and came
   * back on an empty "Name the account" form, and users created the same
   * account twice. After the first answer, pages stay mounted and a moment
   * of unknown reads as "unknown" (life is null), never as a verdict.
   * Re-arms for a different session (sign-out, another user).
   */
  // Keyed on the user, not the token: the token refreshes hourly.
  const sessionUserId = session?.user?.id ?? null;
  const [latch, setLatch] = useState({ who: sessionUserId, ready: false });
  if (latch.who !== sessionUserId) {
    setLatch({ who: sessionUserId, ready: false });
  } else if (!latch.ready && (inputsReady || timedOut)) {
    setLatch({ who: sessionUserId, ready: true });
  }
  const ready = (latch.who === sessionUserId && latch.ready) || inputsReady || timedOut;

  const value = useMemo(
    () => ({
      ready,
      life,
      loaded,
      now,
      notifications,
      unreadBreaches,
      unreadList,
      hasAlertChannel: gapsOf({ account: null, connection: null, rules: null, notifications, loaded }).every(
        (g) => g.key !== 'alerts',
      ),
      selected: selectedState,
      stateFor,
      all: liveAccounts.map((a) => stateFor(a.id)),
      refresh,
      user,
      subscribeTick,
    }),
    [ready, life, loaded, now, notifications, unreadBreaches, unreadList, stateFor, selectedState, liveAccounts, refresh, user, subscribeTick],
  );

  return (
    <GuardContext.Provider value={value}>
      <LiveRowContext.Provider value={liveRow}>{children}</LiveRowContext.Provider>
    </GuardContext.Provider>
  );
}

/**
 * The selected account's live row (see useLiveAccount) — the same copy the
 * guard reads its lock from, so a screen's P&L and its lock can never come
 * from two different moments. Null until the account has a row.
 */
export function useSelectedLiveRow() {
  const row = useContext(LiveRowContext);
  if (row === undefined) throw new Error('useSelectedLiveRow must be used within GuardProvider');
  return row;
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
