import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { adoptMirrorFromUrl, isMirroring, mirrorInfo, mirrorSession } from '../lib/mirror';
import { supabase } from '../lib/supabaseClient';
import { initUserProfile } from '../api/userApi';
import { getCurrentSubscription } from '../api/subscriptionApi';
import { identifySentryUser, clearSentryUser } from '../sentry.js';
import { setAnalyticsUser, trackLogin, trackSignup, firstTouch } from '../lib/analytics';
import { browserZone, getUserZone, setUserZone, subscribeUserZone } from '../lib/userZone';

const AuthContext = createContext(null);

/**
 * The profile's timezone out of a response, wherever this endpoint puts it.
 * `undefined` means "this response does not say" (leave the zone alone);
 * `null` means "the profile has none" (fall back to the device).
 */
function profileZoneOf(payload) {
  for (const o of [payload, payload?.data, payload?.profile, payload?.data?.profile]) {
    if (o && typeof o === 'object' && 'timezone' in o) return o.timezone ?? null;
  }
  return undefined;
}

/* Backoff for a failed /subscriptions/me: quick at first (a cold Lambda is
   the usual cause), then once a minute for as long as it keeps failing. */
const SUB_RETRY_MS = [2_000, 5_000, 15_000, 30_000, 60_000];
const SUB_FOCUS_STALE_MS = 60_000;

function planKeyFromName(name) {
  if (!name || typeof name !== 'string') return 'free';
  return name.toLowerCase().replace(/\s|\+/g, '');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const initializedProfilesRef = useRef(new Set());
  /*
   * The display zone, mirrored from lib/userZone into state so a change
   * (profile load, a save in Preferences) re-renders everything under the
   * provider. Plain helpers read lib/userZone directly.
   */
  const [timezone, setTimezoneState] = useState(getUserZone);
  useEffect(() => subscribeUserZone(setTimezoneState), []);
  // Set by signup() so the SIGNED_IN that follows isn't also counted as a login.
  const suppressLoginEventRef = useRef(false);

  const toAppUser = useCallback((authUser) => {
    if (!authUser) return null;
    const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: fullName || (authUser.email ? authUser.email.split('@')[0] : 'User'),
      // False until the subscription call answers. "Free" and "we have not
      // asked yet" are not the same thing, and showing the first while the
      // second is true told paying users they were on the free plan for the
      // second after login. Anything that renders a plan name or a plan limit
      // waits on this.
      planKnown: false,
      // `plan` is the EFFECTIVE plan used for feature gating across the app.
      // Mirrors user-service's strict policy: anything other than `status='active'`
      // collapses to `free` regardless of which plan was originally subscribed to.
      plan: 'free',
      planLabel: 'Free',
      // `billingPlan` is what the user has actually PAID for — it drives upgrade
      // and checkout eligibility. It is deliberately NOT the same as `plan`: a
      // trial unlocks Pro+ features (plan='pro_plus') without being a purchase,
      // so billingPlan stays 'free' and every paid tier remains buyable.
      billingPlan: 'free',
      limits: null,
      // `subscribedPlanSlug` and `subscribedPlanLabel` are the literal plan the
      // user is paying for — used by Billing/Account pages to show "Pro — past due"
      // even when effective `plan` is downgraded.
      subscribedPlanSlug: 'free',
      subscribedPlanLabel: 'Free',
      subscriptionStatus: 'active',
      currentPeriodEnd: null,
      // 'free' | 'admin' | 'payment'. Lets billing/account pages distinguish
      // founding-member comps (admin) from real Dodo subscriptions (payment) —
      // critical because admin comps have no Dodo customer to manage/cancel.
      subscriptionSource: 'free',
      // Trial/access state — overwritten by mergePlanIntoUser once the
      // subscription loads. `access`: 'trial' | 'active' | 'expired' | 'free'
      // | 'none' once known.
      //
      // NULL UNTIL /subscriptions/me ANSWERS — NEVER 'free'.
      // This defaulted to 'free', and a failed or slow /me left it there:
      // GuardContext then read a paying user as unentitled and the shell said
      // "Watching only — your plan has lapsed" to someone whose plan was fine
      // (and the engine still enforcing). Unknown is its own state; every
      // reader treats null as "don't say anything yet" (fail open).
      access: null,
      isTrial: false,
      isExpired: false,
      trialDaysLeft: null,
      trialEndsAt: null,
    };
  }, []);

  /*
   * The same person, a new auth event (TOKEN_REFRESHED about hourly, a
   * USER_UPDATED, a failed /me). Their plan did not change because their
   * token did, so keep the plan we already know and refresh only identity.
   * Resetting to toAppUser() here flipped every paying user to "unknown"
   * (and, before access went null, to 'free') for the length of the /me
   * round trip — or for good, when that call failed.
   */
  const keepKnownPlan = useCallback((prev, authUser) => {
    const fresh = toAppUser(authUser);
    if (!fresh || !prev || prev.id !== fresh.id || !prev.planKnown) return fresh;
    return { ...prev, email: fresh.email, name: fresh.name };
  }, [toAppUser]);

  const mergePlanIntoUser = useCallback(
    (authUser, subData) => {
      const base = toAppUser(authUser);
      if (!base) return null;

      const status = subData?.subscription?.status ?? 'active';
      const periodEnd = subData?.subscription?.currentPeriodEnd ?? null;
      const source = subData?.subscription?.source ?? 'free';
      const trial = subData?.trial ?? null;

      // Prefer the `access` the subscription API now computes: 'trial' (Pro+ free
      // for the window), 'active' (paid), 'expired' (trial/comp lapsed → locked),
      // or 'free'. Fall back to deriving it from status+period for older API.
      let access = subData?.access ?? null;
      if (!access) {
        const periodEndMs = periodEnd ? Date.parse(periodEnd) : null;
        const periodExpired = periodEndMs != null && Number.isFinite(periodEndMs) && periodEndMs <= Date.now();
        access = status === 'active' && !periodExpired
          ? 'active'
          : status === 'active' && periodExpired
            ? 'expired'
            : 'free';
      }

      const isTrial = access === 'trial';
      const isExpired = access === 'expired';
      /*
       * `none` — signed up, no autopay set up yet. Deliberately separate from
       * `isExpired`: nothing was lost, so "your trial has ended" would be a
       * lie, and separate from free, which shows no prompt at all. These users
       * have to be sent somewhere, loudly, or they sit on a dashboard that
       * quietly does nothing.
       */
      const needsMandate = access === 'none';
      const hasFullAccess = access === 'trial' || access === 'active';
      const exposedStatus = isExpired ? 'expired' : isTrial ? 'trialing' : status;
      const trialEndsAt = trial?.endsAt ?? (isTrial ? periodEnd : null);
      const trialDaysLeft = typeof trial?.daysLeft === 'number' ? trial.daysLeft : null;
      /*
       * Whether this trial CONVERTS or LAPSES — the single fact that decides
       * what every trial surface says. A mandate-backed trial is going to
       * charge them on a date they need to know; a no-card trial is going to
       * stop. Telling one of them the other's sentence either threatens a
       * charge that is not coming or hides one that is.
       */
      const trialAutoRenews = trial?.autoRenews === true;
      /* Cancelled, but still inside a window they already hold. Every
         "you will be charged on X" sentence has to go quiet when this is on. */
      const subscriptionCanceled = subData?.canceled === true;

      /*
       * The lifecycle state (t1 … lf, `none` before a plan) and whether the
       * engine is enforcing, both decided by subscription-service. The shell
       * reads protection from here and never derives it. Null until /me
       * answers, and on an older API — callers fall back to `access`.
       */
      const planState = typeof subData?.state === 'string' ? subData.state : null;
      const planProtected = typeof subData?.protected === 'boolean' ? subData.protected : null;
      const planStateEndsAt = subData?.stateEndsAt ?? null;

      const accessFields = {
        planState,
        planProtected,
        planStateEndsAt,
        access,
        isTrial,
        isExpired,
        needsMandate,
        trialDaysLeft,
        trialEndsAt,
        trialAutoRenews,
        subscriptionCanceled,
      };

      if (!subData?.plan) {
        return {
          ...base,
          ...accessFields,
          planKnown: true,
          plan: 'free',
          planLabel: 'Free',
          billingPlan: 'free',
          subscribedPlanSlug: 'free',
          subscribedPlanLabel: 'Free',
          subscriptionStatus: exposedStatus,
          currentPeriodEnd: periodEnd,
          subscriptionSource: source,
          limits: hasFullAccess ? (subData?.limits ?? null) : null,
        };
      }

      const planName = subData.plan.name || 'Free';
      // The plan the user is ASSIGNED. During a trial this is deliberately
      // 'free' — they've bought nothing.
      const slug = (subData.plan.slug || planKeyFromName(planName)) || 'free';
      // The plan whose features apply RIGHT NOW. Equals `slug` except during a
      // trial, where the API resolves it to the top plan (Pro+).
      const entitlementSlug = subData.entitlementPlanSlug || (isTrial ? 'pro_plus' : slug);

      return {
        ...base,
        ...accessFields,
        planKnown: true,
        // `plan` drives FEATURE GATING, so during a trial it must be the
        // entitlement (Pro+) — that's what "everything free for the trial" means.
        // When expired/free the app gates to free (the upgrade wall enforces the
        // locked state on top).
        plan: hasFullAccess ? (isTrial ? entitlementSlug : slug) : 'free',
        // A trial is NOT a purchase — never show the trialist a paid tier's name,
        // or they think they already bought it and never convert.
        planLabel: isTrial ? 'Free trial' : hasFullAccess ? planName : isExpired ? 'Trial ended' : 'Free',
        // `billingPlan` drives UPGRADE/CHECKOUT eligibility — what they've paid
        // for, which during a trial is nothing. This is what keeps every paid
        // plan buyable instead of showing "Current plan ✓".
        billingPlan: isTrial ? 'free' : hasFullAccess ? slug : 'free',
        limits: hasFullAccess ? (subData.limits ?? subData.plan?.features ?? null) : null,
        subscribedPlanSlug: slug,
        subscribedPlanLabel: planName,
        subscriptionStatus: exposedStatus,
        currentPeriodEnd: periodEnd,
        subscriptionSource: source,
      };
    },
    [toAppUser]
  );

  const initializeProfileIfNeeded = useCallback(async (targetSession, fallbackName) => {
    const accessToken = targetSession?.access_token;
    const userId = targetSession?.user?.id;
    if (!accessToken || !userId) return;
    if (initializedProfilesRef.current.has(userId)) return;

    try {
      const res = await initUserProfile({
        accessToken,
        fullName:
          fallbackName ||
          targetSession.user.user_metadata?.full_name ||
          targetSession.user.user_metadata?.name ||
          null,
        email: targetSession.user?.email || null,
        // The channel that won this user, from their first-ever visit. Stored on
        // the profile the first time it's created; ignored on later calls.
        attribution: firstTouch(),
        // Fills the profile's timezone when it has none — a new signup, or
        // anyone who joined before timezones existed. Ignored otherwise, so
        // a zone picked in Preferences is never overwritten by a laptop.
        timezone: browserZone(),
      });
      const tz = profileZoneOf(res);
      if (tz !== undefined) setUserZone(tz);
      initializedProfilesRef.current.add(userId);
    } catch {
      // Non-blocking; user can still use auth flow.
    }
  }, []);

  /*
   * /subscriptions/me: ONE ANSWER AT A TIME, RETRIED UNTIL IT COMES.
   *
   * `seq` drops a slow response that lands after a newer one (a 10 s /me
   * from before a checkout must not overwrite the answer from after it).
   * A failure keeps the last known plan for the same user — or stays
   * unknown if there is none — and retries on a backoff, so one cold Lambda
   * or a dropped connection no longer decides what the user is told for the
   * rest of the session. Focus and visibility also refetch (below).
   */
  const subSeqRef = useRef(0);
  const subRetryRef = useRef({ timer: null, attempt: 0 });
  const subOkAtRef = useRef(0);
  const loadSubscriptionRef = useRef(null);
  const clearSubRetry = useCallback(() => {
    clearTimeout(subRetryRef.current.timer);
    subRetryRef.current = { timer: null, attempt: 0 };
  }, []);
  const loadSubscription = useCallback(async (targetSession) => {
    const token = targetSession?.access_token;
    if (!token) {
      clearSubRetry();
      setSubscription(null);
      setSubscriptionError(null);
      return;
    }
    const mySeq = ++subSeqRef.current;
    clearTimeout(subRetryRef.current.timer);
    setSubscriptionLoading(true);
    try {
      const data = await getCurrentSubscription({ accessToken: token });
      if (mySeq !== subSeqRef.current) return;
      subRetryRef.current = { timer: null, attempt: 0 };
      subOkAtRef.current = Date.now();
      setSubscriptionError(null);
      setSubscription(data);
      // The /me payload carries the profile's timezone too. A mirror must
      // not write the mirrored user's zone into the operator's storage.
      const tz = profileZoneOf(data);
      if (tz !== undefined) setUserZone(tz, { persist: !isMirroring() });
      setUser(mergePlanIntoUser(targetSession.user, data));
    } catch (e) {
      if (mySeq !== subSeqRef.current) return;
      setSubscriptionError(e?.message || 'Could not load subscription');
      // Keep `subscription` and the user's known plan: a failed read is not
      // evidence the plan changed. Unknown stays unknown (access: null).
      setUser((prev) => keepKnownPlan(prev, targetSession.user));
      const attempt = subRetryRef.current.attempt;
      const delay = SUB_RETRY_MS[Math.min(attempt, SUB_RETRY_MS.length - 1)];
      subRetryRef.current = {
        attempt: attempt + 1,
        timer: setTimeout(() => loadSubscriptionRef.current?.(targetSession), delay),
      };
    } finally {
      if (mySeq === subSeqRef.current) setSubscriptionLoading(false);
    }
  }, [mergePlanIntoUser, keepKnownPlan, clearSubRetry]);
  useEffect(() => { loadSubscriptionRef.current = loadSubscription; }, [loadSubscription]);

  const bootstrapSession = useCallback(
    async (targetSession, nameHint) => {
      if (!targetSession?.access_token) {
        setSubscription(null);
        setSubscriptionError(null);
        return;
      }
      const fallbackName =
        nameHint ||
        targetSession.user.user_metadata?.full_name ||
        targetSession.user.user_metadata?.name ||
        null;
      await initializeProfileIfNeeded(targetSession, fallbackName);
      await loadSubscription(targetSession);
    },
    [initializeProfileIfNeeded, loadSubscription]
  );

  useEffect(() => {
    let mounted = true;

    /*
     * A MIRROR SESSION SHORT-CIRCUITS SUPABASE ENTIRELY.
     *
     * The token in the URL fragment already identifies the user, so there is
     * nothing to ask Supabase for — and asking would be wrong twice over: the
     * operator's own session would win the race on a machine where they are
     * logged in, and `onAuthStateChange` would then overwrite the mirror with
     * it mid-session.
     *
     * So we adopt the mirror, skip the Supabase bootstrap and never subscribe
     * to its listener. Nothing is written to storage, so a refresh drops
     * straight back to whoever is actually logged in. See lib/mirror.js.
     */
    if (adoptMirrorFromUrl()) {
      const ms = mirrorSession();
      setSession(ms);
      setUser(toAppUser(ms.user));
      setAuthReady(true);
      /*
       * `loadSubscription`, NOT `bootstrapSession`.
       *
       * A mirror must leave no trace on the account being looked at. Bootstrap
       * also runs `initializeProfileIfNeeded`, which POSTs to create or update
       * the user's profile — an operator opening a page is not the user
       * updating their own name, and the write would be refused by the mirror
       * guard anyway, so the only thing it could produce is a 403 in the
       * console. The subscription read is a GET and is all this needs.
       *
       * No `setAnalyticsUser` and no `trackLogin` either: looking at an account
       * is not a login, and counting it would corrupt that user's own activity
       * — which is exactly the data an operator opens this to read.
       */
      loadSubscription(ms);
      return () => {
        mounted = false;
      };
    }

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const nextSession = data?.session ?? null;
      setSession(nextSession);
      setUser((prev) => keepKnownPlan(prev, nextSession?.user ?? null));
      setAuthReady(true);
      if (nextSession) {
        // Identity only — a restored session is not a fresh login.
        setAnalyticsUser(nextSession.user?.id);
        await bootstrapSession(nextSession);
      }
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser((prev) => keepKnownPlan(prev, nextSession?.user ?? null));
      setAuthReady(true);
      if (nextSession) {
        // Analytics: SIGNED_IN fires for password, OAuth AND signup. A signup
        // already emitted its own event, so suppress the duplicate login here.
        // INITIAL_SESSION / TOKEN_REFRESHED don't fire it, so page reloads and
        // token refreshes never inflate the login count.
        setAnalyticsUser(nextSession.user?.id);
        if (_event === 'SIGNED_IN') {
          if (suppressLoginEventRef.current) suppressLoginEventRef.current = false;
          else trackLogin(nextSession.user?.id);
        }
        await bootstrapSession(nextSession);
      } else {
        setAnalyticsUser(null);
        clearSubRetry();
        subSeqRef.current += 1;
        setSubscription(null);
        setSubscriptionError(null);
        setUserZone(null);
        initializedProfilesRef.current = new Set();
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [bootstrapSession, toAppUser, keepKnownPlan, clearSubRetry]);

  /*
   * Refetch the plan when the user comes back to the tab: after a failure
   * (so a retry does not wait out its backoff), or when the last answer is
   * over a minute old (a payment made in another tab, a plan that ended
   * while this one sat in the background). Never more than once a minute
   * otherwise — /me is not free.
   */
  const sessionRef = useRef(null);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const subErrorRef = useRef(null);
  useEffect(() => { subErrorRef.current = subscriptionError; }, [subscriptionError]);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onFocus = () => {
      if (document.hidden) return;
      const s = sessionRef.current;
      if (!s?.access_token) return;
      if (subErrorRef.current || Date.now() - subOkAtRef.current > SUB_FOCUS_STALE_MS) loadSubscriptionRef.current?.(s);
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  useEffect(() => () => clearTimeout(subRetryRef.current.timer), []);

  // Tag/clear the Sentry user scope so error events from authenticated users
  // are attributable. No-op when Sentry isn't configured.
  useEffect(() => {
    if (user) identifySentryUser(user);
    else clearSentryUser();
  }, [user]);

  const refetchSubscription = useCallback(async () => {
    if (!session?.access_token) return;
    await loadSubscription(session);
  }, [session, loadSubscription]);

  const login = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const nextSession = data?.session ?? null;
      const nextUser = toAppUser(data?.user ?? null);
      setSession(nextSession);
      setUser(nextUser);
      if (nextSession) {
        await bootstrapSession(nextSession, nextUser?.name);
      }
      return nextUser;
    },
    [bootstrapSession, toAppUser]
  );

  const signup = useCallback(
    async (email, password, name) => {
      // Mark BEFORE the call: Supabase fires SIGNED_IN on a successful signup,
      // and that listener must not double-count it as a login.
      suppressLoginEventRef.current = true;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || null,
          },
        },
      });
      if (error) {
        suppressLoginEventRef.current = false;
        throw error;
      }

      const nextSession = data?.session ?? null;
      const nextUser = toAppUser(data?.user ?? null);
      setSession(nextSession);
      setUser(nextUser);
      trackSignup(data?.user?.id);
      if (nextSession) {
        await bootstrapSession(nextSession, name);
      } else {
        // Email confirmation required — no SIGNED_IN will follow, so release.
        suppressLoginEventRef.current = false;
      }

      return {
        user: nextUser,
        requiresEmailConfirmation: !nextSession,
      };
    },
    [bootstrapSession, toAppUser]
  );

  const loginWithGoogle = useCallback(async (redirectPath = '/dashboard') => {
    const path = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
    const redirectTo = `${window.location.origin}${path}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  }, []);

  /**
   * Send the "reset your password" email. Supabase deliberately succeeds even
   * when the address has no account, so the UI must never confirm or deny that
   * an email is registered — that would turn this form into an account-existence
   * oracle for anyone who wants to enumerate our users.
   */
  const requestPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  /**
   * Set a new password for the CURRENT session. Used by both flows: the recovery
   * link (which signs the user in with a short-lived recovery session) and the
   * signed-in "change password" form in account settings.
   */
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  /**
   * Confirm the account's current password without disturbing the active
   * session. Supabase lets a signed-in user change their password without
   * proving they know the old one, which means an unattended logged-in browser
   * is enough to take the account over — so the change-password form re-checks
   * it first.
   */
  const verifyPassword = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  /**
   * Re-send the signup confirmation email. Supabase rate-limits this per address,
   * so the UI must treat a failure as "wait a moment", not "something is broken".
   */
  const resendVerificationEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard?welcome=1` },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut();
    clearSubRetry();
    subSeqRef.current += 1;
    setUser(null);
    setSession(null);
    setSubscription(null);
    setSubscriptionError(null);
    // The next person on this browser starts from the device clock, not
    // from the last user's chosen zone.
    setUserZone(null);
    initializedProfilesRef.current = new Set();
  }, [clearSubRetry]);

  /** After a successful PUT /profile/timezone — see PreferencesPage. */
  const setTimezone = useCallback((tz) => setUserZone(tz), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authReady,
        /* True while this tab is a read-only mirror of someone's account.
           Screens read it to disable their own write affordances; the actual
           refusal happens server-side. See lib/mirror.js. */
        mirroring: isMirroring(),
        mirror: mirrorInfo(),
        subscription,
        subscriptionLoading,
        subscriptionError,
        refetchSubscription,
        /* The zone every date and time is shown in (lib/userZone): the
           profile's, else the device's. */
        timezone,
        setTimezone,
        login,
        signup,
        logout,
        loginWithGoogle,
        requestPasswordReset,
        resendVerificationEmail,
        updatePassword,
        verifyPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
