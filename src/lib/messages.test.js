import { describe, expect, it } from 'vitest';
import { bandMessagesOf, RANK } from './messages';
import { lifecycleView } from './lifecycle';

const gap = (key) => ({ key, title: `${key} title`, body: `${key} body`, cta: `${key} cta`, to: `/dashboard/${key}` });
const acct = (over = {}) => ({ loaded: true, account: { id: 'a' }, guard: 'armed', gaps: [], describe: {}, ...over });
const ids = (msgs) => msgs.map((m) => m.id);
const tc = lifecycleView('tc', { endsAt: '2026-10-15T12:00:00Z' });

describe('the band says the most important thing first', () => {
  it('the screenshot: trial cancelled leads, "no alert channel" is the second line', () => {
    const msgs = bandMessagesOf({ life: tc, selected: acct({ gaps: [gap('alerts')] }), user: {} });
    expect(ids(msgs)).toEqual(['plan:tc', 'gap:alerts']);
    expect(msgs[0].title).toBe('Trial cancelled. You won’t be charged.');
  });

  it('no rules on beats the plan ending: nothing is enforced today', () => {
    const msgs = bandMessagesOf({ life: tc, selected: acct({ guard: 'unprotected', gaps: [gap('rules'), gap('alerts')] }), user: {} });
    expect(ids(msgs)).toEqual(['gap:rules', 'plan:tc', 'gap:alerts']);
  });

  it('a locked account leads everything but the plan being off', () => {
    const locked = acct({ guard: 'locked', describe: { showBand: true, bandTitle: 'Locked', bandBody: 'b', cta: 'See', to: '/dashboard/live' } });
    expect(ids(bandMessagesOf({ life: tc, selected: locked, user: {} }))[0]).toBe('account:locked');
  });

  it('with the plan off, only the plan speaks — not the key, rules or alerts', () => {
    const msgs = bandMessagesOf({ life: lifecycleView('pf'), selected: acct({ gaps: [gap('rules'), gap('alerts'), gap('key')] }), user: {} });
    expect(ids(msgs)).toEqual(['plan:pf']);
    expect(msgs[0].rank).toBe(RANK.PLAN_OFF);
  });

  it('in setup, only setup speaks', () => {
    const msgs = bandMessagesOf({ life: lifecycleView('s2', { accountName: 'Shark' }), selected: acct({ gaps: [gap('key'), gap('alerts')] }), user: {} });
    expect(ids(msgs)).toEqual(['setup:s2']);
  });

  it('a calm protected account says nothing', () => {
    expect(bandMessagesOf({ life: lifecycleView('p'), selected: acct(), user: {} })).toEqual([]);
  });

  it('a missing key on a protected plan is "can’t act", above the plan ending', () => {
    const msgs = bandMessagesOf({ life: tc, selected: acct({ guard: 'unprotected', gaps: [gap('key'), gap('rules')] }), user: {} });
    // The rules gap waits until the key is fixed: one step at a time.
    expect(ids(msgs)).toEqual(['gap:key', 'plan:tc']);
  });

  it('the plan’s billing gap is never repeated when the lifecycle already says it', () => {
    const msgs = bandMessagesOf({ life: lifecycleView('t1'), selected: acct({ gaps: [gap('billing')] }), user: {} });
    expect(ids(msgs)).toEqual([]);
  });

  it('an old API (no lifecycle) still gets its billing prompt', () => {
    const msgs = bandMessagesOf({ life: null, selected: acct({ gaps: [gap('billing')] }), user: {} });
    expect(ids(msgs)).toContain('gap:billing');
  });
});
