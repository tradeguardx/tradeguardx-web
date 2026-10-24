import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '../../api/httpClient';
import { getUserZone, setUserZone } from '../../lib/userZone';

/**
 * The timezone setting is the one preference that changes what is enforced:
 * the daily limits reset at midnight in it. What is worth pinning is that a
 * save reaches the server and the display, and that the once-a-week refusal
 * says WHEN rather than "something went wrong".
 */

const update = vi.fn();
vi.mock('../../api/userApi', async (orig) => ({
  ...(await orig()),
  updateUserTimezone: (...a) => update(...a),
}));

const auth = {
  session: { access_token: 'tok' },
  timezone: 'Asia/Kolkata',
  mirroring: false,
  setTimezone: vi.fn((tz) => setUserZone(tz)),
};
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('../common/ToastProvider', () => ({ useToast: () => toast }));

const { default: TimezoneSetting } = await import('./TimezoneSetting');

beforeEach(() => {
  setUserZone('Asia/Kolkata');
  auth.timezone = 'Asia/Kolkata';
  update.mockReset();
  auth.setTimezone.mockClear();
});
afterEach(() => setUserZone(null));

const pickDubai = () => {
  fireEvent.change(screen.getByLabelText('Change to'), { target: { value: 'dubai' } });
  fireEvent.click(screen.getByRole('option', { name: /United Arab Emirates — Dubai/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Dubai' }));
};

describe('timezone preference', () => {
  it('shows the current zone with its offset and the next-reset rule', () => {
    render(<TimezoneSetting />);
    // The current zone (the list below has its own "India" row too).
    expect(screen.getAllByText('India').length).toBeGreaterThan(0);
    expect(screen.getByText(/Asia\/Kolkata · GMT\+5:30 · IST/)).toBeTruthy();
    expect(screen.getByText(/Applies to your daily limits from your next daily reset/)).toBeTruthy();
    // India keeps 05:30 — the old UTC midnight.
    expect(screen.getByText(/your daily limits reset at 05:30 in it, early morning your time/)).toBeTruthy();
  });

  it('saves with PUT, then shows times in the new zone', async () => {
    update.mockResolvedValue({ timezone: 'Asia/Dubai', appliesFrom: 'next_daily_reset' });
    render(<TimezoneSetting />);
    pickDubai();
    await waitFor(() => expect(update).toHaveBeenCalledWith({ accessToken: 'tok', timezone: 'Asia/Dubai' }));
    await screen.findByText(/Saved\. Times now show in Dubai time\. Your daily limits switch over at your next daily reset\./);
    expect(auth.setTimezone).toHaveBeenCalledWith('Asia/Dubai');
    expect(getUserZone()).toBe('Asia/Dubai');
  });

  it('on 429 says when it can change again, and changes nothing', async () => {
    update.mockRejectedValue(new ApiError('Too soon', 429, {
      success: false,
      error: { code: 'TIMEZONE_CHANGE_TOO_SOON', message: 'Too soon', retryAfter: '2026-10-31T06:00:00.000Z' },
    }));
    render(<TimezoneSetting />);
    pickDubai();
    await screen.findByText(/You changed your timezone recently\. It can change once every 7 days — next on 31 Oct\./);
    expect(auth.setTimezone).not.toHaveBeenCalled();
    expect(getUserZone()).toBe('Asia/Kolkata');
  });

  it('offers this device\'s zone when it differs from the saved one', () => {
    // The test device is pinned to India (test/setup.js); save something else.
    setUserZone('Asia/Dubai');
    auth.timezone = 'Asia/Dubai';
    render(<TimezoneSetting />);
    expect(screen.getByRole('button', { name: /Use this device’s timezone \(India, GMT\+5:30\)/ })).toBeTruthy();
  });

  it('filters the list as you type, by city', () => {
    render(<TimezoneSetting />);
    fireEvent.change(screen.getByLabelText('Change to'), { target: { value: 'new york' } });
    expect(screen.getByRole('option', { name: /United States — New York/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Dubai/ })).toBeNull();
  });

  it('ranks real matches first: usa is the US (New York first), uk is the UK, not Israel or Ukraine', () => {
    render(<TimezoneSetting />);
    const search = screen.getByLabelText('Change to');
    fireEvent.change(search, { target: { value: 'usa' } });
    expect(screen.getAllByRole('option')[0].textContent).toMatch(/United States — New York/);
    expect(screen.getAllByRole('option').some((o) => /Israel/.test(o.textContent))).toBe(false);
    expect(screen.getByText(/United States has \d+ timezones — pick the city nearest you/)).toBeTruthy();
    fireEvent.change(search, { target: { value: 'uk' } });
    expect(screen.getAllByRole('option')[0].textContent).toMatch(/United Kingdom — London/);
  });

  it('finds a zone by its country: Nepal, Bangladesh, Thailand', () => {
    render(<TimezoneSetting />);
    const search = screen.getByLabelText('Change to');
    for (const [q, row] of [['nepal', /Nepal — Kath?mandu/], ['bangladesh', /Bangladesh — Dhaka/], ['thailand', /Thailand — Bangkok/], ['uae', /United Arab Emirates — Dubai/], ['sri lanka', /Sri Lanka — Colombo/], ['pakistan', /Pakistan — Karachi/]]) {
      fireEvent.change(search, { target: { value: q } });
      expect(screen.getAllByRole('option').some((o) => row.test(o.textContent))).toBe(true);
    }
  });
});
