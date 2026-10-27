import { describe, expect, it } from 'vitest';
import { isEventful, tradeStatusOf } from './tradeStatus';

/*
 * Sequences taken from real accounts on 26–27 Oct 2026 (anonymised): a loss
 * that completes a streak, two trades opened during the lock it caused, a
 * position the risk rule closed, and a daily-loss kill switch.
 */
const t = (over) => ({ tradeUid: 'u1', openedAt: '2026-10-27T10:04:49Z', closedAt: '2026-10-27T10:05:11Z', metadata: {}, ...over });
const b = (over) => ({ tradeUid: null, context: {}, createdAt: '2026-10-27T10:05:11Z', ...over });

describe('tradeStatusOf', () => {
  it('is clean when nothing fired', () => {
    expect(tradeStatusOf(t(), [], { pnl: 2 }).key).toBe('clean');
  });

  it('marks a trade opened during a lock as blocked, above everything else', () => {
    const s = tradeStatusOf(t({ metadata: { blocked: true, blockedReason: 'cooldown' } }), [
      b({ tradeUid: 'u1', breachType: 'risk_per_trade_exceeded', context: { onBreach: 'close' } }),
    ], { pnl: -0.14 });
    expect(s.key).toBe('blocked');
    expect(s.all.map((x) => x.key)).toEqual(['blocked', 'risk']);
  });

  it('marks the losing trade that completed a streak as the trigger', () => {
    const s = tradeStatusOf(t(), [b({ breachType: 'consecutive_losses_exceeded', createdAt: '2026-10-27T10:05:11.200Z' })], { pnl: -0.77 });
    expect(s.key).toBe('triggered');
  });

  it('marks a position closed by the risk rule, and an alert-only breach as an alert', () => {
    expect(tradeStatusOf(t(), [b({ tradeUid: 'u1', breachType: 'risk_per_trade_exceeded', context: { onBreach: 'close' } })], { pnl: -0.13 }).key).toBe('risk');
    const alert = tradeStatusOf(t(), [b({ tradeUid: 'u1', breachType: 'risk_per_trade_exceeded', context: { onBreach: 'alert' } })], { pnl: -0.13 });
    expect(alert.key).toBe('alert');
    expect(alert.label).toBe('Alert: risk over limit');
  });

  it('marks a position open when the daily loss limit fired as closed by the kill switch', () => {
    const s = tradeStatusOf(
      t({ openedAt: '2026-10-26T12:28:33Z', closedAt: '2026-10-26T13:01:35Z' }),
      [b({ breachType: 'daily_loss_exceeded', createdAt: '2026-10-26T13:01:35Z' })],
      { pnl: -3.61 },
    );
    expect(s.key).toBe('kill');
    expect(s.hint).toMatch(/daily loss limit/);
  });

  it('does not pin an account-level breach on a trade closed long before it', () => {
    const s = tradeStatusOf(t({ closedAt: '2026-10-27T08:00:00Z' }), [b({ breachType: 'daily_loss_exceeded' })], { pnl: -1 });
    expect(s.key).toBe('clean');
  });

  it("ignores another trade's per-trade breach", () => {
    expect(tradeStatusOf(t(), [b({ tradeUid: 'other', breachType: 'missing_stop_loss' })], { pnl: 1 }).key).toBe('clean');
  });

  it('marks a missing stop-loss as an alert, and a winning close at target as hit target', () => {
    expect(tradeStatusOf(t(), [b({ tradeUid: 'u1', breachType: 'missing_stop_loss' })], { pnl: 1 }).label).toBe('Alert: no stop-loss');
    expect(tradeStatusOf(t(), [b({ breachType: 'daily_target_reached' })], { pnl: 6 }).key).toBe('target');
  });

  it('keeps the existing not-enforced tag', () => {
    expect(tradeStatusOf(t(), [], { pnl: -1, unenforced: true }).key).toBe('notEnforced');
  });

  it('counts anything but clean as eventful', () => {
    expect(isEventful({ key: 'clean' })).toBe(false);
    expect(isEventful({ key: 'alert' })).toBe(true);
  });
});
