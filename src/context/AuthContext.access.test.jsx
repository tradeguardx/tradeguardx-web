/**
 * R3 · a paying user is never shown "Watching / plan lapsed" from a failed
 * or slow /subscriptions/me.
 *
 * The bug: `access` defaulted to 'free', a failed /me left it there, and the
 * guard read that as unentitled — "Watching only, your plan has lapsed" to
 * someone whose plan was fine. The same reset ran on every hourly
 * TOKEN_REFRESHED, for the length of the /me round trip.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

const SESSION = { access_token: 'tok', user: { id: 'u1', email: 'a@b.c', user_metadata: { full_name: 'Asha' } } };
const ACTIVE = { access: 'active', state: 'p1', protected: true, plan: { slug: 'pro', name: 'Pro' }, subscription: { status: 'active', source: 'payment' } };

const sub = vi.fn();
const authListener = vi.hoisted(() => ({ cb: null }));
vi.mock('../api/userApi', () => ({ initUserProfile: vi.fn(async () => ({})) }));
vi.mock('../api/subscriptionApi', () => ({ getCurrentSubscription: (...a) => sub(...a) }));
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: SESSION } }),
      onAuthStateChange: (cb) => { authListener.cb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    },
  },
}));
vi.mock('../lib/mirror', () => ({
  adoptMirrorFromUrl: () => false, isMirroring: () => false, mirrorInfo: () => null, mirrorSession: () => null,
}));
vi.mock('../sentry.js', () => ({ identifySentryUser: () => {}, clearSentryUser: () => {} }));
vi.mock('../lib/analytics', () => ({
  setAnalyticsUser: () => {}, trackLogin: () => {}, trackSignup: () => {}, firstTouch: () => null,
}));

const { AuthProvider, useAuth } = await import('./AuthContext');

function Probe() {
  const { user, subscriptionError } = useAuth();
  return (
    <div>
      <span data-testid="access">{String(user?.access)}</span>
      <span data-testid="known">{String(user?.planKnown)}</span>
      <span data-testid="label">{user?.planLabel ?? ''}</span>
      <span data-testid="err">{subscriptionError ? 'error' : 'ok'}</span>
    </div>
  );
}
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);

beforeEach(() => { sub.mockReset(); authListener.cb = null; });

describe('access is unknown until /me answers — never "free"', () => {
  it('a slow /me leaves access unknown (null), not free', async () => {
    sub.mockImplementation(() => new Promise(() => {})); // a 10 s+ answer that has not come
    mount();
    await waitFor(() => expect(sub).toHaveBeenCalled());
    expect(screen.getByTestId('access').textContent).toBe('null');
    expect(screen.getByTestId('known').textContent).toBe('false');
  });

  it('a failed /me stays unknown, then retries on its own and lands the real plan', async () => {
    sub.mockRejectedValueOnce(new Error('502 cold start')).mockResolvedValue(ACTIVE);
    mount();
    await waitFor(() => expect(screen.getByTestId('err').textContent).toBe('error'));
    expect(screen.getByTestId('access').textContent).toBe('null');
    // First retry is 2 s out.
    await waitFor(() => expect(screen.getByTestId('access').textContent).toBe('active'), { timeout: 4_000 });
    expect(screen.getByTestId('err').textContent).toBe('ok');
    expect(sub).toHaveBeenCalledTimes(2);
  });

  it('a token refresh whose /me fails keeps the plan already known', async () => {
    sub.mockResolvedValue(ACTIVE);
    mount();
    await waitFor(() => expect(screen.getByTestId('access').textContent).toBe('active'));
    sub.mockRejectedValue(new Error('timeout'));
    await act(async () => { await authListener.cb('TOKEN_REFRESHED', { ...SESSION, access_token: 'tok2' }); });
    expect(screen.getByTestId('access').textContent).toBe('active');
    expect(screen.getByTestId('label').textContent).toBe('Pro');
  });

  it('a slow older /me cannot overwrite a newer answer', async () => {
    let resolveOld;
    sub.mockImplementationOnce(() => new Promise((r) => { resolveOld = r; })).mockResolvedValue(ACTIVE);
    mount();
    await waitFor(() => expect(sub).toHaveBeenCalledTimes(1));
    await act(async () => { await authListener.cb('TOKEN_REFRESHED', { ...SESSION, access_token: 'tok2' }); });
    await waitFor(() => expect(screen.getByTestId('access').textContent).toBe('active'));
    await act(async () => { resolveOld({ access: 'expired', state: 'pe', protected: false, plan: null }); });
    expect(screen.getByTestId('access').textContent).toBe('active');
  });
});
