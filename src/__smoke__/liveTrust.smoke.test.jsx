/**
 * Trust on the live screens (roadmap R1, R2, R4), through the real shell:
 * DashboardLayout → TradingAccountProvider → GuardProvider → the page.
 *
 *   R1  a lock the ENGINE sets reaches the header kill switch, the guard and
 *       the Locked out view from the live row — no account-list refetch —
 *       and an expiring lock clears on the shared clock.
 *   R2  nothing reads "$0.00" or "Guard live" before the first live row, and
 *       a position open under a silent feed says "Delayed" / "Reconnecting".
 *   R4  switching accounts never shows the previous account's open trade,
 *       which is what gates how the kill switch arms.
 *
 * Supabase Realtime is faked so a test can push a row exactly as the engine's
 * UPDATE would arrive (snake_case columns, `payload.new`).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString();

// ── server state the fakes read ────────────────────────────────────────
const server = vi.hoisted(() => ({
  rows: {},
  trades: {},
  /** When set, snapshot reads (every call after the first list) wait on it. */
  hold: null,
  listCalls: 0,
  channels: [],
}));

function baseRows() {
  return {
    'acc-1': {
      id: 'acc-1', name: 'Delta main', propFirmSlug: 'delta_india', accountSize: 5000, accountCurrency: 'USD', timezone: 'Asia/Kolkata',
      dailyPnl: -42.5, currentEquity: 4957.5, dailyStartingEquity: 5000, tradeCountToday: 3, consecutiveLosses: 1,
      equityUpdatedAt: iso(-2_000), cooldownUntil: null, cooldownReason: null, pendingLock: null,
    },
    'acc-2': {
      id: 'acc-2', name: 'Shark INR', propFirmSlug: 'delta_india', accountSize: 50000, accountCurrency: 'INR', timezone: 'Asia/Kolkata',
      dailyPnl: 120, currentEquity: 50120, dailyStartingEquity: 50000, tradeCountToday: 1, consecutiveLosses: 0,
      equityUpdatedAt: iso(-2_000), cooldownUntil: null, cooldownReason: null, pendingLock: null,
    },
  };
}

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    channel: (name) => {
      const ch = { name, handlers: [], status: null };
      ch.on = (_type, filter, cb) => { ch.handlers.push({ filter, cb }); return ch; };
      ch.subscribe = (cb) => { ch.status = cb; cb?.('SUBSCRIBED'); return ch; };
      server.channels.push(ch);
      return ch;
    },
    removeChannel: (ch) => { server.channels = server.channels.filter((c) => c !== ch); },
  },
}));

/** The API's camelCase row as Postgres columns — what Realtime actually sends. */
function asDbRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'pendingLock') continue; // the API's derived object; the table has pending_lock_* columns
    out[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v;
  }
  return { pending_lock_hours: null, pending_lock_requested_at: null, pending_lock_symbols: null, ...out };
}
/** Deliver a Realtime UPDATE for one account, as the engine's write would. */
function push(changes) {
  const row = { ...asDbRow(server.rows[changes.id]), ...changes };
  for (const ch of server.channels) {
    for (const h of ch.handlers) if (h.filter?.filter === `id=eq.${row.id}`) h.cb({ new: row });
  }
}

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'tok', user: { id: 'u1' } }, user: { id: 'u1', name: 'T', email: 't@x.com', planKnown: true }, logout: vi.fn() }),
}));
vi.mock('../api/tradingAccountsApi', () => ({
  fetchTradingAccounts: vi.fn(async () => {
    server.listCalls += 1;
    if (server.listCalls > 1 && server.hold) await server.hold;
    return Object.values(server.rows).map((r) => ({ ...r }));
  }),
  setRuleLockDays: vi.fn(),
}));
vi.mock('../api/exchangeCredentialsApi', () => ({
  getExchangeCredentialsStatus: vi.fn(async () => ({ status: 'active', enforcementCapable: true, lastValidatedAt: new Date().toISOString() })),
  exchangeFromBrokerSlug: () => 'delta_india',
  connectExchangeCredentials: vi.fn(), disconnectExchangeCredentials: vi.fn(),
}));
vi.mock('../api/rulesApi', () => ({
  fetchRulesBundle: vi.fn(async () => ({
    templates: [{ slug: 'daily-loss', name: 'Daily loss protection', eligible: true, definition: { fields: [] } }],
    instances: [{ templateSlug: 'daily-loss', enabled: true, config: { mode: 'percent', dailyLossPct: '2' } }],
    ruleLock: { locked: false, days: 7 },
  })),
  saveRuleInstance: vi.fn(), cancelPendingRuleChange: vi.fn(),
}));
vi.mock('../api/notificationsApi', () => ({
  fetchNotificationSettings: vi.fn(async () => ({ telegramConnected: true })),
  updateNotificationSettings: vi.fn(), createTelegramBindingLink: vi.fn(), disconnectTelegram: vi.fn(),
}));
vi.mock('../api/breachesApi', () => ({ fetchBreaches: vi.fn(async () => []), acknowledgeBreaches: vi.fn() }));
vi.mock('../api/pricingApi', () => ({ getPricingPlans: vi.fn(async () => []) }));
vi.mock('../api/tradesApi', () => ({
  fetchJournalStats: vi.fn(async () => ({ overview: {}, behavior: {} })),
  fetchTaxSummary: vi.fn(async () => null),
  fetchJournalTrades: vi.fn(async ({ tradingAccountId }) => {
    const t = server.trades[tradingAccountId];
    return typeof t === 'function' ? t() : t ?? [];
  }),
  fetchBehaviorTags: vi.fn(async () => ({ behaviorTags: [] })),
}));
vi.mock('../api/userApi', () => ({ armLockout: vi.fn(), LOCKOUT_HOUR_OPTIONS: [3, 6, 12] }));
vi.mock('../components/support/SupportChat', () => ({ default: () => null }));
vi.mock('../components/dashboard/WelcomeCelebration', () => ({ default: () => null }));
vi.mock('../components/dashboard/PhonePrompt', () => ({ default: () => null }));
vi.mock('../components/dashboard/VerifyEmailBanner', () => ({ default: () => null }));
vi.mock('../components/dashboard/TrialGate', () => ({ TrialBanner: () => null, UpgradeWall: () => null }));

import DashboardLayout from '../components/dashboard/DashboardLayout';
import LiveGuardPage from '../pages/LiveGuardPage';
import OverviewPage from '../pages/OverviewPage';
import { ToastProvider } from '../components/common/ToastProvider';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { fetchTradingAccounts } from '../api/tradingAccountsApi';

function Switch() {
  const { setSelectedTradingAccountId } = useTradingAccounts();
  return <button type="button" onClick={() => setSelectedTradingAccountId('acc-2')}>switch-to-2</button>;
}

function mount(path) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="live" element={<><Switch /><LiveGuardPage /></>} />
            <Route path="overview" element={<OverviewPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const ksArmed = () => document.querySelector('[data-tgx-ks="1"]')?.getAttribute('data-armed');
const strip = (label) => screen.queryAllByText(label, { selector: 'span' }).length > 0;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tgx_trading_account_id', 'acc-1');
  server.rows = baseRows();
  server.trades = { 'acc-1': [], 'acc-2': [] };
  server.hold = null;
  server.listCalls = 0;
  server.channels = [];
  vi.clearAllMocks();
});

describe('R1 · an engine-set lock shows from the live row', () => {
  it('turns the header kill switch and the Live guard view to Locked on one push, without refetching the list', async () => {
    mount('/dashboard/live');
    await waitFor(() => expect(strip('Guard live')).toBe(true));
    expect(ksArmed()).toBe('0');
    const callsBefore = fetchTradingAccounts.mock.calls.length;

    // The engine trips the daily loss limit: cooldown_until lands on the row.
    act(() => push({ id: 'acc-1', cooldown_until: iso(2 * 3600_000), cooldown_reason: 'daily_loss', daily_pnl: -100 }));

    // One update, no waiting on a poll.
    expect(strip('Locked out')).toBe(true);
    expect(ksArmed()).toBe('1');
    expect(screen.getByText(/Lockout — Daily loss protection/)).toBeTruthy();
    // And it came from the push, not from refetching the account list.
    expect(fetchTradingAccounts.mock.calls.length).toBe(callsBefore);
  });

  it('shows an after_close lock waiting from the raw pending_lock_* columns', async () => {
    mount('/dashboard/live');
    await waitFor(() => expect(strip('Guard live')).toBe(true));
    act(() => push({ id: 'acc-1', pending_lock_hours: 3, pending_lock_requested_at: iso(-1000), pending_lock_symbols: ['BTCUSD'] }));
    expect(screen.getAllByText('Lock waiting').length).toBeGreaterThan(0);
  });

  it('clears an expiring lock on the shared clock, with nothing else arriving', async () => {
    mount('/dashboard/live');
    await waitFor(() => expect(strip('Guard live')).toBe(true));
    act(() => push({ id: 'acc-1', cooldown_until: iso(1_500), cooldown_reason: 'max_trades_day' }));
    expect(ksArmed()).toBe('1');
    await waitFor(() => expect(ksArmed()).toBe('0'), { timeout: 4_000 });
    expect(strip('Locked out')).toBe(false);
  });
});

describe('R2 · no verdict before data; a stale feed says so', () => {
  it('shows skeletons — never "$0.00" or "Guard live" — until the first live row lands', async () => {
    let release;
    server.hold = new Promise((r) => { release = r; });
    mount('/dashboard/live');
    await waitFor(() => expect(strip('Connecting')).toBe(true));
    expect(screen.queryByText(/\$0\.00/)).toBeNull();
    expect(strip('Guard live')).toBe(false);
    expect(screen.queryByText(/Flat so far/)).toBeNull();
    expect(screen.getByLabelText("Loading today's P&L")).toBeTruthy();

    await act(async () => { release(); });
    await waitFor(() => expect(strip('Guard live')).toBe(true));
    expect(screen.getAllByText(/−\$42/).length).toBeGreaterThan(0);
  });

  it.each([['while the live row loads', true], ['once a row with no reading lands', false]])(
    'never prints "$0.00" on a rupee account with no reading yet (Overview, %s)',
    async (_name, holding) => {
      localStorage.setItem('tgx_trading_account_id', 'acc-2');
      Object.assign(server.rows['acc-2'], { dailyPnl: null, currentEquity: null, dailyStartingEquity: null, equityUpdatedAt: null, tradeCountToday: null });
      if (holding) server.hold = new Promise(() => {});
      mount('/dashboard/overview');
      await waitFor(() => expect(screen.getAllByText('Today').length).toBeGreaterThan(0));
      if (!holding) await waitFor(() => expect(document.querySelector('.ov-stat')?.textContent).toContain('No reading for today yet.'));
      else expect(screen.getByLabelText("Loading today's P&L")).toBeTruthy();
      expect(screen.queryByText(/\$0\.00/)).toBeNull();
      expect(screen.queryByText('No trades yet on this account.')).toBeNull();
    },
  );

  it.each([
    ['fresh', -3_000, 'Guard live'],
    // Poll-fed here (no push in the test), so the bar is 15 s + one 30 s poll.
    ['delayed', -50_000, 'Delayed'],
    ['poll-fed, 30 s since a reading (20 Nov false alarm)', -30_000, 'Guard live'],
    ['dead', -5 * 60_000, 'Reconnecting'],
  ])('a %s feed with a position open reads the right label', async (_name, age, label) => {
    server.rows['acc-1'].equityUpdatedAt = iso(age);
    server.trades['acc-1'] = [{ tradeUid: 'p1', symbol: 'BTCUSD', side: 'BUY', status: 'OPEN' }];
    mount('/dashboard/live');
    await waitFor(() => expect(strip(label)).toBe(true));
    if (label !== 'Guard live') expect(strip('Guard live')).toBe(false);
  });

  it('does not call a quiet FLAT account stale — the engine skips writes when nothing changes', async () => {
    server.rows['acc-1'].equityUpdatedAt = iso(-3 * 3600_000);
    mount('/dashboard/live');
    await waitFor(() => expect(strip('Guard live')).toBe(true));
    expect(strip('Delayed')).toBe(false);
    expect(strip('Reconnecting')).toBe(false);
  });
});

describe('R4 · switching accounts never shows the previous account', () => {
  it('drops the old open trade (which gates the kill switch) and the old P&L the moment the account changes', async () => {
    server.trades['acc-1'] = [{ tradeUid: 'p1', symbol: 'BTCUSD', side: 'BUY', status: 'OPEN' }];
    // acc-2's trades never arrive: anything shown after the switch is stale.
    server.trades['acc-2'] = () => new Promise(() => {});
    mount('/dashboard/live');
    await waitFor(() => expect(screen.getByText('You have a trade open')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText(/−\$42/).length).toBeGreaterThan(0));

    server.hold = new Promise(() => {}); // acc-2's live row is still on its way
    act(() => screen.getByText('switch-to-2').click());

    expect(screen.queryByText('You have a trade open')).toBeNull();
    expect(screen.queryByText(/−\$42/)).toBeNull();
    expect(screen.queryByText(/BTCUSD/)).toBeNull();
  });
});
