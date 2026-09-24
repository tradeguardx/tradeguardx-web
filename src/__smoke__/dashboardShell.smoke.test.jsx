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
import JournalPage from '../pages/JournalPage';
import RulesTerminal from '../components/dashboard/RulesTerminal';
import EconomicCalendarPage from '../pages/EconomicCalendarPage';
import { ToastProvider } from '../components/common/ToastProvider';

function mount(path) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="overview" element={<OverviewPage />} />
            <Route path="live" element={<LiveGuardPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="rules" element={<RulesTerminal />} />
            <Route path="calendar" element={<EconomicCalendarPage />} />
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
    // No placeholder for a chart that cannot arrive: nothing persists an
    // intraday equity series, so the slot and its time axis stay absent
    // rather than promising a curve "once the session has points to plot".
    expect(screen.queryByText(/equity curve appears here/i)).toBeNull();
    expect(screen.queryByText('09:15')).toBeNull();
    expect(screen.queryByText(/equity · 5 min/)).toBeNull();
  });

  it('renders Journal on Performance with eight stat cards, charts and reading lines', async () => {
    mount('/dashboard/journal');
    await waitFor(() => expect(screen.getByText('Equity curve')).toBeTruthy());
    for (const k of ['Net P&L', 'Win rate', 'Profit factor', 'Expectancy', 'Max drawdown', 'Avg R:R', 'Avg hold', 'Discipline']) expect(screen.getAllByText(k).length).toBeGreaterThan(0);
    expect(screen.getByText('Where the money comes from')).toBeTruthy();
    expect(screen.getByText('P&L by weekday')).toBeTruthy();
    expect(screen.getByText('Long vs short')).toBeTruthy();
    expect(screen.getByText(/Tuesday costs you −\$80 on its own/)).toBeTruthy();
    expect(screen.getAllByText('72/100').length).toBe(1);
    // the same discipline selector feeds Behaviour
    screen.getByRole('tab', { name: 'Behaviour' }).click();
    await waitFor(() => expect(screen.getByText('Discipline score')).toBeTruthy());
    expect(screen.getByText('72')).toBeTruthy();
    expect(screen.getByText(/Arm Max trades per day/)).toBeTruthy();
  });

  it('renders Rules with the explainer, derived counter and three toggle states', async () => {
    mount('/dashboard/rules');
    await waitFor(() => expect(screen.getByText('Daily loss protection')).toBeTruthy());
    expect(screen.getByText('How your protection fits together')).toBeTruthy();
    expect(screen.getByText('1', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByTitle('Turn this rule off')).toBeTruthy();
    expect(screen.getByTitle('Turn this rule on')).toBeTruthy();
    screen.getByText('Max trades per day').click();
    await waitFor(() => expect(screen.getByText(/This rule is off, so nothing here is being enforced/)).toBeTruthy());
    expect(screen.getByText('Enforced by: Risk engine · server-side')).toBeTruthy();
  });

  it('renders the Economic calendar: Market nav, hero, all time variants, five ACTUAL states, empty day', async () => {
    mount('/dashboard/calendar');
    await waitFor(() => expect(screen.getByText('Next high impact')).toBeTruthy());
    expect(screen.getByText('Market')).toBeTruthy();
    expect(screen.getByText('Economic calendar', { selector: 'span' })).toBeTruthy();
    // time_status variants, no fabricated clock times
    await waitFor(() => expect(screen.getByText('TENTATIVE')).toBeTruthy());
    expect(screen.getByText('ALL DAY')).toBeTruthy();
    expect(screen.getByText('DAY 1')).toBeTruthy();
    expect(screen.getByText('DAY 2')).toBeTruthy();
    // ACTUAL: beat / miss / inline / IN xH / em dash
    const released = (v) => screen.getAllByText(v).find((el) => el.style.fontWeight === '600');
    expect(released('0.6%').style.color).toBe('var(--mint)');   // beat
    expect(released('0.1%').style.color).toBe('var(--red)');    // miss
    expect(released('3.1%').style.color).toBe('var(--ink)');    // inline
    expect(screen.getAllByText('IN 3H 07M').length).toBe(2);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getAllByText('No events').length).toBeGreaterThan(0);
    expect(screen.queryByText(/null/)).toBeNull();
    // holiday row: no bars, no value cells
    const holiday = screen.getByText(/Bank Holiday/).closest('[data-tgx-ecorow]');
    expect(holiday.querySelector('[data-tgx-ecovals]')).toBeNull();
    expect(holiday.querySelector('[aria-label$="impact"]')).toBeNull();
    // the lock modal opens from the hero
    screen.getByText(/Auto-lock ±15 min/).click();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByText(/Lock new orders around Core CPI m\/m/)).toBeTruthy();
  });
});
