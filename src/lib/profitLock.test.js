import { describe, expect, it } from 'vitest';
import { profitLockExamples, profitLockFloor, profitLockSettings, targetActionOf } from './profitLock';

// Must match the risk engine (src/rules/profitLock.ts) number for number.
const cfg = { dailyTargetAmount: '5000', targetAction: 'trail', profitLockInitial: '3000', profitLockStep: '500', profitLockRaise: '300' };

describe('daily profit target: trail mode (web mirror of the engine)', () => {
  it('reads the owner example: target 5000 → 3000, then +300 per 500', () => {
    const { params } = profitLockSettings(cfg);
    expect(profitLockFloor(params, 4999)).toBeNull();
    expect(profitLockFloor(params, 5000)).toBe(3000);
    expect(profitLockFloor(params, 5500)).toBe(3300);
    expect(profitLockExamples(params)).toEqual([[5000, 3000], [5500, 3300], [6000, 3600]]);
  });

  it('keeps a fixed lock without step and raise', () => {
    const { params } = profitLockSettings({ dailyTargetAmount: 5000, profitLockInitial: 3000 });
    expect(profitLockFloor(params, 9000)).toBe(3000);
  });

  it('refuses a first lock at or above the target, in plain words', () => {
    expect(profitLockSettings({ ...cfg, profitLockInitial: '5000' }).error).toMatch(/below your profit target/);
    expect(profitLockSettings({ ...cfg, dailyTargetAmount: '' }).error).toMatch(/profit target first/);
  });

  it('defaults to locking after the trade closes', () => {
    expect(targetActionOf({})).toBe('after_close');
    expect(targetActionOf({ targetAction: 'close_at_target' })).toBe('close_at_target');
  });
});
