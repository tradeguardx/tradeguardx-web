import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActivityButton, ActivityDrawer } from './GuardActivity';
import { buildTimeline } from '../../lib/guardActivity';

const recent = (minsAgo) => new Date(Date.now() - minsAgo * 60_000).toISOString();
const trades = [
  { tradeUid: 'a', symbol: 'BTCUSD', side: 'buy', status: 'CLOSED', openedAt: recent(30), closedAt: recent(29.5), pnl: -0.77, metadata: {} },
  { tradeUid: 'b', symbol: 'BTCUSD', side: 'buy', status: 'CLOSED', openedAt: recent(25), closedAt: recent(25), pnl: -0.0005, metadata: { blocked: true } },
];
const breaches = [
  { tradeUid: null, breachType: 'consecutive_losses_exceeded', createdAt: recent(29.5), message: '1 losing trades in a row (limit: 1).', context: { tier: 'soft', threshold: 1, cooldownHours: 4, consecutiveLosses: 1 } },
];
const items = buildTimeline(trades, breaches);
const counts = { trades: 2, acted: 2, locks: 1 };
const rules = {
  templates: [{ slug: 'close-after-losses', name: 'Close After N Losses' }],
  instances: [{ templateSlug: 'close-after-losses', enabled: true, config: { consecutiveLosses: 1, cooldownHours: 4 } }],
};
const mount = (open = true, onClose = vi.fn()) =>
  render(<MemoryRouter><ActivityDrawer open={open} onClose={onClose} items={items} counts={counts} rules={rules} /></MemoryRouter>);

describe('ActivityDrawer', () => {
  it('renders nothing while closed', () => {
    mount(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows each trade with what happened and why, the lock it caused, and sub-cent P&L in full', () => {
    mount();
    expect(screen.getByText('Triggered lock')).toBeTruthy();
    expect(screen.getByText('Blocked by lock')).toBeTruthy();
    expect(screen.getByText(/losing trade 1 in a row/)).toBeTruthy();
    expect(screen.getByText('Locked for 4h — losing streak')).toBeTruthy();
    expect(screen.getByText('−$0.0005')).toBeTruthy();
  });

  it('explains the rules that are on, with the account’s own numbers', () => {
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'How rules work' }));
    expect(screen.getByText(/locks you after any losing trade/)).toBeTruthy();
  });

  it('closes on Escape and on the backdrop', () => {
    const onClose = vi.fn();
    mount(true, onClose);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close activity' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('ActivityButton', () => {
  it('counts what the guard did', () => {
    render(<ActivityButton counts={counts} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /3 guard events/ })).toBeTruthy();
  });

  it('groups by trading day and labels the counts as today', () => {
    const dayStart = Date.now() - 60 * 60_000;
    const day = buildTimeline([
      { tradeUid: 'n', symbol: 'BTCUSD', side: 'buy', status: 'CLOSED', openedAt: recent(20), closedAt: recent(10), pnl: 3.68, metadata: {} },
      { tradeUid: 'y', symbol: 'BTCUSD', side: 'buy', status: 'CLOSED', openedAt: recent(300), closedAt: recent(290), pnl: -1.09, metadata: {} },
    ], []);
    render(<MemoryRouter><ActivityDrawer open onClose={vi.fn()} items={day} counts={{ trades: 1, acted: 0, locks: 0 }} dayStart={dayStart} rules={rules} /></MemoryRouter>);
    expect(screen.getByText('Trades today')).toBeTruthy();
    expect(screen.getByText(/^Today · since/)).toBeTruthy();
    expect(screen.getByText(/^Previous day · before/)).toBeTruthy();
  });
});
