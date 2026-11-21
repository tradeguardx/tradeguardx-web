import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { liveChangeKey, liveIsHealthy, useLiveDrivenRefresh } from './useLiveDrivenRefresh';

const row = (over = {}) => ({
  id: 'a1', source: 'server', receivedAt: Date.now(), expectMs: 1_000,
  tradeCountToday: 1, consecutiveLosses: 0, cooldownUntil: null, cooldownReason: null, pendingLock: null,
  openPnl: { BTCUSD: 1.25 }, dailyPnl: 1.25, ...over,
});

describe('liveChangeKey', () => {
  it('ignores P&L ticks', () => {
    expect(liveChangeKey(row({ openPnl: { BTCUSD: 9 }, dailyPnl: 9 }))).toBe(liveChangeKey(row()));
  });
  it('changes on a trade opening or closing, a lock, or a queued lock', () => {
    const base = liveChangeKey(row());
    expect(liveChangeKey(row({ openPnl: { BTCUSD: 1, ETHUSD: 2 } }))).not.toBe(base);
    expect(liveChangeKey(row({ openPnl: {} }))).not.toBe(base);
    expect(liveChangeKey(row({ tradeCountToday: 2 }))).not.toBe(base);
    expect(liveChangeKey(row({ cooldownUntil: '2026-11-21T00:00:00Z', cooldownReason: 'manual' }))).not.toBe(base);
    expect(liveChangeKey(row({ pendingLock: { hours: 3 } }))).not.toBe(base);
  });
  it('has no key before a server row arrives', () => {
    expect(liveChangeKey(null)).toBeNull();
    expect(liveChangeKey(row({ source: 'seed' }))).toBeNull();
  });
});

describe('liveIsHealthy', () => {
  it('is healthy only with a recent reading on the 1-5 s feed', () => {
    const now = Date.now();
    expect(liveIsHealthy(row({ receivedAt: now }), now)).toBe(true);
    expect(liveIsHealthy(row({ receivedAt: now - 20_000 }), now)).toBe(false);
    expect(liveIsHealthy(row({ expectMs: 30_000 }), now)).toBe(false);
    expect(liveIsHealthy(null, now)).toBe(false);
  });
  it('judges a cache-fed row by its own poll interval (slow pages poll every 15-30 s)', () => {
    const now = Date.now();
    expect(liveIsHealthy(row({ viaCache: true, expectMs: 30_000, receivedAt: now - 25_000 }), now)).toBe(true);
    expect(liveIsHealthy(row({ viaCache: true, expectMs: 15_000, receivedAt: now - 40_000 }), now)).toBe(false);
  });
});

describe('useLiveDrivenRefresh', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const mount = (initialRow, extra = {}) => {
    const load = vi.fn();
    const hook = renderHook(
      ({ r, k }) => useLiveDrivenRefresh({ load, resetKey: 'x', row: r, extraKey: k, fastMs: 15_000, slowMs: 60_000, ...extra }),
      { initialProps: { r: initialRow, k: '' } },
    );
    return { load, hook };
  };

  it('loads once at start, then only on the slow backstop while the feed is healthy', () => {
    let r = row();
    const { load, hook } = mount(r);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][1]).toEqual({ full: true, first: true });
    // Keep the feed fresh every 15 s; no reload until 60 s.
    for (let i = 0; i < 3; i += 1) {
      act(() => { vi.advanceTimersByTime(15_000); });
      r = row({ receivedAt: Date.now() });
      hook.rerender({ r, k: '' });
    }
    expect(load).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('falls back to the old fast poll when the feed is not healthy', () => {
    const { load } = mount(null);
    act(() => { vi.advanceTimersByTime(15_000); });
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('reloads at once when a trade opens, then once more after it settles', () => {
    const { load, hook } = mount(row());
    act(() => { vi.advanceTimersByTime(6_000); });
    hook.rerender({ r: row({ receivedAt: Date.now(), openPnl: { BTCUSD: 1, ETHUSD: 0 } }), k: '' });
    expect(load).toHaveBeenCalledTimes(2);
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('a P&L tick alone never reloads', () => {
    const { load, hook } = mount(row());
    act(() => { vi.advanceTimersByTime(6_000); });
    hook.rerender({ r: row({ receivedAt: Date.now(), openPnl: { BTCUSD: -4 }, dailyPnl: -4 }), k: '' });
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('a new alert (extraKey) reloads', () => {
    const { load, hook } = mount(row());
    act(() => { vi.advanceTimersByTime(6_000); });
    hook.rerender({ r: row({ receivedAt: Date.now() }), k: 'alert-1' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a burst of changes is spaced out, never a storm', () => {
    const { load, hook } = mount(row());
    act(() => { vi.advanceTimersByTime(6_000); });
    for (let i = 2; i < 12; i += 1) {
      hook.rerender({ r: row({ receivedAt: Date.now(), tradeCountToday: i }), k: '' });
      act(() => { vi.advanceTimersByTime(200); });
    }
    // 1 start + 1 immediate; the rest collapse into one trailing call.
    expect(load).toHaveBeenCalledTimes(2);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(load.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('the first live row for an account is not a change', () => {
    const { load, hook } = mount(null);
    hook.rerender({ r: row(), k: '' });
    expect(load).toHaveBeenCalledTimes(1);
  });
});
