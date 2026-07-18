import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { initUserProfile } from '../api/userApi';
import { getCurrentSubscription } from '../api/subscriptionApi';
import { identifySentryUser, clearSentryUser } from '../sentry.js';
import { setAnalyticsUser, trackLogin, trackSignup, firstTouch } from '../lib/analytics';

const AuthContext = createContext(null);

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
  // Set by signup() so the SIGNED_IN that follows isn't also counted as a login.
  const suppressLoginEventRef = useRef(false);

  const toAppUser = useCallback((authUser) => {
    if (!authUser) return null;
    const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: fullName || (authUser.email ? authUser.email.split('@')[0] : 'User'),
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
      // subscription loads. `access`: 'trial' | 'active' | 'expired' | 'free'.
      access: 'free',
      isTrial: false,
      isExpired: false,
      trialDaysLeft: null,
      trialEndsAt: null,
    };
  }, []);

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
      const hasFullAccess = access === 'trial' || access === 'active';
      const exposedStatus = isExpired ? 'expired' : isTrial ? 'trialing' : status;
      const trialEndsAt = trial?.endsAt ?? (isTrial ? periodEnd : null);
      const trialDaysLeft = typeof trial?.daysLeft === 'number' ? trial.daysLeft : null;

      const accessFields = { access, isTrial, isExpired, trialDaysLeft, trialEndsAt };

      if (!subData?.plan) {
        return {
          ...base,
          ...accessFields,
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
        // `plan` drives FEATURE GATING, so during a trial it must be the
        // entitlement (Pro+) — that's what "everything free for 7 days" means.
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
      await initUserProfile({
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
      });
      initializedProfilesRef.current.add(userId);
    } catch {
      // Non-blocking; user can still use auth flow.
    }
  }, []);

  const loadSubscription = useCallback(async (targetSession) => {
    const token = targetSession?.access_token;
    if (!token) {
      setSubscription(null);
      setSubscriptionError(null);
      return;
    }
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    try {
      const data = await getCurrentSubscription({ accessToken: token });
      setSubscription(data);
      setUser(mergePlanIntoUser(targetSession.user, data));
    } catch (e) {
      setSubscriptionError(e?.message || 'Could not load subscription');
      setSubscription(null);
      setUser(toAppUser(targetSession.user));
    } finally {
      setSubscriptionLoading(false);
    }
  }, [mergePlanIntoUser, toAppUser]);

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

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const nextSession = data?.session ?? null;
      setSession(nextSession);
      setUser(toAppUser(nextSession?.user ?? null));
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
      setUser(toAppUser(nextSession?.user ?? null));
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
        setSubscription(null);
        setSubscriptionError(null);
        initializedProfilesRef.current = new Set();
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [bootstrapSession, toAppUser]);

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
    setUser(null);
    setSession(null);
    setSubscription(null);
    setSubscriptionError(null);
    initializedProfilesRef.current = new Set();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authReady,
        subscription,
        subscriptionLoading,
        subscriptionError,
        refetchSubscription,
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
