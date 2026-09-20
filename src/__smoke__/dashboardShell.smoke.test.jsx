/**
 * Smoke: the redesigned shell + screens render in jsdom with every API
 * mocked. Catches the runtime errors a build cannot — undefined props, bad
 * hook order, a selector fed the wrong shape.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const account = {
  id: 'acc-1', name: 'Delta main', propFirmSlug: 'delta_india', accountSize: 5000,
  dailyPnl: -42.5, currentEquity: 4957.5, dailyStartingEquity: 5000, tradeCountToday: 3,
  consecutiveLosses: 1, cooldownUntil: null, cooldownReason: null, accountCurrency: 'USD', timezone: 'Asia/Kolkata',
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'tok' }, user: { id: 'u1', name: 'Prashant Pathak', email: 'p@x.com' }, logout: vi.fn() }),
}));
vi.mock('../lib/supabaseClient', () => ({
  supabase: { channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn() },
}));
vi.mock('../api/tradingAccountsApi', () => ({
  fetchTradingAccounts: vi.fn(async () => [account]),
  fetchRuleLock: vi.fn(async () => ({ locked: false, days: 7 })),
  setRuleLockDays: vi.fn(),
}));
vi.mock('../api/exchangeCredentialsApi', () => ({
  getExchangeCredentialsStatus: vi.fn(async () => ({ status: 'active', enforcementCapable: true, lastValidatedAt: new Date().toISOString() })),
  exchangeFromBrokerSlug: (s) => (s === 'delta_india' ? 'delta_india' : null),
  connectExchangeCredentials: vi.fn(), disconnectExchangeCredentials: vi.fn(),
}));
vi.mock('../api/rulesApi', () => ({
  fetchRulesBundle: vi.fn(async () => ({
    templates: [{ slug: 'daily-loss', name: 'Daily loss protection' }, { slug: 'max-trades-day', name: 'Max trades per day' }],
    instances: [{ templateSlug: 'daily-loss', enabled: true, config: { mode: 'percent', dailyLossPct: '2' } }],
    ruleLock: { locked: false, days: 7 },
  })),
  saveRuleInstance: vi.fn(), cancelPendingRuleChange: vi.fn(),
}));
vi.mock('../api/notificationsApi', () => ({
  fetchNotificationSettings: vi.fn(async () => ({ telegramConnected: true, emailNotificationsEnabled: false })),
  updateNotificationSettings: vi.fn(), createTelegramBindingLink: vi.fn(), disconnectTelegram: vi.fn(),
}));
vi.mock('../api/breachesApi', () => ({ fetchBreaches: vi.fn(async () => []), acknowledgeBreaches: vi.fn() }));
vi.mock('../api/tradesApi', () => ({
  fetchJournalStats: vi.fn(async () => ({ behavior: { totalRuleBlocks: 2 } })),
  fetchTaxSummary: vi.fn(async () => ({ fyLabel: 'FY2026-27', netTradingPnl: { value: 8930.9 }, positionCount: 12 })),
  fetchJournalTrades: vi.fn(async () => []),
}));
vi.mock('../api/userApi', () => ({ armLockout: vi.fn(), fetchLockout: vi.fn(async () => ({ lockedUntil: null })), LOCKOUT_HOUR_OPTIONS: [3, 6, 12] }));
vi.mock('../components/support/SupportChat', () => ({ default: () => null }));
vi.mock('../components/dashboard/WelcomeCelebration', () => ({ default: () => null }));
vi.mock('../components/dashboard/PhonePrompt', () => ({ default: () => null }));
vi.mock('../components/dashboard/BreachBanner', () => ({ default: () => null }));
vi.mock('../components/dashboard/VerifyEmailBanner', () => ({ default: () => null }));
vi.mock('../components/dashboard/TrialGate', () => ({ TrialBanner: () => null, UpgradeWall: () => null }));

import DashboardLayout from '../components/dashboard/DashboardLayout';
import OverviewPage from '../pages/OverviewPage';
import LiveGuardPage from '../pages/LiveGuardPage';
import { ToastProvider } from '../components/common/ToastProvider';

function mount(path) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="overview" element={<OverviewPage />} />
            <Route path="live" element={<LiveGuardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => { localStorage.clear(); });

describe('dashboard shell', () => {
  it('renders Overview armed, with derived counts and no balance figure', async () => {
    mount('/dashboard/overview');
    await waitFor(() => expect(screen.getAllByText(/ARMED/i).length).toBeGreaterThan(0));
    expect(screen.getByText(/1 of your 2 rules is watching every fill/)).toBeTruthy();
    expect(screen.getAllByText('Kill switch').length).toBeGreaterThan(0);
    // budget used: 42.5 of 100 (2% of 5000)
    expect(screen.getAllByText(/\$58/).length).toBeGreaterThan(0); // budget left, 100 − 42.50
    // the brief's hard rule: the sizing balance is never echoed back
    expect(screen.queryByText(/5,000/)).toBeNull();
    expect(screen.queryByText(/4,957/)).toBeNull();
  });

  it('renders Live guard with the limit scale and commitment controls', async () => {
    mount('/dashboard/live');
    await waitFor(() => expect(screen.getByText(/loss limit — guard closes everything/)).toBeTruthy());
    expect(screen.getByText('Rule panel')).toBeTruthy();
    expect(screen.getByText('Commitment controls')).toBeTruthy();
    expect(screen.getByText('Manual killswitch')).toBeTruthy();
    expect(screen.getByText('Rule lock')).toBeTruthy();
  });
});
