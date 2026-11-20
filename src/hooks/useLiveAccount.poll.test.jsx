import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const live = vi.hoisted(() => ({ calls: [], respond: null }));
vi.mock('../api/liveApi', async (orig) => {
  const real = await orig();
  return {
    ...real,
    fetchLive: vi.fn(async ({ accountIds }) => { live.calls.push(accountIds); return live.respond(accountIds); }),
  };
});
const channel = vi.hoisted(() => ({ opened: 0 }));
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    channel: () => { channel.opened += 1; const c = { on: () => c, subscribe: () => c }; return c; },
    removeChannel: () => {},
  },
}));
vi.mock('../api/tradingAccountsApi', () => ({ fetchTradingAccounts: vi.fn(async () => []) }));

import { useLiveAccount } from './useLiveAccount';
import { rowFromLive } from '../api/liveApi';

const A = '11111111-1111-4111-8111-111111111111';
const snap = (over = {}) => ({
  accountId: A, userId: 'u1', source: 'cache', ts: 1_000, hb: 1_000,
  equity: 5012.5, dailyStartingEquity: 5000, dailyPnl: 12.5, openPnl: { BTCUSD: 12.5 },
  tradeCountToday: 1, consecutiveLosses: 0, cooldownUntil: null, lockReason: null, pendingLock: null,
  positions: [{ symbol: 'BTCUSD', side: 'buy', size: 1, entryPrice: 60000 }], ...over,
});

describe('rowFromLive', () => {
  it("maps the engine's snapshot onto the row shape the app already reads", () => {
    expect(rowFromLive(snap())).toMatchObject({
      id: A, currentEquity: 5012.5, dailyPnl: 12.5, openPnl: { BTCUSD: 12.5 }, tradeCountToday: 1, liveSource: 'cache', liveHb: 1_000,
    });
  });
  it("keeps the account's currency: a rupee account never shows $ (20 Nov, Shark)", () => {
    expect(rowFromLive(snap({ currency: 'INR' })).accountCurrency).toBe('INR');
    expect(rowFromLive(snap({ currency: null }), 'INR').accountCurrency).toBe('INR');
  });

  it('carries a lock and derives the pending-lock deadline like the API does', () => {
    const r = rowFromLive(snap({ cooldownUntil: '2026-11-21T00:00:00.000Z', lockReason: 'daily_loss', pendingLock: { hours: 3, requestedAt: '2026-11-20T10:00:00.000Z', symbols: ['BTCUSD'] } }));
    expect(r).toMatchObject({ cooldownUntil: '2026-11-21T00:00:00.000Z', cooldownReason: 'daily_loss' });
    expect(r.pendingLock.startsBy).toBe('2026-11-21T10:00:00.000Z');
  });
});

describe('useLiveAccount with the live cache switched on', () => {
  beforeEach(() => {
    localStorage.setItem('tgx.liveTransport', 'poll');
    live.calls = [];
    channel.opened = 0;
    live.respond = () => ({ serverTime: Date.now(), cache: 'ok', accounts: [snap()] });
  });
  afterEach(() => { localStorage.removeItem('tgx.liveTransport'); vi.useRealTimers(); });

  it('reads the account from /user/live and never opens a Realtime channel', async () => {
    const { result } = renderHook(() => useLiveAccount({ accessToken: 't', tradingAccountId: A }));
    await waitFor(() => expect(result.current?.currentEquity).toBe(5012.5));
    expect(result.current).toMatchObject({ source: 'server', dailyPnl: 12.5, tradeCountToday: 1 });
    expect(live.calls[0]).toEqual([A]);
    expect(channel.opened).toBe(0);
  });

  it('polls every second while a trade is open, and the row says so for the freshness label', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useLiveAccount({ accessToken: 't', tradingAccountId: A }));
    await waitFor(() => expect(result.current?.currentEquity).toBe(5012.5));
    expect(result.current.expectMs).toBe(1_000);
    const before = live.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(3_100); });
    expect(live.calls.length - before).toBeGreaterThanOrEqual(3);
  });

  it('slows to every 5 s when flat', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    live.respond = () => ({ serverTime: Date.now(), cache: 'ok', accounts: [snap({ positions: [], openPnl: {} })] });
    const { result } = renderHook(() => useLiveAccount({ accessToken: 't', tradingAccountId: A }));
    await waitFor(() => expect(result.current?.expectMs).toBe(5_000));
  });

  it("asks only every 30 s for an account no engine is watching (answered from the database)", async () => {
    live.respond = () => ({ serverTime: Date.now(), cache: 'ok', accounts: [snap({ source: 'db', positions: undefined, openPnl: { BTCUSD: 1 } })] });
    const { result } = renderHook(() => useLiveAccount({ accessToken: 't', tradingAccountId: A }));
    await waitFor(() => expect(result.current?.expectMs).toBe(30_000));
  });
});
