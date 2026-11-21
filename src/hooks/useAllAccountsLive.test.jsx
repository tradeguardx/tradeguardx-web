import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const live = vi.hoisted(() => ({ calls: [], respond: null }));
vi.mock('../api/liveApi', async (orig) => {
  const real = await orig();
  return { ...real, fetchLive: vi.fn(async (args) => { live.calls.push(args); return live.respond(args); }) };
});

import { useAllAccountsLive } from './useAllAccountsLive';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const snap = (id, over = {}) => ({
  accountId: id, userId: 'u', source: 'cache', ts: 1, hb: 1, equity: 1, dailyPnl: 0, openPnl: {}, positions: [],
  tradeCountToday: 0, consecutiveLosses: 0, cooldownUntil: null, lockReason: null, pendingLock: null,
  ver: { rules: 1, alerts: 1, key: 1 }, ...over,
});

describe('useAllAccountsLive', () => {
  beforeEach(() => { live.calls = []; });

  it('asks the cache only, once, for every account', async () => {
    live.respond = () => ({ cache: 'ok', accounts: [snap(A), snap(B)], missing: [] });
    const { result } = renderHook(() => useAllAccountsLive({ accessToken: 't', accountIds: [A, B], onRows: () => {} }));
    await waitFor(() => expect(result.current.ok).toBe(true));
    expect(live.calls[0]).toMatchObject({ cacheOnly: true });
    expect([...live.calls[0].accountIds].sort()).toEqual([A, B]);
  });

  it('counts open trades per account (the marker for accounts not on screen)', async () => {
    live.respond = () => ({ cache: 'ok', accounts: [snap(A), snap(B, { positions: [{ symbol: 'X' }, { symbol: 'Y' }] })], missing: [] });
    const { result } = renderHook(() => useAllAccountsLive({ accessToken: 't', accountIds: [A, B], onRows: () => {} }));
    await waitFor(() => expect(result.current.open).toEqual({ [B]: 2 }));
  });

  it('hands every account\'s lock to onRows', async () => {
    const onRows = vi.fn();
    live.respond = () => ({ cache: 'ok', accounts: [snap(A, { cooldownUntil: '2030-01-01T00:00:00.000Z', lockReason: 'manual' })], missing: [] });
    renderHook(() => useAllAccountsLive({ accessToken: 't', accountIds: [A], onRows }));
    await waitFor(() => expect(onRows).toHaveBeenCalled());
    expect(onRows.mock.calls[0][0][0]).toMatchObject({ id: A, cooldownUntil: '2030-01-01T00:00:00.000Z', cooldownReason: 'manual' });
  });

  it.each([
    ['an account has no snapshot', () => ({ cache: 'ok', accounts: [snap(A)], missing: [B] })],
    ['the cache is down', () => ({ cache: 'down', accounts: [], missing: [A, B] })],
    ['the engine sends no stamps yet', () => ({ cache: 'ok', accounts: [snap(A, { ver: undefined }), snap(B, { ver: undefined })], missing: [] })],
  ])('is NOT ok (old polls stay on) when %s', async (_label, respond) => {
    live.respond = respond;
    const { result } = renderHook(() => useAllAccountsLive({ accessToken: 't', accountIds: [A, B], onRows: () => {} }));
    await waitFor(() => expect(live.calls.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.ok).toBe(false);
  });

  it('a new account is not covered until it has been checked', async () => {
    live.respond = ({ accountIds }) => ({ cache: 'ok', accounts: accountIds.map((id) => snap(id)), missing: [] });
    const { result, rerender } = renderHook(({ ids }) => useAllAccountsLive({ accessToken: 't', accountIds: ids, onRows: () => {} }), { initialProps: { ids: [A] } });
    await waitFor(() => expect(result.current.ok).toBe(true));
    live.respond = () => new Promise(() => {}); // the check for the new set never answers
    rerender({ ids: [A, B] });
    expect(result.current.ok).toBe(false);
  });

  it('stops after a rejected login', async () => {
    live.respond = () => { const e = new Error('Unauthorized'); e.status = 401; throw e; };
    const { result } = renderHook(() => useAllAccountsLive({ accessToken: 't', accountIds: [A], onRows: () => {} }));
    await waitFor(() => expect(live.calls.length).toBe(1));
    expect(result.current.ok).toBe(false);
  });
});
