/**
 * A failed fetch must never become a verdict.
 *
 * The bug this guards: /rules returned an error on first load, the slice was
 * written as `loaded: true` with `rules: null`, and a null bundle counts zero
 * enabled rules — so an armed account rendered "Not protected. No rules are
 * switched on" with three of four setup steps ticked, until the 20s poll
 * corrected it.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const account = { id: 'acc-1', name: 'Delta main', propFirmSlug: 'delta_india', accountSize: 5000, cooldownUntil: null };

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ session: { access_token: 'tok' }, user: { id: 'u1' } }) }));
vi.mock('./TradingAccountContext', () => ({
  useTradingAccounts: () => ({
    accounts: [account], accountsLoading: false,
    selectedTradingAccountId: 'acc-1', refreshTradingAccounts: vi.fn(),
  }),
}));
vi.mock('../api/exchangeCredentialsApi', () => ({ getExchangeCredentialsStatus: vi.fn() }));
vi.mock('../api/rulesApi', () => ({ fetchRulesBundle: vi.fn() }));
vi.mock('../api/notificationsApi', () => ({ fetchNotificationSettings: vi.fn() }));
vi.mock('../api/breachesApi', () => ({ fetchBreaches: vi.fn() }));

const { getExchangeCredentialsStatus } = await import('../api/exchangeCredentialsApi');
const { fetchRulesBundle } = await import('../api/rulesApi');
const { fetchNotificationSettings } = await import('../api/notificationsApi');
const { fetchBreaches } = await import('../api/breachesApi');
const { GuardProvider, useGuard } = await import('./GuardContext');

const armedBundle = {
  templates: [{ slug: 'daily-loss' }, { slug: 'max-trades-day' }],
  instances: [{ templateSlug: 'daily-loss', enabled: true }],
};

function Probe() {
  const { selected: g, notifications, unreadBreaches } = useGuard();
  return (
    <div>
      {/* Every setState in a pass is batched together, so "the settings
          landed" is a precise signal that the pass finished and the guard
          state below is final — no sleeping, no racing the assertion. */}
      <span data-testid="pass">{notifications ? 'done' : 'pending'}</span>
      <span data-testid="breaches">{String(unreadBreaches)}</span>
      <span data-testid="guard">{g.guard}</span>
      <span data-testid="title">{g.describe.title}</span>
      <span data-testid="gaps">{g.gaps.map((x) => x.key).join(',') || 'none'}</span>
      <span data-testid="counts">{`${g.rulesOn}/${g.rulesTotal}`}</span>
    </div>
  );
}

const mount = () => render(<GuardProvider><Probe /></GuardProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  getExchangeCredentialsStatus.mockResolvedValue({ status: 'active', enforcementCapable: true });
  fetchNotificationSettings.mockResolvedValue({ telegramConnected: true });
  fetchBreaches.mockResolvedValue([]);
  fetchRulesBundle.mockResolvedValue(armedBundle);
});

describe('GuardProvider — a failed fetch is not an answer', () => {
  it('reports armed when everything lands', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('guard')).toHaveTextContent('armed'));
    expect(screen.getByTestId('counts')).toHaveTextContent('1/2');
  });

  it('stays "loading" — never "unprotected" — when the rules fetch fails', async () => {
    fetchRulesBundle.mockRejectedValue(new Error('500 from /rules'));
    mount();
    // The connection call resolves, so without the fix the slice would be
    // written loaded-with-null-rules and flip to unprotected here.
    await waitFor(() => expect(screen.getByTestId('pass')).toHaveTextContent('done'));
    expect(screen.getByTestId('guard')).toHaveTextContent('loading');
    // and says nothing at all rather than guessing
    expect(screen.getByTestId('title')).toBeEmptyDOMElement();
    expect(screen.getByTestId('gaps')).toHaveTextContent('none');
  });

  it('stays "loading" when the connection fetch fails', async () => {
    getExchangeCredentialsStatus.mockRejectedValue(new Error('500 from /credentials'));
    mount();
    await waitFor(() => expect(screen.getByTestId('pass')).toHaveTextContent('done'));
    expect(screen.getByTestId('guard')).toHaveTextContent('loading');
  });

  it('keeps the last good state when a later refetch fails, rather than wiping it', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('guard')).toHaveTextContent('armed'));

    // Refetch through the provider's own visibilitychange listener rather than
    // the 20s interval — same code path, and no fake clock for waitFor to spin.
    fetchRulesBundle.mockRejectedValue(new Error('flaky refetch'));
    fetchBreaches.mockResolvedValue([{ id: 'b1', severity: 'warning', message: 'x', createdAt: new Date().toISOString() }]);
    document.dispatchEvent(new Event('visibilitychange'));

    // The breach count only moves when a pass commits, so this waits for the
    // failed pass to land rather than assuming it did.
    await waitFor(() => expect(screen.getByTestId('breaches')).toHaveTextContent('1'));
    expect(screen.getByTestId('guard')).toHaveTextContent('armed');
    expect(screen.getByTestId('counts')).toHaveTextContent('1/2');
  });
});
