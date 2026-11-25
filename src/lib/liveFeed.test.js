import { describe, expect, it } from 'vitest';
import { FEED, agoLabel, feedOf } from './liveFeed';

const NOW = Date.parse('2026-11-20T10:00:00Z');
const row = (ageMs, extra = {}) => ({ source: 'server', equityUpdatedAt: ageMs == null ? null : new Date(NOW - ageMs).toISOString(), changedAt: null, ...extra });

describe('feedOf — R2 null / fresh / delayed / dead', () => {
  it('no row, or only the account-list seed, is loading — never a figure', () => {
    expect(feedOf(null, { now: NOW, positionsOpen: true }).status).toBe(FEED.LOADING);
    expect(feedOf({ ...row(1000), source: 'initial' }, { now: NOW, positionsOpen: true }).status).toBe(FEED.LOADING);
  });

  it('with a position open: fresh is live, >15 s delayed, >60 s reconnecting', () => {
    expect(feedOf(row(3_000), { now: NOW, positionsOpen: true }).status).toBe(FEED.LIVE);
    expect(feedOf(row(16_000), { now: NOW, positionsOpen: true }).status).toBe(FEED.DELAYED);
    expect(feedOf(row(61_000), { now: NOW, positionsOpen: true }).status).toBe(FEED.RECONNECTING);
  });

  it('a flat account is idle however old the write — the engine skips unchanged writes', () => {
    expect(feedOf(row(6 * 3600_000), { now: NOW, positionsOpen: false }).status).toBe(FEED.IDLE);
  });

  it('positions not loaded yet are not evidence of staleness', () => {
    expect(feedOf(row(6 * 3600_000), { now: NOW, positionsOpen: null }).status).toBe(FEED.IDLE);
  });

  it('an open position with no equity reading at all is unknown, not stale', () => {
    expect(feedOf(row(null), { now: NOW, positionsOpen: true }).status).toBe(FEED.LIVE);
  });

  it('measures from the local change time once seen, so a skewed phone clock cannot fake "Delayed"', () => {
    // Server stamp looks 40 s old (phone clock ahead), but it changed locally 2 s ago.
    expect(feedOf(row(40_000, { changedAt: NOW - 2_000 }), { now: NOW, positionsOpen: true }).status).toBe(FEED.LIVE);
  });

  it('labels the age', () => {
    expect(agoLabel(8_200)).toBe('8s ago');
    expect(agoLabel(3 * 60_000)).toBe('3m ago');
    expect(agoLabel(2 * 3600_000)).toBe('2h ago');
    expect(agoLabel(null)).toBe('');
  });
});

/*
 * 20 Nov 2026, Kumud's account in mirror view: the engine wrote every 3 s,
 * but this browser only got a reading every 30 s (no Realtime push), and the
 * page said "Delayed · updated 23s ago". Poll-fed, the thresholds stretch by
 * one poll interval; push-fed, they do not.
 */
describe('feedOf — allows for how the browser is fed', () => {
  it('poll-fed (expectMs 30 s): 23 s and 40 s since a reading are live, not delayed', () => {
    expect(feedOf(row(23_000, { expectMs: 30_000 }), { now: NOW, positionsOpen: true }).status).toBe(FEED.LIVE);
    expect(feedOf(row(40_000, { expectMs: 30_000 }), { now: NOW, positionsOpen: true }).status).toBe(FEED.LIVE);
  });

  it('poll-fed: a reading that really stopped still turns delayed, then reconnecting', () => {
    expect(feedOf(row(46_000, { expectMs: 30_000 }), { now: NOW, positionsOpen: true }).status).toBe(FEED.DELAYED);
    expect(feedOf(row(91_000, { expectMs: 30_000 }), { now: NOW, positionsOpen: true }).status).toBe(FEED.RECONNECTING);
  });

  it('push-fed (expectMs 0) keeps the tight 15 s threshold', () => {
    expect(feedOf(row(16_000, { expectMs: 0 }), { now: NOW, positionsOpen: true }).status).toBe(FEED.DELAYED);
  });
});
