import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = { session: null };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
const bindReferral = vi.fn();
vi.mock('../../api/referralApi', () => ({ bindReferral: (...a) => bindReferral(...a) }));
vi.mock('./ReferralCelebration', () => ({ default: () => null }));

const { default: ReferralCapture } = await import('./ReferralCapture');
const { getStoredReferralCode, isReferralBindPending } = await import('../../lib/referralCode');

function mount(search) {
  window.history.replaceState(null, '', `/pricing${search}#plans`);
  return render(<MemoryRouter initialEntries={[`/pricing${search}`]}><ReferralCapture /></MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  auth.session = null;
  bindReferral.mockReset();
});

describe('referral capture', () => {
  it('stores the code, marks a bind pending and strips ref from the address bar', () => {
    mount('?ref=arif4k7q&plan=pro');
    expect(getStoredReferralCode()).toBe('ARIF4K7Q');
    expect(isReferralBindPending()).toBe(true);
    expect(window.location.search).toBe('?plan=pro');
    expect(window.location.hash).toBe('#plans');
    expect(bindReferral).not.toHaveBeenCalled();
  });

  it('binds once after login and clears the pending flag on a 200', async () => {
    bindReferral.mockResolvedValue({ bound: true });
    const { rerender } = mount('?ref=ARIF4K7Q');
    auth.session = { access_token: 'jwt' };
    rerender(<MemoryRouter initialEntries={['/pricing?ref=ARIF4K7Q']}><ReferralCapture /></MemoryRouter>);
    await waitFor(() => expect(isReferralBindPending()).toBe(false));
    rerender(<MemoryRouter initialEntries={['/pricing?ref=ARIF4K7Q']}><ReferralCapture /></MemoryRouter>);
    expect(bindReferral).toHaveBeenCalledTimes(1);
    expect(bindReferral).toHaveBeenCalledWith({ accessToken: 'jwt', code: 'ARIF4K7Q' });
  });

  it('clears the flag on a "not bound" 200 too, and forgets your own code', async () => {
    auth.session = { access_token: 'jwt' };
    bindReferral.mockResolvedValue({ bound: false, reason: 'own_code' });
    mount('?ref=ARIF4K7Q');
    await waitFor(() => expect(isReferralBindPending()).toBe(false));
    expect(getStoredReferralCode()).toBeNull();
  });

  it('keeps the code and the flag when the call fails, silently', async () => {
    auth.session = { access_token: 'jwt' };
    bindReferral.mockRejectedValue(new Error('500'));
    mount('?ref=ARIF4K7Q');
    await waitFor(() => expect(bindReferral).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(isReferralBindPending()).toBe(true);
    expect(getStoredReferralCode()).toBe('ARIF4K7Q');
  });

  it('does nothing for a signed-in user with no captured code', () => {
    auth.session = { access_token: 'jwt' };
    mount('');
    expect(bindReferral).not.toHaveBeenCalled();
  });
});
