import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
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
  earnedThisFyInr: 600,
  stats: { joined: 4, paid: 2, pending: { count: 1, inr: 200 }, due: { count: 0, inr: 0 }, sent: { count: 1, inr: 400 } },
  rewards: [
    { id: 'e1', friend: 'R•••', plan: 'quarterly', amountInr: 400, paidAt: '2026-11-16T10:00:00Z', dueAt: '2026-11-19T10:00:00Z', status: 'sent', voucherCode: 'AMZN-1234', sentAt: '2026-11-20T09:00:00Z' },
    { id: 'e2', friend: 'S•••', plan: 'monthly', amountInr: 200, paidAt: '2026-11-16T10:00:00Z', dueAt: '2026-11-19T10:00:00Z', status: 'pending', voucherCode: 'LEAKED-CODE' },
  ],
};

const renderPage = () => render(<MemoryRouter><ReferPage /></MemoryRouter>);

beforeEach(() => { getReferralMe.mockReset(); });
afterEach(() => vi.useRealTimers());

describe('Refer a friend page', () => {
  it('shows a loading state, never a verdict, until data lands', async () => {
    let resolve;
    getReferralMe.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Friends joined')).toBeNull();
    expect(screen.queryByText(/No rewards yet/)).toBeNull();
    expect(screen.queryByText(/^0$/)).toBeNull();

    await act(async () => { resolve({ success: true, data: ME }.data); });
    expect(await screen.findByTestId('referral-link')).toHaveTextContent('https://tradeguardx.com/?ref=ARIF4K7Q');
    expect(screen.queryByRole('status')).toBeNull();
    expect(getReferralMe).toHaveBeenCalledWith({ accessToken: 'jwt' });
  });

  it('shows the stats, the cap and the offer wording', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    const stats = await screen.findByTestId('referral-stats');
    expect(within(stats).getByText('Friends joined').nextSibling).toHaveTextContent('4');
    expect(within(stats).getByText('Sent').nextSibling).toHaveTextContent('₹400');
    expect(screen.getByText('10% off their first Pro payment')).toBeInTheDocument();
    expect(screen.getByText(/or the current offer if it.s bigger/)).toBeInTheDocument();
    expect(screen.getByText('₹200 / ₹400 / ₹1,000')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '600');
    expect(screen.getByText(/₹14,400 left/)).toBeInTheDocument();
  });

  it('masks friends as given and shows a voucher code only when sent', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    const rows = await screen.findAllByTestId('reward-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('R•••')).toBeInTheDocument();
    expect(within(rows[0]).getByText('AMZN-1234')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: /Copy voucher code/ })).toBeInTheDocument();
    expect(within(rows[1]).getByText('S•••')).toBeInTheDocument();
    expect(screen.queryByText('LEAKED-CODE')).toBeNull();
    expect(within(rows[1]).getByText('Pending')).toBeInTheDocument();
  });

  it('has share links carrying the referral link', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    await screen.findByTestId('referral-link');
    for (const name of ['WhatsApp', 'Telegram', 'X']) {
      expect(decodeURIComponent(screen.getByRole('link', { name }).href)).toContain('https://tradeguardx.com/?ref=ARIF4K7Q');
    }
  });

  it('stacks rewards as cards at phone width, still hiding unsent codes', async () => {
    const mm = window.matchMedia;
    window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} });
    try {
      getReferralMe.mockResolvedValue(ME);
      renderPage();
      const rows = await screen.findAllByTestId('reward-row');
      expect(rows[0].tagName).toBe('DIV');
      expect(screen.queryByRole('table')).toBeNull();
      expect(within(rows[0]).getByText('AMZN-1234')).toBeInTheDocument();
      expect(screen.queryByText('LEAKED-CODE')).toBeNull();
    } finally {
      window.matchMedia = mm;
    }
  });

  it('shows an empty state when there are no rewards', async () => {
    getReferralMe.mockResolvedValue({ ...ME, earnedThisFyInr: 0, stats: { joined: 0, paid: 0 }, rewards: [] });
    renderPage();
    expect(await screen.findByTestId('referral-empty')).toHaveTextContent('No rewards yet');
  });

  it('says it failed rather than showing zeros', async () => {
    getReferralMe.mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load/);
    expect(screen.queryByText('Friends joined')).toBeNull();
  });
});
