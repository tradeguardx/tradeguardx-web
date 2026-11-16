import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ session: { access_token: 'jwt' } }) }));
const getReferralMe = vi.fn();
const setReferralCurrency = vi.fn();
vi.mock('../api/referralApi', () => ({
  getReferralMe: (...a) => getReferralMe(...a),
  setReferralCurrency: (...a) => setReferralCurrency(...a),
}));

const { default: ReferPage } = await import('./ReferPage');

const ME = {
  code: 'ARIF4K7Q',
  link: 'https://tradeguardx.com/?ref=ARIF4K7Q',
  friendDiscountPct: 10,
  voucherCurrency: 'INR',
  canChangeCurrency: false,
  rewardsInr: { monthly: 200, quarterly: 400, yearly: 1000 },
  holdDays: 3,
  annualCapInr: 15000,
  fy: '2026-27',
  earnedThisFyInr: 400,
  stats: { joined: 3, paid: 2, qualified: 1, pending: { count: 1, inr: 200 }, due: { count: 0, inr: 0 }, sent: { count: 1, inr: 400 } },
  friends: [
    { id: 'e2', name: 'Priya S.', initials: 'PS', plan: 'monthly', amountInr: 200, signedUpAt: '2026-11-10T00:00:00Z', paidAt: '2026-11-15T00:00:00Z', dueAt: '2026-11-18T00:00:00Z', status: 'waiting' },
    { id: 'joined:abc', name: 'Neha', initials: 'N', plan: null, amountInr: null, signedUpAt: '2026-11-14T00:00:00Z', paidAt: null, dueAt: null, status: 'joined' },
    { id: 'e1', name: 'Rahul M.', initials: 'RM', plan: 'quarterly', amountInr: 400, signedUpAt: '2026-11-01T00:00:00Z', paidAt: '2026-11-02T00:00:00Z', dueAt: '2026-11-05T00:00:00Z', status: 'sent', voucherCode: 'AMZN-1234', sentAt: '2026-11-06T00:00:00Z' },
  ],
  rewards: [],
};

const renderPage = () => render(<MemoryRouter><ReferPage /></MemoryRouter>);

beforeEach(() => { getReferralMe.mockReset(); setReferralCurrency.mockReset(); });
afterEach(() => vi.useRealTimers());

describe('Refer a friend page', () => {
  it('shows a loading state, never a verdict, until data lands', async () => {
    let resolve;
    getReferralMe.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Friends joined')).toBeNull();
    await act(async () => { resolve(ME); });
    expect(await screen.findByTestId('referral-link')).toHaveTextContent('https://tradeguardx.com/?ref=ARIF4K7Q');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the offer, the tiers and the yearly limit in rupees', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    const stats = await screen.findByTestId('referral-stats');
    expect(within(stats).getByText('Friends joined').nextSibling).toHaveTextContent('3');
    expect(screen.getByText(/Give 10%\. Get up to ₹1,000\./)).toBeInTheDocument();
    for (const v of ['₹200', '₹400']) expect(screen.getAllByText(v).length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '400');
    expect(screen.getByText(/₹14,600 left/)).toBeInTheDocument();
    expect(screen.getByTestId('voucher-currency')).toHaveTextContent('Amazon India gift card (₹)');
  });

  it('tracks each friend step by step; voucher codes only under Paid out', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    const rows = await screen.findAllByTestId('friend-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Priya S.')).toBeInTheDocument();
    expect(within(rows[0]).getByText('In the 3-day wait')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Waiting for their first payment')).toBeInTheDocument();
    expect(screen.queryByText('AMZN-1234')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Paid out · 1/ }));
    const paid = screen.getAllByTestId('friend-row');
    expect(within(paid[0]).getByText('Rahul M.')).toBeInTheDocument();
    expect(within(paid[0]).getByText('AMZN-1234')).toBeInTheDocument();
    expect(screen.queryByText(/Rahul Mehta/)).toBeNull();
  });

  it('shows dollars for a referrer abroad, and lets a new referrer switch', async () => {
    const usd = { ...ME, voucherCurrency: 'USD', canChangeCurrency: true, rewardsInr: { monthly: 3, quarterly: 5, yearly: 12 }, annualCapInr: 180, earnedThisFyInr: 0, friends: [] };
    getReferralMe.mockResolvedValue(usd);
    setReferralCurrency.mockResolvedValue({ ok: true, currency: 'INR' });
    renderPage();
    expect(await screen.findByText(/Give 10%\. Get up to \$12\./)).toBeInTheDocument();
    expect(screen.getByTestId('voucher-currency')).toHaveTextContent('Amazon gift card in US dollars');
    getReferralMe.mockResolvedValue(ME);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /use ₹ Amazon India/ })); });
    expect(setReferralCurrency).toHaveBeenCalledWith({ accessToken: 'jwt', currency: 'INR' });
    expect(await screen.findByText(/Get up to ₹1,000/)).toBeInTheDocument();
  });

  it('answers the rules in a FAQ, with the live numbers', async () => {
    getReferralMe.mockResolvedValue(ME);
    renderPage();
    const faq = await screen.findByTestId('referral-faq');
    for (const q of ['How much does my friend save?', 'What doesn’t count?', 'Is there a limit?', 'I’m outside India. What do I get?']) {
      expect(within(faq).getByText(q)).toBeInTheDocument();
    }
    expect(within(faq).getByText(/₹200 for monthly, ₹400 for quarterly, ₹1,000 for yearly/)).toBeInTheDocument();
    expect(within(faq).getByText(/₹15,000 of vouchers per financial year/)).toBeInTheDocument();
  });

  it('shows an empty state when nobody has joined', async () => {
    getReferralMe.mockResolvedValue({ ...ME, earnedThisFyInr: 0, stats: { joined: 0, paid: 0 }, friends: [] });
    renderPage();
    expect(await screen.findByTestId('referral-empty')).toHaveTextContent('No rewards yet');
    expect(screen.queryByTestId('referral-stats')).toBeNull();
  });

  it('says it failed rather than showing zeros', async () => {
    getReferralMe.mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load/);
    expect(screen.queryByText('Friends joined')).toBeNull();
  });
});
