import { describe, expect, it } from 'vitest';
import { buildTimeline, ruleExplainers } from './guardActivity';

/*
 * The 27 Oct afternoon from a real account (anonymised): one losing trade that
 * completes a 1-loss streak, then two trades opened during the lock it caused.
 * The trader read "1 / 4" on the trade counter and asked why. The timeline has
 * to answer that on sight: trigger, lock, blocked, blocked.
 */
const NOW = Date.parse('2026-10-27T13:00:00Z');
const trades = [
  { tradeUid: 'a', symbol: 'P-BTC-79400-271026', side: 'buy', status: 'CLOSED', openedAt: '2026-10-27T10:04:49Z', closedAt: '2026-10-27T10:05:11Z', pnl: -0.768, metadata: {} },
  { tradeUid: 'b', symbol: 'P-BTC-79400-271026', side: 'buy', status: 'CLOSED', openedAt: '2026-10-27T10:06:06Z', closedAt: '2026-10-27T10:06:07Z', pnl: -0.1445, metadata: { blocked: true } },
  { tradeUid: 'c', symbol: 'P-BTC-79400-271026', side: 'buy', status: 'CLOSED', openedAt: '2026-10-27T10:08:21Z', closedAt: '2026-10-27T10:08:22Z', pnl: -0.302, metadata: { blocked: true } },
  { tradeUid: 'old', symbol: 'BTCUSD', side: 'sell', status: 'CLOSED', openedAt: '2026-10-25T05:00:00Z', closedAt: '2026-10-25T06:00:00Z', pnl: 1, metadata: {} },
];
const breaches = [
  { tradeUid: null, breachType: 'consecutive_losses_exceeded', createdAt: '2026-10-27T10:05:11.300Z', message: '1 losing trades in a row (limit: 1). Trading locked for 4h.', context: { tier: 'soft', threshold: 1, cooldownHours: 4, consecutiveLosses: 1 } },
  { tradeUid: 'b', breachType: 'risk_per_trade_exceeded', createdAt: '2026-10-27T10:06:07Z', context: { onBreach: 'close', lossPct: 1.37, thresholdPct: 1 } },
];

describe('buildTimeline', () => {
  const items = buildTimeline(trades, breaches, { now: NOW });

  it('keeps the last 24 hours only, newest first', () => {
    expect(items.some((i) => i.trade?.tradeUid === 'old')).toBe(false);
    expect(items.map((i) => (i.kind === 'lock' ? 'LOCK' : i.trade.tradeUid))).toEqual(['c', 'b', 'LOCK', 'a']);
  });

  it('explains each trade in a sentence, with the real numbers', () => {
    const a = items.find((i) => i.trade?.tradeUid === 'a');
    expect(a.status.key).toBe('triggered');
    expect(a.why).toBe('This was losing trade 1 in a row. Your limit is 1, so the account locked for 4h.');
    const b = items.find((i) => i.trade?.tradeUid === 'b');
    expect(b.status.key).toBe('blocked');
    expect(b.why).toMatch(/does not count as a trade/);
  });

  it('shows the lock as its own row', () => {
    const lock = items.find((i) => i.kind === 'lock');
    expect(lock.title).toBe('Locked for 4h — losing streak');
  });
});

describe('ruleExplainers', () => {
  // A real account's rules (anonymised), $16.68 balance.
  const bundle = {
    templates: [
      { slug: 'daily-loss', name: 'Daily Loss Protection' },
      { slug: 'close-after-losses', name: 'Close After N Losses' },
      { slug: 'risk-per-trade', name: 'Risk Per Trade' },
      { slug: 'max-trades-day', name: 'Max Trades Per Day' },
      { slug: 'max-total-loss', name: 'Max Drawdown Lock' },
    ],
    instances: [
      { templateSlug: 'daily-loss', enabled: true, config: { mode: 'amount', dailyLossAmount: 1.5, warningAmount: 1 } },
      { templateSlug: 'close-after-losses', enabled: true, config: { consecutiveLosses: 1, cooldownHours: 3, hardLossCount: 5, hardCooldownHours: 12 } },
      { templateSlug: 'risk-per-trade', enabled: true, config: { maxRiskPct: 15, onBreach: 'close' } },
      { templateSlug: 'max-trades-day', enabled: true, config: { maxTrades: 2 } },
      { templateSlug: 'max-total-loss', enabled: false, config: { maxDrawdownPct: 21 } },
    ],
  };
  const ex = ruleExplainers(bundle, { currency: 'USD', equity: 16.68, resetLabel: '05:30' });

  it('covers enabled rules only, by name', () => {
    expect(ex.map((e) => e.name)).toEqual(['Daily Loss Protection', 'Close After N Losses', 'Risk Per Trade', 'Max Trades Per Day']);
  });

  it('works the daily loss example in the account’s own limit', () => {
    const d = ex.find((e) => e.slug === 'daily-loss');
    expect(d.how).toMatch(/\$1\.50/);
    expect(d.how).toMatch(/warning first at \$1\.00/);
    expect(d.example).toMatch(/−\$0\.83.*−\$0\.75.*−\$1\.58, past \$1\.50/);
  });

  it('says plainly that a streak limit of 1 locks after any loss', () => {
    const c = ex.find((e) => e.slug === 'close-after-losses');
    expect(c.example).toMatch(/limit of 1 locks you after any losing trade/);
  });

  it('sizes the risk example from the real balance', () => {
    const r = ex.find((e) => e.slug === 'risk-per-trade');
    expect(r.example).toMatch(/\$16\.68, 15% is \$2\.50/);
  });

  it('never describes Max Drawdown as closing anything', () => {
    const only = ruleExplainers({ templates: [], instances: [{ templateSlug: 'max-total-loss', enabled: true, config: { maxDrawdownPct: 20 } }] });
    expect(only[0].how).toMatch(/alert only: it does not close anything or lock the account/);
  });
});
