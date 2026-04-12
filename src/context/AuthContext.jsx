import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { initUserProfile } from '../api/userApi';
import { getCurrentSubscription } from '../api/subscriptionApi';

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

  const toAppUser = useCallback((authUser) => {
    if (!authUser) return null;
    const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: fullName || (authUser.email ? authUser.email.split('@')[0] : 'User'),
      plan: 'free',
      planLabel: 'Free',
      limits: null,
    };
  }, []);

  const mergePlanIntoUser = useCallback(
    (authUser, subData) => {
      const base = toAppUser(authUser);
      if (!base) return null;
      if (!subData?.plan) {
        return { ...base, plan: 'free', planLabel: 'Free', limits: subData?.limits ?? null };
      }
      const planName = subData.plan.name || 'Free';
      const slug = subData.plan.slug || planKeyFromName(planName);
      return {
        ...base,
        plan: slug || 'free',
        planLabel: planName,
        limits: subData.limits ?? subData.plan?.features ?? null,
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
        await bootstrapSession(nextSession);
      }
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(toAppUser(nextSession?.user ?? null));
      setAuthReady(true);
      if (nextSession) {
        await bootstrapSession(nextSession);
      } else {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || null,
          },
        },
      });
      if (error) throw error;

      const nextSession = data?.session ?? null;
      const nextUser = toAppUser(data?.user ?? null);
      setSession(nextSession);
      setUser(nextUser);
      if (nextSession) {
        await bootstrapSession(nextSession, name);
      }

      return {
        user: nextUser,
        requiresEmailConfirmation: !nextSession,
      };
    },
    [bootstrapSession, toAppUser]
  );

  const loginWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
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
