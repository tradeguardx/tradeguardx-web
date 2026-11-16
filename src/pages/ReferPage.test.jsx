import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ session: { access_token: 'jwt' } }) }));
const getReferralMe = vi.fn();
vi.mock('../api/referralApi', () => ({ getReferralMe: (...a) => getReferralMe(...a) }));

const { default: ReferPage } = await import('./ReferPage');

const ME = {
  code: 'ARIF4K7Q',
  link: 'https://tradeguardx.com/?ref=ARIF4K7Q',
  friendDiscountPct: 10,
  rewardsInr: { monthly: 200, quarterly: 400, yearly: 1000 },
  holdDays: 3,
  annualCapInr: 15000,
  fy: '2026-27',
  earnedThisFyInr: 400,
  onTheWayInr: 200,
  capReached: false,
  stats: { joined: 3, paid: 2, qualified: 1 },
  friends: [
    { id: 'e2', name: 'Priya S.', initials: 'PS', plan: 'monthly', amountInr: 200, signedUpAt: '2026-11-10T00:00:00Z', paidAt: '2026-11-15T00:00:00Z', dueAt: '2026-11-18T00:00:00Z', status: 'waiting' },
    { id: 'joined:abc', name: 'Neha', initials: 'N', plan: null, amountInr: null, signedUpAt: '2026-11-14T00:00:00Z', paidAt: null, dueAt: null, status: 'joined' },
    { id: 'e1', name: 'Rahul M.', initials: 'RM', plan: 'quarterly', amountInr: 400, signedUpAt: '2026-11-01T00:00:00Z', paidAt: '2026-11-02T00:00:00Z', dueAt: '2026-11-05T00:00:00Z', status: 'sent', voucherCode: 'AMZN-1234', sentAt: '2026-11-06T00:00:00Z' },
  ],
};

const renderPage = () => render(<MemoryRouter><ReferPage /></MemoryRouter>);

beforeEach(() => { getReferralMe.mockReset(); });
afterEach(() => vi.useRealTimers());

describe('Refer a trader page', () => {
  it('shows a loading state, never a verdict, until data lands', async () => {
    let resolve;
    getReferralMe.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Invited')).toBeNull();
    expect(screen.queryByText(/No referrals yet/)).toBeNull();
    await act(async () => { resolve(ME); });
    expect(await screen.findByTestId('referral-link')).toHaveTextContent('tradeguardx.com/?ref=ARIF4K7Q');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('leads with the offer and the stats', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    const stats = await screen.findByTestId('referral-stats');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Give 10% off.Get up to ₹1,000.');
    expect(within(stats).getByText('Invited').nextSibling).toHaveTextContent('3');
    expect(within(stats).getByText('Earned this year').nextSibling).toHaveTextContent('₹400');
    expect(within(stats).getByText('₹200 more on its way')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '400');
    expect(screen.getByText(/₹14,600 left/)).toBeInTheDocument();
  });

  it('tracks each friend and shows a voucher code only once sent, under Paid out', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    const rows = await screen.findAllByTestId('friend-row');
    expect(rows).toHaveLength(2); // in progress: Priya + Neha
    expect(within(rows[0]).getByText('Priya S.')).toBeInTheDocument();
    expect(within(rows[0]).getByText('In the 3-day wait')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Waiting for their first payment')).toBeInTheDocument();
    expect(screen.queryByText('AMZN-1234')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Paid out · 1/ }));
    const paid = screen.getAllByTestId('friend-row');
    expect(within(paid[0]).getByText('Rahul M.')).toBeInTheDocument();
    expect(within(paid[0]).getByText('AMZN-1234')).toBeInTheDocument();
  });

  it('shares the editable message', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    const box = await screen.findByRole('textbox', { name: /Message to send/ });
    expect(box.value).toContain('https://tradeguardx.com/?ref=ARIF4K7Q');
    fireEvent.change(box, { target: { value: 'Try this: https://tradeguardx.com/?ref=ARIF4K7Q' } });
    const wa = screen.getByRole('link', { name: /Share on WhatsApp/ });
    expect(decodeURIComponent(wa.href)).toContain('Try this: https://tradeguardx.com/?ref=ARIF4K7Q');
    for (const name of [/Telegram/, /Share on X/]) {
      expect(decodeURIComponent(screen.getByRole('link', { name }).href)).toContain('https://tradeguardx.com/?ref=ARIF4K7Q');
    }
  });

  it('switches to the yearly-limit state and offers a proper arrangement', async () => {
    getReferralMe.mockResolvedValue({
      ...ME, earnedThisFyInr: 15000, onTheWayInr: 0, capReached: true,
      friends: [{ ...ME.friends[0], status: 'held' }],
    });
    renderPage();
    expect(await screen.findByText(/reached this year.s limit/)).toBeInTheDocument();
    expect(screen.getByText('Held: you’ve hit this year’s limit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveAttribute('href', '/dashboard/support');
  });

  it('shows an empty state when nobody has joined', async () => {
    getReferralMe.mockResolvedValue({ ...ME, earnedThisFyInr: 0, onTheWayInr: 0, stats: { joined: 0, paid: 0, qualified: 0 }, friends: [] });
    renderPage();
    expect(await screen.findByTestId('referral-empty')).toHaveTextContent('No referrals yet');
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('says it failed rather than showing zeros', async () => {
    getReferralMe.mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load/);
    expect(screen.queryByText('Invited')).toBeNull();
  });
});
