import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const recent = (minsAgo) => new Date(Date.now() - minsAgo * 60_000).toISOString();
vi.mock('../../api/tradesApi', () => ({
  fetchJournalTrades: vi.fn(async () => [
    { tradeUid: 'a', symbol: 'BTCUSD', side: 'buy', status: 'CLOSED', openedAt: recent(30), closedAt: recent(29.5), pnl: -0.77, metadata: {} },
    { tradeUid: 'b', symbol: 'BTCUSD', side: 'buy', status: 'CLOSED', openedAt: recent(25), closedAt: recent(25), pnl: -0.14, metadata: { blocked: true } },
  ]),
}));
vi.mock('../../api/breachesApi', () => ({
  fetchBreaches: vi.fn(async () => [
    { tradeUid: null, breachType: 'consecutive_losses_exceeded', createdAt: recent(29.5), message: '1 losing trades in a row (limit: 1). Trading locked for 4h.', context: { tier: 'soft', threshold: 1, cooldownHours: 4, consecutiveLosses: 1 } },
  ]),
}));
const { default: GuardActivity } = await import('./GuardActivity');

const rules = {
  templates: [{ slug: 'close-after-losses', name: 'Close After N Losses' }],
  instances: [{ templateSlug: 'close-after-losses', enabled: true, config: { consecutiveLosses: 1, cooldownHours: 4 } }],
};

describe('GuardActivity', () => {
  it('shows each trade with what happened and why, and the lock it caused', async () => {
    render(<MemoryRouter><GuardActivity accessToken="t" tradingAccountId="acc" rules={rules} /></MemoryRouter>);
    expect(await screen.findByText('Triggered lock')).toBeTruthy();
    expect(screen.getByText('Blocked by lock')).toBeTruthy();
    expect(screen.getByText(/losing trade 1 in a row/)).toBeTruthy();
    expect(screen.getByText('Locked for 4h — losing streak')).toBeTruthy();
    expect(screen.getByText(/2 trades · 2 the guard acted on · 1 lock/)).toBeTruthy();
  });

  it('explains the rules that are on, with the account’s own numbers', async () => {
    render(<MemoryRouter><GuardActivity accessToken="t" tradingAccountId="acc" rules={rules} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: 'How rules work' }));
    expect(screen.getByText('Close After N Losses')).toBeTruthy();
    expect(screen.getByText(/locks you after any losing trade/)).toBeTruthy();
  });
});
