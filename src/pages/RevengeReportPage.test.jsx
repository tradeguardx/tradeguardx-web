import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StrictMode } from 'react';

const report = {
  period: { days: 30 }, currency: 'USD', trades: 42, enoughData: true, minTrades: 10,
  score: 38, grade: 'onTilt', verdict: 'After a loss, you trade to get it back.', revengeTrades: 12,
  insights: ['When you win, you win $4.07 a streak. When you lose, you lose $5.59 a streak.'],
  profile: {
    wins: 15, losses: 25, breakeven: 2, winRate: 37.5, netPnl: -87.67, avgWin: 2.42, avgLoss: 1.82, rr: 1.33, expectancy: -0.34,
    biggestWin: { pnl: 9.1, symbol: 'BTCUSD', at: '2026-10-04T08:00:00Z' }, biggestLoss: { pnl: -12.4, symbol: 'PAXGUSD', at: '2026-10-05T08:00:00Z' },
    bestTime: { label: '18:00–21:00', trades: 9, pnl: 14.2, winRate: 60 }, worstTime: { label: '15:00–18:00', trades: 11, pnl: -21.6, winRate: 20 },
    bestSymbol: { label: 'SKYAIUSD', trades: 6, pnl: 9.8, winRate: 64 }, worstSymbol: { label: 'PAXGUSD', trades: 8, pnl: -17.3, winRate: 31 },
    bestDay: null, worstDayOfWeek: null, timeBlocks: [],
  },
  streaks: { longestWin: { length: 6, pnl: 11.2, from: '2026-10-04T05:00:00Z', to: '2026-10-04T09:00:00Z' }, longestLoss: { length: 10, pnl: -18.4, from: '2026-10-03T05:00:00Z', to: '2026-10-03T09:00:00Z' }, avgWinLength: 2.4, avgWinPnl: 4.07, avgLossLength: 2.1, avgLossPnl: -5.59 },
  checks: [
    { id: 'reentry', title: 'Re-entry speed after a loss', weight: 25, status: 'problem', score: 0, value: 69, unit: '%', finding: 'After 17 of your 25 losing trades (69%), you opened a new trade within 15 minutes.', evidence: [{ at: '2026-10-03T16:30:00Z', symbol: 'PAXGUSD', text: 'Lost $2.10 on PAXGUSD, opened PAXGUSD 2 min later → −$3.40', pnl: -3.4 }], fix: { rule: 'close-after-losses', text: 'Close after N losses: stop trading for the day after 2 losing trades in a row.' } },
    { id: 'sizeUp', title: 'Size after a loss', weight: 20, status: 'good', score: 100, value: 1, unit: 'x', finding: 'Your size stays normal after a loss (1×).', evidence: [], fix: { rule: 'risk-per-trade', text: 'Risk per trade.' } },
  ],
  worstDay: { date: '2026-10-03', pnl: -48.51, firstLoss: -2.1, afterFirstLoss: -40.2, timeline: [{ at: '2026-10-03T16:30:00Z', symbol: 'PAXGUSD', side: 'long', pnl: -2.1, revenge: false }, { at: '2026-10-03T16:32:00Z', symbol: 'PAXGUSD', side: 'long', pnl: -3.4, revenge: true }] },
};
const fetchRevengeReport = vi.fn(async () => report);
const unlockRevengeReport = vi.fn(async () => ({ status: 'ready', source: 'history' }));
const fetchRevengeStatus = vi.fn(async () => ({ status: 'ready', source: 'snapshot', windowDays: 30 }));
const guard = { selected: { loaded: true, connection: { status: 'active' } }, life: { protected: true } };

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ session: { access_token: 't' } }) }));
vi.mock('../context/TradingAccountContext', () => ({ useTradingAccounts: () => ({ selectedTradingAccountId: 'a1', selectedAccount: { id: 'a1', name: 'Delta main', propFirmSlug: 'delta_india' }, accountsLoading: false }) }));
vi.mock('../context/GuardContext', () => ({ useGuard: () => guard }));
vi.mock('../api/tradesApi', () => ({ fetchRevengeReport: (...a) => fetchRevengeReport(...a) }));
vi.mock('../api/syncApi', () => ({
  unlockRevengeReport: (...a) => unlockRevengeReport(...a),
  fetchRevengeStatus: (...a) => fetchRevengeStatus(...a),
  triggerHistoryBackfill: vi.fn(async () => ({})),
}));

const { default: RevengeReportPage } = await import('./RevengeReportPage');
const mount = (wrap) => render(wrap ? <StrictMode><MemoryRouter><RevengeReportPage /></MemoryRouter></StrictMode> : <MemoryRouter><RevengeReportPage /></MemoryRouter>);

beforeEach(() => {
  fetchRevengeReport.mockReset();
  fetchRevengeReport.mockImplementation(async () => report);
  unlockRevengeReport.mockClear();
  guard.selected = { loaded: true, connection: { status: 'active' } };
  guard.life = { protected: true };
});

describe('revenge report page', () => {
  it('shows the report once unlocked: score, checks with their fix, profile', async () => {
    mount();
    expect(await screen.findByText('After a loss, you trade to get it back.')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Revenge score 38 out of 100' })).toBeTruthy();
    expect(screen.getByText('1 : 1.33')).toBeTruthy();
    expect(screen.getByText(/opened PAXGUSD 2 min later/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Set up Close after N losses' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Set up Risk per trade' })).toBeNull();
  });

  it('locked: the report blurred behind "Unlock", then the build, then the reveal', async () => {
    fetchRevengeReport.mockImplementationOnce(async () => ({ locked: true, status: 'locked' }));
    mount();
    expect(await screen.findByText('Unlock your revenge report')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: '2 months' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlock my report' }));
    expect(await screen.findByText('Building your revenge report')).toBeTruthy();
    await waitFor(() => expect(unlockRevengeReport).toHaveBeenCalledWith(expect.objectContaining({ months: 2 })));
    expect(await screen.findByText('After a loss, you trade to get it back.', {}, { timeout: 5000 })).toBeTruthy();
  });

  it('locked with no key: the way to connect one, never an Unlock that cannot work', async () => {
    guard.selected = { loaded: true, connection: null };
    fetchRevengeReport.mockImplementationOnce(async () => ({ locked: true, status: 'locked' }));
    mount();
    expect(await screen.findByText('Unlock your revenge report')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Connect key' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Unlock my report' })).toBeNull();
  });

  it('a longer period than the snapshot holds reads the extra months first', async () => {
    fetchRevengeReport.mockImplementation(async ({ months }) => (months === 3 ? { needsUnlock: true, windowDays: 30 } : report));
    mount();
    await screen.findByText('After a loss, you trade to get it back.');
    fireEvent.click(screen.getByRole('tab', { name: '3 months' }));
    await waitFor(() => expect(unlockRevengeReport).toHaveBeenCalledWith(expect.objectContaining({ months: 3 })));
  });

  it('asks the trader without a plan to fix it, under the report', async () => {
    guard.life = { unprotected: true };
    mount();
    expect(await screen.findByRole('link', { name: /Fix this — start your 3-day free trial/ })).toBeTruthy();
  });

  it('still shows the report under React StrictMode (dev double mount)', async () => {
    mount(true);
    expect(await screen.findByText('After a loss, you trade to get it back.')).toBeTruthy();
  });
});
