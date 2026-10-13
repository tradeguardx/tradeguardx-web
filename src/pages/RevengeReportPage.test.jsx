import { describe, expect, it, vi } from 'vitest';
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

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ session: { access_token: 't' } }) }));
vi.mock('../context/TradingAccountContext', () => ({ useTradingAccounts: () => ({ selectedTradingAccountId: 'a1', selectedAccount: { id: 'a1', name: 'Delta main' }, accountsLoading: false }) }));
const guard = { selected: { loaded: true, connection: { status: 'active' } } };
vi.mock('../context/GuardContext', () => ({ useGuard: () => guard }));
vi.mock('../api/tradesApi', () => ({ fetchRevengeReport: (...a) => fetchRevengeReport(...a) }));
vi.mock('../api/syncApi', () => ({ fetchBackfillStatus: vi.fn(async () => ({ status: 'idle', updatedAt: new Date(Date.now() - 2 * 3600e3).toISOString() })), triggerHistoryBackfill: vi.fn(async () => ({})) }));

const { default: RevengeReportPage } = await import('./RevengeReportPage');

describe('revenge report page', () => {
  it('shows the score, the profile, and each check with its fix', async () => {
    render(<MemoryRouter><RevengeReportPage /></MemoryRouter>);
    expect(await screen.findByText('After a loss, you trade to get it back.')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Revenge score 38 out of 100' })).toBeTruthy();
    expect(screen.getByText('On tilt')).toBeTruthy();
    expect(screen.getByText('1 : 1.33')).toBeTruthy();
    expect(screen.getByText('PAXGUSD', { selector: 'div' })).toBeTruthy(); // worst symbol card
    expect(screen.getByText('10 in a row')).toBeTruthy();
    // problems first, open, with evidence and the rule that fixes them
    expect(screen.getByText(/opened PAXGUSD 2 min later/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Set up Close after N losses' })).toBeTruthy();
    // a passing check offers no fix
    expect(screen.queryByRole('link', { name: 'Set up Risk per trade' })).toBeNull();
    expect(screen.getByText(/Trades imported 2 h ago/)).toBeTruthy();
  });

  it('asks for the period picked', async () => {
    render(<MemoryRouter><RevengeReportPage /></MemoryRouter>);
    await screen.findByText('After a loss, you trade to get it back.');
    fireEvent.click(screen.getByRole('tab', { name: '3 months' }));
    await waitFor(() => expect(fetchRevengeReport).toHaveBeenLastCalledWith(expect.objectContaining({ months: 3 })));
  });

  it('says why there is no score when there are too few trades', async () => {
    fetchRevengeReport.mockResolvedValueOnce({ ...report, enoughData: false, score: null, grade: null, trades: 4, verdict: 'Not enough trades in this period to judge (4 of 10). Try a longer period.' });
    render(<MemoryRouter><RevengeReportPage /></MemoryRouter>);
    expect(await screen.findByText(/at least 10 closed trades/)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'No score' })).toBeTruthy();
  });

  it('with no key: no Refresh, and the way to connect one', async () => {
    guard.selected = { loaded: true, connection: null };
    render(<MemoryRouter><RevengeReportPage /></MemoryRouter>);
    await screen.findByText('After a loss, you trade to get it back.');
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Connect key' })).toBeTruthy();
    guard.selected = { loaded: true, connection: { status: 'active' } };
  });

  it('still shows the report under React StrictMode (dev double mount)', async () => {
    // The guard against late responses used to be switched off for good by
    // the first, simulated unmount — every report was then dropped in dev.
    render(<StrictMode><MemoryRouter><RevengeReportPage /></MemoryRouter></StrictMode>);
    expect(await screen.findByText('After a loss, you trade to get it back.')).toBeTruthy();
  });

  it('no key and no trades: only the connect prompt, no empty score', async () => {
    guard.selected = { loaded: true, connection: null };
    fetchRevengeReport.mockResolvedValueOnce({ ...report, trades: 0, enoughData: false, score: null, grade: null, insights: [], worstDay: null });
    render(<MemoryRouter><RevengeReportPage /></MemoryRouter>);
    expect(await screen.findByText('No trades to analyse yet')).toBeTruthy();
    expect(screen.queryByRole('img', { name: /score/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();
    guard.selected = { loaded: true, connection: { status: 'active' } };
  });
});
