/**
 * Smoke: the shell in each kind of lifecycle state, rendered for real with
 * every API mocked. The helpers are unit-tested in lib/lifecycle.test.js;
 * this checks the pieces arrive on screen together — pill, band, lock,
 * sidebar, kill switch, rules — for a user the server calls unprotected.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { getExchangeCredentialsStatus } from '../api/exchangeCredentialsApi';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const account = {
  id: 'acc-1', name: 'Delta main', propFirmSlug: 'delta_india', accountSize: 5000,
  dailyPnl: -42.5, currentEquity: 4957.5, dailyStartingEquity: 5000, tradeCountToday: 3,
  consecutiveLosses: 1, cooldownUntil: null, cooldownReason: null, accountCurrency: 'USD', timezone: 'Asia/Kolkata',
};

const auth = { user: null };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'tok' }, user: auth.user, logout: vi.fn() }),
}));
vi.mock('../lib/supabaseClient', () => ({
  supabase: { channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn() },
}));
vi.mock('../api/tradingAccountsApi', () => ({
  fetchTradingAccounts: vi.fn(async () => [account]),
  setRuleLockDays: vi.fn(),
}));
vi.mock('../api/exchangeCredentialsApi', () => ({
  getExchangeCredentialsStatus: vi.fn(async () => ({ status: 'active', enforcementCapable: true, lastValidatedAt: new Date().toISOString() })),
  exchangeFromBrokerSlug: (s) => (s === 'delta_india' ? 'delta_india' : null),
  connectExchangeCredentials: vi.fn(), disconnectExchangeCredentials: vi.fn(),
}));
vi.mock('../api/rulesApi', () => ({
  fetchRulesBundle: vi.fn(async () => ({
    templates: [
      { slug: 'daily-loss', name: 'Daily loss protection', eligible: true, definition: { fields: [{ key: 'mode', type: 'select', value: 'percent' }, { key: 'dailyLossPct', label: 'Daily loss', type: 'number', value: '2', suffix: '%', showWhen: { key: 'mode', equals: 'percent' } }] } },
      { slug: 'max-trades-day', name: 'Max trades per day', eligible: true, definition: { fields: [{ key: 'maxTrades', label: 'Max trades', type: 'number', value: '10' }] } },
    ],
    instances: [{ templateSlug: 'daily-loss', enabled: true, config: { mode: 'percent', dailyLossPct: '2' } }],
    ruleLock: { locked: false, days: 7 },
  })),
  saveRuleInstance: vi.fn(), cancelPendingRuleChange: vi.fn(),
}));
vi.mock('../api/notificationsApi', () => ({
  fetchNotificationSettings: vi.fn(async () => ({ telegramConnected: true, emailNotificationsEnabled: false })),
  updateNotificationSettings: vi.fn(), createTelegramBindingLink: vi.fn(), disconnectTelegram: vi.fn(),
}));
vi.mock('../api/calendarApi', async () => { const { calendarSample } = await import('../fixtures/calendarSample'); return { fetchCalendar: vi.fn(async () => calendarSample()), scheduleCalendarLock: vi.fn() }; });
vi.mock('../api/breachesApi', () => ({ fetchBreaches: vi.fn(async () => []), acknowledgeBreaches: vi.fn() }));
const d = (n) => new Date(Date.now() - n * 86400000);
const closedTrades = [
  { tradeUid: 't1', symbol: 'BTCUSD', side: 'BUY', status: 'CLOSED', pnl: 120, openedAt: d(3).toISOString(), closedAt: d(3).toISOString() },
  { tradeUid: 't2', symbol: 'ETHUSD', side: 'SELL', status: 'CLOSED', pnl: -80, openedAt: d(2).toISOString(), closedAt: d(2).toISOString() },
  { tradeUid: 't3', symbol: 'BTCUSD', side: 'BUY', status: 'CLOSED', pnl: -30, openedAt: d(1).toISOString(), closedAt: d(1).toISOString() },
];
vi.mock('../api/tradesApi', () => ({
  fetchJournalStats: vi.fn(async () => ({
    overview: { totalPnl: 10, winRate: 33.3, profitFactor: 1.09, avgHoldSeconds: 900, closedTrades: 3 },
    equityCurve: [{ date: '2026-09-17', cumPnl: 120 }, { date: '2026-09-18', cumPnl: 40 }, { date: '2026-09-19', cumPnl: 10 }],
    byDayOfWeek: [{ day: 'Mon', count: 1, pnl: 120 }, { day: 'Tue', count: 1, pnl: -80 }, { day: 'Wed', count: 1, pnl: -30 }],
    behavior: { totalRuleBlocks: 2 },
  })),
  fetchTaxSummary: vi.fn(async () => ({ fyLabel: 'FY2026-27', netTradingPnl: { value: 8930.9 }, positionCount: 12 })),
  fetchJournalTrades: vi.fn(async () => closedTrades),
  fetchUnifiedTrades: vi.fn(async () => closedTrades),
  fetchBehaviorTags: vi.fn(async () => ({ behaviorTags: [{ tag: 'OVERTRADER', severity: 'HIGH', matchCount: 2, tradeCount: 3, description: 'You take too many trades.' }], disciplineScore: { overall: 72 } })),
}));
vi.mock('../api/userApi', () => ({ armLockout: vi.fn(), LOCKOUT_HOUR_OPTIONS: [3, 6, 12] }));
vi.mock('../components/support/SupportChat', () => ({ default: () => null }));
vi.mock('../components/dashboard/WelcomeCelebration', () => ({ default: () => null }));
vi.mock('../components/dashboard/PhonePrompt', () => ({ default: () => null }));
vi.mock('../components/dashboard/VerifyEmailBanner', () => ({ default: () => null }));
vi.mock('../components/dashboard/TrialGate', () => ({ TrialBanner: () => null, UpgradeWall: () => null }));

import DashboardLayout from '../components/dashboard/DashboardLayout';
import OverviewPage from '../pages/OverviewPage';
import LiveGuardPage from '../pages/LiveGuardPage';
import RulesTerminal from '../components/dashboard/RulesTerminal';
import AllTradesPage from '../pages/AllTradesPage';
import { ToastProvider } from '../components/common/ToastProvider';

function mount(path) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="overview" element={<OverviewPage />} />
            <Route path="live" element={<LiveGuardPage />} />
            <Route path="rules" element={<RulesTerminal />} />
            <Route path="trades" element={<AllTradesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const base = { id: 'u1', name: 'Prashant Pathak', email: 'p@x.com', planKnown: true };
const failed = { ...base, planState: 'pf', planProtected: false, access: 'expired', isExpired: true };
const cancelled = { ...base, planState: 'pc', planProtected: true, planStateEndsAt: '2026-11-15T12:00:00Z', access: 'active', subscriptionCanceled: true };

beforeEach(() => { localStorage.clear(); });

describe('payment failed (pf)', () => {
  beforeEach(() => { auth.user = failed; });

  it('says so in the pill and the band, and points at Plan & billing', async () => {
    mount('/dashboard/overview');
    await waitFor(() => expect(screen.getAllByText('Not protected · payment failed').length).toBeGreaterThan(0));
    expect(screen.getByText('Payment failed. Your guard is off.')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Pay now' })[0].getAttribute('href')).toBe('/dashboard/account/billing');
  });

  it('turns the Overview dial off and stops implying enforcement', async () => {
    mount('/dashboard/overview');
    await waitFor(() => expect(screen.getByText('guard off · payment failed')).toBeTruthy());
    expect(screen.getByText('Off')).toBeTruthy();
    expect(screen.getByText('Not enforced: payment failed')).toBeTruthy();
    expect(screen.getByText(/Your manual kill switch still works/)).toBeTruthy();
    expect(screen.queryByText(/before the guard closes the day/)).toBeNull();
  });

  it('locks Live guard with one way out, and leaves the page underneath', async () => {
    mount('/dashboard/live');
    await waitFor(() => expect(screen.getByText('Off until your payment goes through')).toBeTruthy());
    const cta = screen.getAllByRole('link', { name: 'Pay now' }).find((a) => a.getAttribute('href').includes('return='));
    expect(cta.getAttribute('href')).toBe('/dashboard/account/billing?return=%2Fdashboard%2Flive');
  });

  it('does not lock All trades: your record stays readable', async () => {
    mount('/dashboard/trades');
    await waitFor(() => expect(screen.getAllByText('Not protected · payment failed').length).toBeGreaterThan(0));
    expect(screen.queryByText('Off until your payment goes through')).toBeNull();
  });

  it('keeps the kill switch usable and says why', async () => {
    mount('/dashboard/overview');
    await waitFor(() => expect(screen.getAllByText('Not protected · payment failed').length).toBeGreaterThan(0));
    const ks = screen.getByRole('button', { name: 'Kill switch' });
    expect(ks.getAttribute('aria-disabled')).toBeNull();
    expect(ks.getAttribute('title')).toBe('Works without a plan: your rules are off, your kill switch is not');
  });

  it('marks the sidebar: LOCKED pages, "!" on Plan & billing, rules SAVED', async () => {
    mount('/dashboard/overview');
    await waitFor(() => expect(screen.getAllByText('LOCKED').length).toBe(2));
    expect(screen.getByText('SAVED')).toBeTruthy();
    expect(screen.getByText('Pro · payment failed')).toBeTruthy();
  });

  it('shows rules view-only', async () => {
    mount('/dashboard/rules');
    await waitFor(() => expect(screen.getByText('Rules are saved but not enforced while your plan is inactive.')).toBeTruthy());
    const switches = await screen.findAllByRole('switch');
    for (const sw of switches) expect(sw.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('Pro cancelled, still inside the period (pc)', () => {
  beforeEach(() => { auth.user = cancelled; });

  it('is protected, says until when, and locks nothing', async () => {
    mount('/dashboard/live');
    await waitFor(() => expect(screen.getAllByText(/Protected · until 15 Nov/).length).toBeGreaterThan(0));
    expect(screen.getByText('Pro ends 15 Nov.')).toBeTruthy();
    expect(screen.queryByText('LOCKED')).toBeNull();
    expect(screen.queryByText(/Needs an active plan/)).toBeNull();
  });
});

describe('trial cancelled, and this account has no key yet', () => {
  beforeEach(() => {
    auth.user = { ...base, planState: 'tc', planProtected: true, planStateEndsAt: '2026-10-15T12:00:00Z', access: 'trial', isTrial: true, subscriptionCanceled: true };
    getExchangeCredentialsStatus.mockImplementation(async () => ({ status: 'not_connected' }));
  });
  afterEach(() => {
    getExchangeCredentialsStatus.mockImplementation(async () => ({ status: 'active', enforcementCapable: true, lastValidatedAt: new Date().toISOString() }));
  });

  it('locks Live guard behind "Connect your key"', async () => {
    mount('/dashboard/live');
    await waitFor(() => expect(screen.getByText('Connect your key to see this')).toBeTruthy());
    expect(screen.getAllByRole('link', { name: 'Connect key' }).some((a) => a.getAttribute('href') === '/dashboard/connect')).toBe(true);
    expect(screen.getByRole('button', { name: 'Kill switch' }).getAttribute('aria-disabled')).toBe('true');
  });
});

describe('an API that does not send the lifecycle state yet', () => {
  beforeEach(() => { auth.user = { ...base, access: 'active' }; });

  it('leaves the shell exactly as before: no locks, no plan band', async () => {
    mount('/dashboard/live');
    await waitFor(() => expect(screen.getAllByText(/ARMED/i).length).toBeGreaterThan(0));
    expect(screen.queryByText('LOCKED')).toBeNull();
  });
});
