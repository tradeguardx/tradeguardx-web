import { describe, expect, it } from 'vitest';
import { shouldAsk } from './reviewPromptGate';

const DAY = 86_400_000;
const now = Date.parse('2026-11-24T10:00:00+05:30');
const me = { eligible: true, review: null, traderSince: new Date(now - 10 * DAY).toISOString() };
const base = { me, memo: {}, now, pathname: '/dashboard/overview' };
const today = (() => { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

describe('review popup gate', () => {
  it('asks a trader who connected 10 days ago and has not reviewed', () => {
    expect(shouldAsk(base)).toBe(true);
  });
  it('never asks someone who already reviewed, or cannot review', () => {
    expect(shouldAsk({ ...base, me: { ...me, review: { id: 'r1' } } })).toBe(false);
    expect(shouldAsk({ ...base, me: { ...me, eligible: false } })).toBe(false);
  });
  it('waits until 3 days after the first key', () => {
    expect(shouldAsk({ ...base, me: { ...me, traderSince: new Date(now - 2 * DAY).toISOString() } })).toBe(false);
    expect(shouldAsk({ ...base, me: { ...me, traderSince: null } })).toBe(false);
  });
  it('once a day: not again today, yes tomorrow', () => {
    expect(shouldAsk({ ...base, memo: { lastDay: today } })).toBe(false);
    expect(shouldAsk({ ...base, memo: { lastDay: today }, now: now + DAY })).toBe(true);
  });
  it('"Don\'t ask again" is final', () => {
    expect(shouldAsk({ ...base, memo: { never: true }, now: now + 30 * DAY })).toBe(false);
  });
  it('stays out of setup, billing and the review page', () => {
    for (const p of ['/dashboard/setup', '/dashboard/review', '/dashboard/account/billing']) {
      expect(shouldAsk({ ...base, pathname: p })).toBe(false);
    }
  });
});
