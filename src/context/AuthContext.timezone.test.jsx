/* global process -- Node test runner: the device zone is process.env.TZ */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setUserZone } from '../lib/userZone';

/**
 * How a profile gets its timezone: the web sends the device's zone on the
 * profile init call, and the server keeps it only when the profile has none.
 * Whatever the profile then holds is the zone every screen shows.
 */

const SESSION = { access_token: 'tok', user: { id: 'u1', email: 'a@b.c', user_metadata: { full_name: 'Asha' } } };

const init = vi.fn();
vi.mock('../api/userApi', () => ({ initUserProfile: (...a) => init(...a) }));
const sub = vi.fn();
vi.mock('../api/subscriptionApi', () => ({ getCurrentSubscription: (...a) => sub(...a) }));
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: SESSION } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
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

function Zone() {
  const { timezone } = useAuth();
  return <span data-testid="tz">{timezone}</span>;
}
const mount = () => render(<AuthProvider><Zone /></AuthProvider>);

const DEVICE = process.env.TZ;
beforeEach(() => {
  setUserZone(null);
  init.mockReset();
  sub.mockReset().mockResolvedValue({ plan: null });
});
afterEach(() => { process.env.TZ = DEVICE; setUserZone(null); });

describe('profile timezone', () => {
  it('sends this device\'s zone on profile init', async () => {
    process.env.TZ = 'Asia/Dubai';
    init.mockResolvedValue({ success: true, data: { ok: true, timezone: 'Asia/Dubai' } });
    mount();
    await waitFor(() => expect(init).toHaveBeenCalled());
    expect(init.mock.calls[0][0]).toMatchObject({ accessToken: 'tok', timezone: 'Asia/Dubai' });
    await waitFor(() => expect(screen.getByTestId('tz').textContent).toBe('Asia/Dubai'));
  });

  it('shows the zone the profile already holds, not the device\'s', async () => {
    process.env.TZ = 'Europe/London';
    // The server ignored the device zone because the profile had one.
    init.mockResolvedValue({ success: true, data: { ok: true, timezone: 'Asia/Kolkata' } });
    mount();
    await waitFor(() => expect(screen.getByTestId('tz').textContent).toBe('Asia/Kolkata'));
    expect(init.mock.calls[0][0].timezone).toBe('Europe/London');
  });

  it('reads the zone off the /me payload too', async () => {
    init.mockResolvedValue({ success: true, data: { ok: true } });
    sub.mockResolvedValue({ plan: null, timezone: 'Asia/Singapore' });
    mount();
    await waitFor(() => expect(screen.getByTestId('tz').textContent).toBe('Asia/Singapore'));
  });

  it('stays on the device zone when nothing says otherwise', async () => {
    process.env.TZ = 'America/New_York';
    init.mockResolvedValue({ success: true, data: { ok: true } });
    mount();
    await waitFor(() => expect(sub).toHaveBeenCalled());
    expect(screen.getByTestId('tz').textContent).toBe('America/New_York');
  });
});
