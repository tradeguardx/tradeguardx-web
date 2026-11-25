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
import { gapsOf } from '../lib/guard';

const account = { id: 'acc-1', name: 'Delta main', propFirmSlug: 'delta_india', accountSize: 5000, cooldownUntil: null };

const authState = { session: { access_token: 'tok' }, user: { id: 'u1' }, subscriptionError: null };
vi.mock('../context/AuthContext', () => ({ useAuth: () => authState }));
// One stable list, as the real provider holds it in state: a fresh array on
// every render would read as a new account list each time.
const accountsList = [account];
const refreshTradingAccounts = vi.fn();
vi.mock('./TradingAccountContext', () => ({
  useTradingAccounts: () => ({
    accounts: accountsList, accountsLoading: false,
    selectedTradingAccountId: 'acc-1', selectedAccount: account, refreshTradingAccounts,
  }),
}));
// The guard now holds the selected account's live row (useLiveAccount).
vi.mock('../lib/supabaseClient', () => ({
  supabase: { channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn() },
}));
vi.mock('../api/tradingAccountsApi', () => ({ fetchTradingAccounts: vi.fn(async () => [account]) }));
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
      <span data-testid="readOnly">{String(g.readOnly)}</span>
      <span data-testid="keyLive">{String(g.keyLive)}</span>
    </div>
  );
}

const mount = () => render(<GuardProvider><Probe /></GuardProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  authState.user = { id: 'u1' };
  authState.subscriptionError = null;
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

/**
 * Entitlement was read from a field the auth context does not publish, so it
 * was undefined and every account resolved as entitled — the UI claiming a
 * protection that was not there, which is the exact failure this product
 * exists to prevent.
 */
describe('entitlement reaches the guard', () => {
  const row = (access) => ({
    account: { id: 'a', name: 'Delta main', propFirmSlug: 'delta_india', accountSize: 5000, cooldownUntil: null },
    connection: { status: 'active', enforcementCapable: true },
    rules: { templates: [{ slug: 'daily-loss' }], instances: [{ templateSlug: 'daily-loss', enabled: true }] },
    notifications: { telegramConnected: true },
    entitled: access === 'trial' || access === 'active',
  });

  it.each(['none', 'expired', 'free'])('reports a billing gap for access=%s', (access) => {
    expect(gapsOf(row(access)).map((g) => g.key)).toEqual(['billing']);
  });

  it.each(['trial', 'active'])('reports nothing outstanding for access=%s', (access) => {
    expect(gapsOf(row(access))).toEqual([]);
  });

  /*
   * A disconnected key keeps its last enforcement_capable value in the
   * database. Reading that alone called a revoked key "read-only — we can alert
   * you" and showed weeks-old P&L as today's, when nothing watched the account.
   */
  it('never calls a disconnected key read-only, and says there is no live key', async () => {
    getExchangeCredentialsStatus.mockResolvedValue({ status: 'revoked', enforcementCapable: false });
    mount();
    await waitFor(() => expect(screen.getByTestId('pass').textContent).toBe('done'));
    expect(screen.getByTestId('readOnly').textContent).toBe('false');
    expect(screen.getByTestId('keyLive').textContent).toBe('false');
  });

  it('still calls a connected key that cannot act read-only', async () => {
    getExchangeCredentialsStatus.mockResolvedValue({ status: 'active', enforcementCapable: false });
    mount();
    await waitFor(() => expect(screen.getByTestId('pass').textContent).toBe('done'));
    expect(screen.getByTestId('readOnly').textContent).toBe('true');
    expect(screen.getByTestId('keyLive').textContent).toBe('true');
  });
});

/*
 * R3: a failed or slow /subscriptions/me leaves `access` null (unknown) —
 * AuthContext no longer defaults it to 'free'. Unknown must fail open: no
 * "Watching only — your plan has lapsed", no billing gap.
 */
describe('unknown plan is never a lapsed verdict', () => {
  it.each([
    ['failed', { id: 'u1', access: null, planKnown: false }, 'Could not load subscription'],
    ['slow', { id: 'u1', access: null, planKnown: false }, null],
  ])('a %s /me reads as armed, with no lapsed copy and no billing gap', async (_n, user, err) => {
    authState.user = user;
    authState.subscriptionError = err;
    mount();
    await waitFor(() => expect(screen.getByTestId('pass')).toHaveTextContent('done'));
    expect(screen.getByTestId('guard')).toHaveTextContent('armed');
    expect(screen.getByTestId('title').textContent).not.toMatch(/Watching only|lapsed|ended/i);
    expect(screen.getByTestId('gaps').textContent).not.toMatch(/billing/);
  });

  it('control: a KNOWN lapsed plan still says so (the probe can see the verdict)', async () => {
    authState.user = { id: 'u1', access: 'expired', planKnown: true, planProtected: false };
    mount();
    await waitFor(() => expect(screen.getByTestId('pass')).toHaveTextContent('done'));
    expect(screen.getByTestId('title').textContent).toMatch(/Watching only/);
  });
});
