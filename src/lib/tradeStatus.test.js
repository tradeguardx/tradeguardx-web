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

  it('a rule that could not act is "Not closed"', () => {
    expect(tradeStatusOf(t(), [], { pnl: -1, unenforced: true }).key).toBe('notClosed');
    const s = tradeStatusOf(t(), [b({ tradeUid: 'u1', breachType: 'enforcement_unavailable', ruleSlug: 'risk-per-trade', context: { reason: 'unentitled' } })], { pnl: -1 });
    expect(s.label).toBe('Not closed');
    expect(s.detail).toBe('Risk per trade · Plan not active');
  });
});

/*
 * 7 Nov 2026: the key was deleted 31 s after a kill switch, and every trade the
 * user then ran themselves read "Blocked by lock". Blocked means closed.
 */
describe('tradeStatusOf: the lock, honestly', () => {
  it('blocked names the lock and when it ends', () => {
    const s = tradeStatusOf(t({ metadata: { blocked: true, lockReason: 'daily_loss', lockUntil: '2026-11-08T00:00:00Z' } }), [], { pnl: 0.02 });
    expect(s.label).toBe('Blocked by lock');
    expect(s.detail).toMatch(/^Daily loss limit · until \d\d:\d\d$/);
  });

  it('a lock that could not close it is "Not blocked", with the reason', () => {
    const s = tradeStatusOf(t({ metadata: { notBlocked: true, notBlockedReason: 'key_rejected', lockReason: 'daily_loss' } }), [], { pnl: -13.51 });
    expect(s.key).toBe('notBlocked');
    expect(s.label).toBe('Not blocked');
    expect(s.detail).toBe('Daily loss limit · API key removed');
    expect(isEventful(s)).toBe(true);
  });

  it('an Exness index the lock could not close says why, and its open alert shows when no lock ran', () => {
    const locked = tradeStatusOf(t({ metadata: { notBlocked: true, notBlockedReason: 'instrument_not_closable', lockReason: 'manual_lock' } }), [], { pnl: -3 });
    expect(locked.detail).toBe("Your lock · Index can't be closed");
    const open = tradeStatusOf(t(), [b({ tradeUid: 'u1', breachType: 'instrument_not_closable', severity: 'warning' })], { pnl: 2 });
    expect(open.key).toBe('alert');
    expect(open.label).toBe("Alert: can't be closed");
  });

  it('the trade_not_blocked breach wins over a stale blocked tag', () => {
    const s = tradeStatusOf(t({ metadata: { blocked: true } }), [
      b({ tradeUid: 'u1', breachType: 'trade_not_blocked', context: { lockReason: 'manual_lock', notBlockedReason: 'exchange_refused' } }),
    ], { pnl: -1 });
    expect(s.key).toBe('notBlocked');
    expect(s.all.map((x) => x.key)).not.toContain('blocked');
    expect(s.detail).toBe('Your lock · Exchange refused the close');
  });

  it('a lock with no plan or a read-only key is "Not blocked", not "Not closed"', () => {
    const s = tradeStatusOf(t(), [b({ tradeUid: 'u1', breachType: 'enforcement_unavailable', ruleSlug: 'cooldown-block', context: { reason: 'incapable' } })], { pnl: 1 });
    expect(s.key).toBe('notBlocked');
    expect(s.detail).toBe("Lock · Key can't trade");
  });

  it('a waiting lock is the user\'s own', () => {
    const s = tradeStatusOf(t({ metadata: { blocked: true } }), [b({ tradeUid: 'u1', breachType: 'trade_blocked_cooldown', context: { pendingLock: true } })], { pnl: 0 });
    expect(s.detail).toBe('Your lock');
  });

  it('counts anything but clean as eventful', () => {
    expect(isEventful({ key: 'clean' })).toBe(false);
    expect(isEventful({ key: 'alert' })).toBe(true);
  });

  it('a trade open when the key died is "Not tracked", not "Clean"', () => {
    const s = tradeStatusOf(t({ closedAt: null, metadata: { orphaned: true, orphanedAt: '2026-11-08T05:21:59Z', orphanedReason: 'credential_no_longer_active' } }), []);
    expect(s.key).toBe('untracked');
    expect(s.label).toBe('Not tracked');
    expect(s.detail).toBe('API key stopped working · close not seen');
    expect(tradeStatusOf(t({ metadata: { outcomeUnknown: true, closedBy: 'key_given_up' } }), []).key).toBe('untracked');
  });
});
