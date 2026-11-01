import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StrictMode } from 'react';

const report = {
  currency: 'USD', trades: 40, enoughData: true, minTrades: 10, score: 38, grade: 'onTilt',
  verdict: 'After a loss, you trade to get it back.', revengeTrades: 12, insights: [],
  profile: { wins: 15, losses: 25, breakeven: 0, winRate: 37.5, netPnl: -80, avgWin: 2, avgLoss: 2, rr: 1, expectancy: -0.5, biggestWin: null, biggestLoss: null, bestTime: null, worstTime: null, bestSymbol: null, worstSymbol: null },
  streaks: { longestWin: null, longestLoss: null, avgWinLength: null, avgWinPnl: null, avgLossLength: null, avgLossPnl: null },
  checks: [{ id: 'reentry', title: 'Re-entry speed after a loss', weight: 25, status: 'problem', value: 69, unit: '%', finding: 'After 17 of your 25 losing trades (69%), you opened a new trade within 15 minutes.', evidence: [], fix: { rule: 'close-after-losses', text: 'Close after N losses.' } }],
  worstDay: null,
};
const fetchRevengeReport = vi.fn(async () => report);
const unlockRevengeReport = vi.fn(async () => ({ status: 'queued', source: 'snapshot' }));
const fetchRevengeStatus = vi.fn(async () => ({ status: 'ready', source: 'snapshot', windowDays: 30, fillsRead: 142 }));
vi.mock('../../api/tradesApi', () => ({ fetchRevengeReport: (...a) => fetchRevengeReport(...a) }));
vi.mock('../../api/syncApi', () => ({ unlockRevengeReport: (...a) => unlockRevengeReport(...a), fetchRevengeStatus: (...a) => fetchRevengeStatus(...a) }));

const { default: RevengeSetupStep } = await import('./RevengeSetupStep');
const mount = (onContinue = vi.fn(), label) => {
  render(<MemoryRouter><RevengeSetupStep accessToken="t" tradingAccountId="a1" accountName="Delta main" exchangeName="Delta Exchange" onContinue={onContinue} continueLabel={label} /></MemoryRouter>);
  return onContinue;
};

beforeEach(() => { fetchRevengeReport.mockClear(); fetchRevengeReport.mockImplementation(async () => report); unlockRevengeReport.mockClear(); });

describe('setup: the revenge report between the key and billing', () => {
  it('builds from the last 30 days, then unlocks with the score and the verdict', async () => {
    const onContinue = mount();
    expect(screen.getByText('Building your revenge report')).toBeTruthy();
    await waitFor(() => expect(unlockRevengeReport).toHaveBeenCalledWith(expect.objectContaining({ months: 'auto' })));
    expect(await screen.findByText('Your revenge report is unlocked', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Revenge score 38 out of 100' })).toBeTruthy();
    expect(screen.getByText('After a loss, you trade to get it back.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Fix this — start your 3-day free trial/ }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('shows the full report on request', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'See my full report' }, { timeout: 5000 }));
    expect(screen.getByText('What makes up your score')).toBeTruthy();
  });

  it('too few trades: says so honestly and carries on — no fake score', async () => {
    fetchRevengeReport.mockImplementation(async () => ({ ...report, enoughData: false, score: null, trades: 3 }));
    const onContinue = mount(vi.fn(), 'Go to your dashboard');
    expect(await screen.findByText('Not enough trades to read yet', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Revenge score/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Go to your dashboard' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('can always be skipped, even while it builds', async () => {
    const onContinue = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to your free trial' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalled());
  });

  it('starts the read under React StrictMode (dev double mount) — never an endless animation', async () => {
    render(<StrictMode><MemoryRouter><RevengeSetupStep accessToken="t" tradingAccountId="a1" onContinue={vi.fn()} /></MemoryRouter></StrictMode>);
    await waitFor(() => expect(unlockRevengeReport).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Your revenge report is unlocked', {}, { timeout: 5000 })).toBeTruthy();
  });
  it('hands the report up, and shows it at once when they come back to it', async () => {
    const onReport = vi.fn();
    const { unmount } = render(<MemoryRouter><RevengeSetupStep accessToken="t" tradingAccountId="a1" onContinue={vi.fn()} onReport={onReport} /></MemoryRouter>);
    await waitFor(() => expect(onReport).toHaveBeenCalledWith({ report, months: 1 }), { timeout: 5000 });
    unmount();
    unlockRevengeReport.mockClear();
    fetchRevengeReport.mockClear();
    render(<MemoryRouter><RevengeSetupStep accessToken="t" tradingAccountId="a1" onContinue={vi.fn()} initial={{ report, months: 1 }} /></MemoryRouter>);
    expect(screen.getByText('Your revenge report is unlocked')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(unlockRevengeReport).not.toHaveBeenCalled();
    expect(fetchRevengeReport).not.toHaveBeenCalled();
  });
  it('keeps the card short: the damage in one row, and that the guard is off', async () => {
    const withData = {
      ...report,
      worstDay: { date: '2026-10-03', pnl: -48.5, firstLoss: -2.1, afterFirstLoss: -40, timeline: [] },
      checks: [...report.checks, { id: 'cost', title: 'Cost of revenge', weight: 15, status: 'problem', value: 41, unit: '%', finding: '', evidence: [], fix: { rule: 'daily-loss', text: 'Daily loss limit: x' } }],
    };
    render(<MemoryRouter><RevengeSetupStep accessToken="t" tradingAccountId="a1" onContinue={vi.fn()} initial={{ report: withData, months: 1 }} /></MemoryRouter>);
    expect(screen.getByText('41%')).toBeTruthy();
    expect(screen.getByText(/your worst day/)).toBeTruthy();
    expect(screen.getByText('Your guard is off.')).toBeTruthy();
    expect(screen.queryByText(/After 17 of your 25 losing trades/)).toBeNull(); // the sentence lives in the full report
    fireEvent.click(screen.getByRole('button', { name: 'See my full report' }));
    expect(screen.getAllByText(/After 17 of your 25 losing trades/).length).toBeGreaterThan(0);
  });

  it('no urgency line for someone already paying', () => {
    render(<MemoryRouter><RevengeSetupStep accessToken="t" tradingAccountId="a1" onContinue={vi.fn()} continueLabel="Go to your dashboard" initial={{ report, months: 1 }} /></MemoryRouter>);
    expect(screen.queryByText('Your guard is off.')).toBeNull();
  });
});
