import { describe, expect, it } from 'vitest';
import { achievements, buildDayCard, buildMonthCard, buildShareCards, buildTradeCard, buildWeekCard, chartGeometry, isMaterial, materialFloor, pickTrade, stripItems, tierFor, weekCalendar } from './shareBuild';
import { venueMark } from './shareCards';
import { dailyLossLimit, dayBuckets, guardClosures, isGuardClose, istDayKey, ruleChips, ruleLabels, ruleShort, weekdayShort } from './shareData';

/**
 * The share system's one job is to make a claim about a user's own trading
 * that the user can stand behind publicly. These tests are mostly about what
 * it must REFUSE to claim.
 */

const CLOSED = (over = {}) => ({
  tradeUid: 'u1',
  symbol: 'SOLUSD',
  side: 'long',
  status: 'CLOSED',
  quantity: 10,
  entryPrice: 100,
  exitPrice: 98,
  openedAt: '2026-09-30T04:00:00Z',
  closedAt: '2026-09-30T06:00:00Z',
  pnl: -218.4,
  ...over,
});

const BREACH = (over = {}) => ({
  id: 'b1',
  ruleSlug: 'daily-loss',
  breachType: 'daily_loss_exceeded',
  createdAt: '2026-09-30T06:00:10Z',
  message: 'Daily loss limit hit',
  ...over,
});

describe('day bucketing', () => {
  it('buckets on the IST day, not UTC', () => {
    // 19:30 UTC is 01:00 IST the NEXT day. An Indian trader's late session
    // belongs to the day they were sitting at the desk, which is the day
    // their daily loss limit was counting against.
    expect(istDayKey('2026-09-30T19:30:00Z')).toBe('2026-10-01');
    expect(istDayKey('2026-09-30T18:00:00Z')).toBe('2026-09-30');
  });

  it('sums each day and keeps them in order', () => {
    const b = dayBuckets([
      CLOSED({ tradeUid: 'a', closedAt: '2026-09-29T06:00:00Z', pnl: 100 }),
      CLOSED({ tradeUid: 'b', closedAt: '2026-09-30T06:00:00Z', pnl: -50 }),
      CLOSED({ tradeUid: 'c', closedAt: '2026-09-30T08:00:00Z', pnl: 20 }),
    ]);
    expect(b.map((d) => d.day)).toEqual(['2026-09-29', '2026-09-30']);
    expect(b[1].pnl).toBeCloseTo(-30, 6);
    expect(b[1].count).toBe(2);
  });

  it('ignores open trades entirely', () => {
    expect(dayBuckets([CLOSED({ status: 'OPEN', closedAt: null })])).toEqual([]);
  });

  it('names the weekday from the IST day, not the local clock', () => {
    expect(weekdayShort('2026-09-30')).toBe('WED');
  });
});

describe('matching a close to the rule that caused it', () => {
  it('credits a rule only when the close is within the window', () => {
    const t = CLOSED();
    expect(guardClosures([t], [BREACH()]).has('u1')).toBe(true);
    expect(guardClosures([t], [BREACH({ createdAt: '2026-09-30T06:10:00Z' })]).has('u1')).toBe(false);
  });

  it('picks the nearest breach when two are close', () => {
    const got = guardClosures([CLOSED()], [
      BREACH({ id: 'far', breachType: 'max_total_loss_exceeded', createdAt: '2026-09-30T06:01:30Z' }),
      BREACH({ id: 'near', breachType: 'daily_loss_exceeded', createdAt: '2026-09-30T06:00:05Z' }),
    ]);
    expect(got.get('u1').id).toBe('near');
  });

  it('credits nothing when there are no breaches', () => {
    expect(guardClosures([CLOSED()], []).size).toBe(0);
  });
});

describe('the trade card', () => {
  const trades = [CLOSED()];

  it('claims a saving only when one was priced', () => {
    const withIt = buildTradeCard({ trades, breaches: [BREACH()], counter: { saved: 921.8, low: -1140.2, tradeUid: 'u1' } });
    expect(withIt.saved).toBeCloseTo(921.8, 6);
    expect(withIt.heroSub).toContain('$921.80 avoided');
    expect(withIt.cap).toContain('Saved $921.80');

    // Same trade, same breach, no priced counterfactual: the card still says
    // the rule closed it, and says nothing about what it was worth.
    const without = buildTradeCard({ trades, breaches: [BREACH()], counter: null });
    expect(without.saved).toBeNull();
    expect(without.cap).not.toMatch(/saved/i);
    expect(without.pillText).not.toMatch(/instead of/);
  });

  it('does not credit a rule for a close the user made', () => {
    const c = buildTradeCard({ trades, breaches: [], counter: { saved: 500, low: -700, tradeUid: 'u1' } });
    expect(c.badge).not.toBe('Guard closed');
    expect(c.saved).toBeNull();
    expect(c.cap).not.toMatch(/saved/i);
  });

  it('names the rule that actually fired', () => {
    const c = buildTradeCard({ trades, breaches: [BREACH({ breachType: 'daily_target_reached' })], counter: { saved: 50, low: -10, tradeUid: 'u1' } });
    expect(c.label).toContain('daily target');
  });

  it('is unavailable on an account with no closed trades', () => {
    expect(buildTradeCard({ trades: [], breaches: [] }).available).toBe(false);
  });

  it('uses the account’s currency, not dollars', () => {
    const c = buildTradeCard({ trades, breaches: [], currency: 'INR' });
    // Shark settles in INR. A rupee figure rendered with a dollar sign is off
    // by roughly eighty to one on a card the user posts publicly.
    expect(c.pill).toContain('₹');
    expect(c.pill).not.toContain('$');
  });
});

describe('the day card', () => {
  const now = Date.parse('2026-09-30T10:00:00Z');

  it('is unavailable before the day has a closed trade', () => {
    expect(buildDayCard({ trades: [], breaches: [], now }).available).toBe(false);
  });

  it('reports the real day P&L', () => {
    const c = buildDayCard({
      trades: [CLOSED({ pnl: 120 }), CLOSED({ tradeUid: 'u2', closedAt: '2026-09-30T07:00:00Z', pnl: 80 })],
      breaches: [],
      now,
    });
    expect(c.pill).toBe('+$200.00');
    expect(c.meta).toContain('2 trades');
  });

  it('only compares against a guardless day when one was priced', () => {
    const c = buildDayCard({ trades: [CLOSED({ pnl: 120 })], breaches: [], now });
    expect(c.saved).toBeNull();
    expect(c.pillText).not.toMatch(/without the guard/);
  });
});

describe('the week card', () => {
  const week = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'].map((d, i) =>
    CLOSED({ tradeUid: `w${i}`, closedAt: `${d}T06:00:00Z`, pnl: [312.4, -218.6, 486.9, -219.8, 887.4][i] }),
  );

  it('needs more than one trading day', () => {
    expect(buildWeekCard({ trades: [CLOSED()], breaches: [] }).available).toBe(false);
  });

  it('gives one bar per trading day, in order', () => {
    const c = buildWeekCard({ trades: week, breaches: [] });
    expect(c.days.map((d) => d.d)).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    expect(c.pill).toBe('+$1,248.30');
  });

  it('puts a ghost only on a guarded day that was priced', () => {
    const breaches = [BREACH({ createdAt: '2026-09-29T06:00:05Z' })];
    const c = buildWeekCard({ trades: week, breaches, ghosts: { '2026-09-29': 921.6 } });
    const tue = c.days.find((d) => d.d === 'TUE');
    const wed = c.days.find((d) => d.d === 'WED');
    expect(tue.ghost).toBeCloseTo(-1140.2, 6);
    expect(wed.ghost).toBeUndefined();
  });

  it('ignores a ghost for a day the guard never touched', () => {
    // A saving on a day no rule fired is a number with nothing behind it.
    const c = buildWeekCard({ trades: week, breaches: [], ghosts: { '2026-09-29': 921.6 } });
    expect(c.days.every((d) => d.ghost === undefined)).toBe(true);
    expect(c.saved).toBeNull();
  });
});

describe('the month card', () => {
  const now = Date.parse('2026-09-30T10:00:00Z');
  const days = ['2026-09-10', '2026-09-20', '2026-09-30'].map((d, i) =>
    CLOSED({ tradeUid: `m${i}`, closedAt: `${d}T06:00:00Z`, pnl: 100 * (i + 1) }),
  );

  it('needs at least three trading days', () => {
    expect(buildMonthCard({ trades: days.slice(0, 2), breaches: [], now }).available).toBe(false);
    expect(buildMonthCard({ trades: days, breaches: [], now }).available).toBe(true);
  });

  it('counts only the current month', () => {
    const c = buildMonthCard({ trades: [...days, CLOSED({ tradeUid: 'aug', closedAt: '2026-08-15T06:00:00Z', pnl: 9999 })], breaches: [], now });
    expect(c.pill).toBe('+$600.00');
    expect(c.tab).toBe('September');
  });
});

describe('rule chips', () => {
  const bundle = {
    instances: [
      { templateSlug: 'daily-loss', enabled: true, config: { mode: 'amount', dailyLossAmount: 220 } },
      { templateSlug: 'daily-profit-target', enabled: true, config: { mode: 'amount', dailyTargetAmount: 400 } },
      { templateSlug: 'max-trades-day', enabled: true, config: { maxTrades: 6 } },
      { templateSlug: 'risk-per-trade', enabled: true, config: { maxRiskPct: 1 } },
      { templateSlug: 'stacking', enabled: true, config: { maxPositions: 2 } },
    ],
  };

  it('drops a risk figure that is plainly not a per-trade risk', () => {
    /*
     * "100% risk" on a card someone posts under their own name reads as "I
     * bet the account on every trade" — the exact opposite of what the card
     * is for. The rule form carries accountSize in the same config object,
     * and an instance saved before the percentage was filled in arrives with
     * that field sitting at 100.
     */
    const at100 = { instances: [{ templateSlug: 'risk-per-trade', enabled: true, config: { maxRiskPct: 100 } }] };
    expect(ruleChips(at100)).toHaveLength(0);
    expect(ruleLabels(at100)).toEqual([]);

    const real = { instances: [{ templateSlug: 'risk-per-trade', enabled: true, config: { maxRiskPct: 1 } }] };
    expect(ruleLabels(real)).toEqual(['1% risk']);
  });

  it('writes each chip in the form the card needs', () => {
    // The four the handoff specifies, from the user's own values.
    expect(ruleLabels(bundle)).toEqual(['−$220 max loss', '+$400 target', '6 trades/day', '1% risk']);
  });

  it('shows the user’s own rules, capped at four', () => {
    const chips = ruleChips(bundle);
    expect(chips).toHaveLength(4);
    expect(chips[0]).toMatchObject({ k: 'Max loss / day', v: '−$220' });
  });

  it('leaves off rules that are switched off', () => {
    const off = { instances: bundle.instances.map((r) => ({ ...r, enabled: false })) };
    expect(ruleChips(off)).toEqual([]);
  });

  it('renders amounts in the account’s currency', () => {
    expect(ruleChips(bundle, 'INR')[0].v).toBe('−₹220');
  });

  it('drops a rule whose config has not loaded', () => {
    expect(ruleChips({ instances: [{ templateSlug: 'daily-loss', enabled: true, config: {} }] })).toEqual([]);
  });
});

describe('the two rule shapes', () => {
  const bundle = {
    instances: [
      { templateSlug: 'daily-loss', enabled: true, config: { mode: 'amount', dailyLossAmount: 220 } },
      { templateSlug: 'max-trades-day', enabled: true, config: { maxTrades: 6 } },
    ],
  };

  it('gives the rail objects and the card strings', () => {
    // These are NOT interchangeable, and mixing them is not a type error in
    // JS — it renders "Objects are not valid as a React child" from inside a
    // <span> and takes the whole dashboard to the error boundary. Which it did.
    for (const c of ruleChips(bundle)) {
      expect(typeof c).toBe('object');
      expect(c).toHaveProperty('k');
      expect(c).toHaveProperty('v');
      expect(c).toHaveProperty('c');
    }
    for (const l of ruleLabels(bundle)) expect(typeof l).toBe('string');
  });

  it('writes a chip a person can read', () => {
    expect(ruleLabels(bundle)).toEqual(['\u2212$220 max loss', '6 trades/day']);
  });

  it('gives distinct strings, so they are safe as React keys', () => {
    // The card uses the chip text as its key. Duplicates there are the
    // "two children with the same key" warning.
    const labels = ruleLabels(bundle);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('returns an empty list, not a demo one, when no rules are on', () => {
    expect(ruleLabels({ instances: [] })).toEqual([]);
  });
});

describe('the daily loss limit the reel draws', () => {
  const amount = { instances: [{ templateSlug: 'daily-loss', enabled: true, config: { mode: 'amount', dailyLossAmount: 35000 } }] };

  it('reads the rule the user actually set', () => {
    expect(dailyLossLimit(amount)).toBe(35000);
  });

  it('writes it with separators on the chip', () => {
    // "−₹35000" is not a figure anyone reads at a glance.
    expect(ruleLabels(amount, 'INR')).toEqual(['\u2212\u20b935,000 max loss']);
  });

  it('has no line to draw for a percentage rule', () => {
    // A percent of equity is not a number on this chart's axis.
    expect(dailyLossLimit({ instances: [{ templateSlug: 'daily-loss', enabled: true, config: { mode: 'percent', dailyLossPct: 2 } }] })).toBeNull();
  });

  it('has no line to draw when the rule is off or absent', () => {
    expect(dailyLossLimit({ instances: [{ ...amount.instances[0], enabled: false }] })).toBeNull();
    expect(dailyLossLimit({ instances: [] })).toBeNull();
  });
});

describe('a counterfactual belongs to one trade', () => {
  it('refuses a saving priced for a different trade', () => {
    // The newest CLOSED trade and the newest GUARD-closed trade are often
    // different rows. Printing one's saving on the other's card is a real
    // number under a headline claiming it came from somewhere it did not.
    const c = buildTradeCard({
      trades: [CLOSED()],
      breaches: [BREACH()],
      counter: { saved: 921.8, low: -1140.2, tradeUid: 'some-other-trade' },
    });
    expect(c.saved).toBeNull();
    expect(c.cap).not.toMatch(/saved/i);
  });

  it('refuses a saving with no trade attached at all', () => {
    const c = buildTradeCard({ trades: [CLOSED()], breaches: [BREACH()], counter: { saved: 921.8, low: -1140.2 } });
    expect(c.saved).toBeNull();
  });
});

describe('the achievements row', () => {
  const now = Date.parse('2026-09-30T10:00:00Z');
  const LOCKED = [
    { name: '10-day green streak', tier: 'EPIC', gem: 'var(--surface-3)', locked: true },
    { name: 'Diamond discipline', tier: 'LEGENDARY', gem: 'var(--surface-3)', locked: true },
  ];
  const day = (d, pnl) => CLOSED({ tradeUid: `t${d}`, closedAt: `2026-09-${d}T06:00:00Z`, pnl });

  it('counts consecutive days that did not lose', () => {
    // These shipped as the fixed strings "6 of 10 days" and "38 of 90 days",
    // so every user saw the same fictional half-finished progress forever.
    const trades = [day(26, 100), day(27, -50), day(28, 10), day(29, 20), day(30, 30)];
    const { rows } = achievements({ cards: {}, trades, breaches: [], now, locked: LOCKED });
    expect(rows[0].note).toBe('3 of 10 days');
    expect(rows[0].pct).toBe('30%');
    expect(rows[0].locked).toBe(true);
  });

  it('breaks the streak on a losing day, however small', () => {
    const { rows } = achievements({ cards: {}, trades: [day(29, 500), day(30, -1)], breaches: [], now, locked: LOCKED });
    expect(rows[0].note).toBe('0 of 10 days');
  });

  it('unlocks at the target and stops counting past it', () => {
    const trades = Array.from({ length: 12 }, (_, i) => day(String(10 + i).padStart(2, '0'), 10));
    const { rows } = achievements({ cards: {}, trades, breaches: [], now, locked: LOCKED });
    expect(rows[0].locked).toBe(false);
    expect(rows[0].note).toBe('10 of 10 days');
    expect(rows[0].pct).toBe('100%');
  });

  it('counts discipline from the last breach', () => {
    const trades = [day(1, 10), day(30, 10)];
    const { rows } = achievements({
      cards: {}, trades, now, locked: LOCKED,
      breaches: [BREACH({ createdAt: '2026-09-20T06:00:00Z' })],
    });
    expect(rows[1].note).toBe('10 of 90 days, no breaks');
  });

  it('counts from the first trading day when nothing has ever broken', () => {
    // "No breaks" can only be claimed over a period we were actually watching.
    // A week-old account has a clean week, not a clean quarter.
    const { rows } = achievements({ cards: {}, trades: [day(25, 10), day(30, 10)], breaches: [], now, locked: LOCKED });
    expect(rows[1].note).toBe('5 of 90 days, no breaks');
  });

  it('is zero on an account with no trades at all', () => {
    const { rows, earned } = achievements({ cards: {}, trades: [], breaches: [], now, locked: LOCKED });
    expect(rows[0].note).toBe('0 of 10 days');
    expect(rows[1].note).toBe('0 of 90 days, no breaks');
    expect(earned).toBe(0);
  });

  it('counts a card you can make as an achievement earned', () => {
    const cards = { trade: { available: true }, day: { available: true }, week: { available: false }, month: { available: false } };
    const { earned, total } = achievements({ cards, trades: [day(30, 10)], breaches: [], now, locked: LOCKED });
    expect(earned).toBe(2);
    expect(total).toBe(6);
  });
});

describe('what counts as the guard closing a trade', () => {
  it('ignores the notification every close emits', () => {
    // `trade_closed` is written for EVERY closed trade at the instant it
    // closes. Matching on time alone credited every close to a rule, then
    // named the rule after the event — "My trade closed closed SOLUSDT at
    // +₹61,496.54" was a real caption this produced.
    expect(isGuardClose({ breachType: 'trade_closed' })).toBe(false);
    expect(isGuardClose({ breachType: 'trade_opened' })).toBe(false);
    const t = CLOSED();
    expect(guardClosures([t], [BREACH({ breachType: 'trade_closed' })]).size).toBe(0);
  });

  it('ignores a warning that preceded no action', () => {
    expect(isGuardClose({ breachType: 'daily_loss_warning' })).toBe(false);
  });

  it('ignores system events', () => {
    for (const t of ['protection_disconnected', 'enforcement_unavailable', 'kill_switch_incomplete']) {
      expect(isGuardClose({ breachType: t }), t).toBe(false);
    }
  });

  it('ignores rules that block an order rather than close a position', () => {
    // A trade cap stops the next order. It never closes the one already
    // running, so a close is not its to claim.
    for (const t of ['max_trades_day_exceeded', 'risk_per_trade_exceeded', 'trade_blocked_cooldown', 'missing_stop_loss']) {
      expect(isGuardClose({ breachType: t }), t).toBe(false);
    }
  });

  it('accepts the four that flatten a position', () => {
    for (const t of ['daily_loss_exceeded', 'daily_target_reached', 'max_total_loss_exceeded', 'consecutive_losses_exceeded']) {
      expect(isGuardClose({ breachType: t }), t).toBe(true);
    }
  });

  it('names the rule from the breach type, which is never null', () => {
    expect(ruleShort({ breachType: 'daily_target_reached' })).toBe('Daily target');
    expect(ruleShort({ breachType: 'daily_loss_exceeded', ruleSlug: null })).toBe('Loss limit');
  });

  it('reads as English in the caption it builds', () => {
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: 61496.54 })],
      breaches: [BREACH({ breachType: 'daily_target_reached' })],
      currency: 'INR',
    });
    expect(c.cap).toMatch(/^My daily target /);
    expect(c.cap).toContain('SOLUSD');
    expect(c.cap).not.toMatch(/closed closed/);
    expect(c.label).toBe('Locked in by my daily target');
  });
});

describe('which trades are worth a card at all', () => {
  it('refuses a trade that made nothing and broke no rule', () => {
    // "Green trade · ₹0.00 banked · RARE" was a real card this produced. It is
    // the feature arguing against itself: if a trade that made nothing earns a
    // badge, the badge means nothing on the trades that did.
    expect(isMaterial(CLOSED({ pnl: 0 }), 0)).toBe(false);
    const c = buildTradeCard({ trades: [CLOSED({ pnl: 0 })], breaches: [] });
    expect(c.available).toBe(false);
    expect(c.reason).toBe('immaterial');
  });

  it('keeps a trade the guard closed however small it was', () => {
    // The story is that a rule acted. The figure is secondary.
    const c = buildTradeCard({ trades: [CLOSED({ pnl: 0 })], breaches: [BREACH()] });
    expect(c.available).toBe(true);
  });

  it('judges size against the position, not an absolute figure', () => {
    // 0.1% of notional means the same thing on a ₹5,000 account and a ₹5,00,000
    // one. entry 100 x qty 10 = 1,000 notional, so ₹1 is the threshold.
    expect(isMaterial(CLOSED(), 2)).toBe(true);
    expect(isMaterial(CLOSED(), 0.4)).toBe(false);
  });

  it('shows the newest trade worth showing, not merely the newest', () => {
    // An account whose last fill made nothing still has a good trade behind it.
    const trades = [
      CLOSED({ tradeUid: 'dud', closedAt: '2026-10-01T06:00:00Z', pnl: 0 }),
      CLOSED({ tradeUid: 'good', closedAt: '2026-09-30T06:00:00Z', pnl: 61496.54 }),
    ];
    expect(buildTradeCard({ trades, breaches: [] }).tradeUid).toBe('good');
  });

  it('honours a trade the user named, even a poor one', () => {
    // They clicked that row. Quietly showing a different trade is worse than
    // showing a weak card.
    const trades = [CLOSED({ tradeUid: 'dud', pnl: 0 }), CLOSED({ tradeUid: 'good', closedAt: '2026-09-29T06:00:00Z', pnl: 5000 })];
    const c = buildTradeCard({ trades, breaches: [], tradeUid: 'dud' });
    expect(c.available).toBe(false);
    expect(c.reason).toBe('immaterial');
  });
});

describe('tiers are earned', () => {
  it('ranks by what actually happened', () => {
    expect(tierFor({ guarded: true, saved: 900, green: false })).toBe('EPIC');
    expect(tierFor({ guarded: true, saved: 0, green: false })).toBe('RARE');
  });

  it('gives no tier at all to a trade the user closed themselves', () => {
    // A rarity chip on an ordinary close devalues the chip on a card where a
    // rule actually did something. Closing green is not rare.
    expect(tierFor({ guarded: false, saved: 0, green: true })).toBeNull();
    expect(tierFor({ guarded: false, saved: 0, green: false })).toBeNull();
  });

  it('does not hand every trade the same badge', () => {
    // Every trade card was RARE, which makes the badge decoration.
    const guarded = buildTradeCard({ trades: [CLOSED({ pnl: -218.4 })], breaches: [BREACH()], counter: { saved: 921.8, low: -1140.2, tradeUid: 'u1' } });
    const plain = buildTradeCard({ trades: [CLOSED({ pnl: -218.4 })], breaches: [] });
    expect(guarded.tier).toBe('EPIC');
    expect(plain.tier).toBeNull();
    expect(plain.badge).toBe('Closed');
  });

  it('calls a manual green close exactly that, with nothing added', () => {
    const c = buildTradeCard({ trades: [CLOSED({ pnl: 1200 })], breaches: [] });
    expect(c.badge).toBe('Closed green');
    expect(c.tier).toBeNull();
  });
});

describe('two different prices never render as one', () => {
  /*
   * Four decimal places were hard-coded. On XRP at 1.07 that is a resolution
   * of 0.01%, so a two-hour position that round-tripped and lost $49.98 to
   * fees and funding printed "Entry 1.0684 / Exit 1.0684" beside "−$49.98" —
   * three true figures arranged to look like a bug, on the thing the user
   * posts under their own name.
   */
  const facts = (c) => Object.fromEntries((c.facts ?? []).map((f) => [f.k, f.v]));

  it('widens until a near-flat trade shows its real exit', () => {
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: -49.98, entryPrice: 1.06841, exitPrice: 1.06838 })],
      breaches: [],
      dailyLoss: 200,
    });
    const f = facts(c);
    expect(f.Entry).not.toBe(f.Exit);
    expect(f.Entry).toBe('1.06841');
    expect(f.Exit).toBe('1.06838');
  });

  it('leaves an ordinary pair at four places', () => {
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: -333.8, entryPrice: 0.5412, exitPrice: 0.5488 })],
      breaches: [],
      dailyLoss: 200,
    });
    const f = facts(c);
    expect(f.Entry).toBe('0.5412');
    expect(f.Exit).toBe('0.5488');
  });

  it('stops at eight places when the two really are equal', () => {
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: -49.98, entryPrice: 1.0684, exitPrice: 1.0684 })],
      breaches: [],
      dailyLoss: 200,
    });
    const f = facts(c);
    expect(f.Entry).toBe('1.0684');
    expect(f.Exit).toBe('1.0684');
  });
});

describe('the after-path is a claim, not a decoration', () => {
  /*
   * The red dashed tail and the red wedge under it say one thing: "the price
   * kept going and I was not in it". That is only true where something CLOSED
   * the position for the user. On a trade they closed themselves in profit it
   * read as a rescue from a move they chose to walk away from — next to an
   * "If I'd held" tile quoting a figure the card had no business quoting.
   */
  const PATHS = { P: [0, 200, 61496], A: [61496, 30000, -5610], worstAfter: -5610, endAfter: -5610 };

  it('draws it on the card whose headline IS the saving', () => {
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: -218.4 })],
      breaches: [BREACH()],
      counter: { saved: 921.8, low: -1140.2, tradeUid: 'u1', paths: PATHS },
    });
    expect(c.type).toBe('saved');
    expect(c.chart.tail).toBeTruthy();
    expect(c.chart.gap).toBeTruthy();
    expect(c.tiles.map((t) => t.k)).toEqual(['Mine', 'If I\u2019d held']);
  });

  it('draws the trade’s own curve and nothing else on a manual close', () => {
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: 1200 })],
      breaches: [],
      counter: { tradeUid: 'u1', paths: PATHS },
      rulesKept: 4,
    });
    expect(c.type).toBe('plain');
    expect(c.chart).toBeTruthy();
    expect(c.chart.tail).toBeNull();
    expect(c.chart.gap).toBeNull();
    expect(c.tiles.map((t) => t.k)).toEqual(['Banked', 'Held for', 'Rules kept']);
    expect(c.tiles[2].v).toBe('4');
  });

  it('drops it on a guard close with no saving worth the headline', () => {
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: -5000 })],
      breaches: [BREACH()],
      counter: { tradeUid: 'u1', paths: PATHS },
      dailyLoss: 35000,
      rulesKept: 3,
    });
    expect(c.type).toBe('guard');
    expect(c.chart.tail).toBeNull();
    expect(c.tiles.map((t) => t.k)).toEqual(['Taken', 'Held for', 'Rules kept']);
  });

  it('leaves the rules tile off rather than printing a zero', () => {
    const c = buildTradeCard({ trades: [CLOSED({ pnl: 1200 })], breaches: [] });
    expect(c.tiles.map((t) => t.k)).toEqual(['Banked', 'Held for']);
  });
});

describe('the headline is not always the saving', () => {
  const RULES = { dailyLoss: 35000 };

  it('refuses to lead with a saving that is not worth leading with', () => {
    // "SAVED BY MY LOSS LIMIT · ₹17.03" as a large mint figure, on a trade the
    // user had just lost ₹5.97 on. Two things wrong at once: the number they
    // recognise as what happened was not the headline, and a losing trade was
    // dressed entirely in green.
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: -5.97 })],
      breaches: [BREACH()],
      currency: 'INR',
      counter: { saved: 17.03, low: -23, tradeUid: 'u1' },
      ...RULES,
    });
    expect(c.saved).toBeNull();
    expect(c.label).toBe('Stopped by my loss limit');
    expect(c.hero).toContain('5');
    expect(c.cap).not.toMatch(/saved/i);
  });

  it('tells the saving story, under a figure the user can check', () => {
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: -218.4 })],
      breaches: [BREACH()],
      counter: { saved: 921.8, low: -1140.2, tradeUid: 'u1' },
      ...RULES,
    });
    expect(c.saved).toBeCloseTo(921.8, 6);
    expect(c.label).toBe('Saved by my loss limit');
    // The trade LOST $218.40. The card says so, in red, and the saving is
    // the line underneath.
    expect(c.hero).toBe('$218');
    expect(c.tone).toBe('red');
    expect(c.heroSub).toContain('$921.80 avoided');
  });

  it('never puts a modelled number where the real one goes', () => {
    /*
     * The hero used to be the SAVING, which is realised P&L minus the worst
     * point the price reached after the close — a figure nobody can check
     * against anything. On a trade that banked ₹61,496.54 the card led with
     * ₹72,716.96, and the only possible reaction to that is "where did 72
     * come from?". Which was the reaction. Twice.
     */
    const c = buildTradeCard({
      trades: [CLOSED({ pnl: 61496.54 })],
      breaches: [BREACH({ breachType: 'daily_target_reached' })],
      currency: 'INR',
      counter: { saved: 72716.96, low: -11220.42, tradeUid: 'u1' },
      dailyLoss: 35000,
    });
    expect(`${c.hero}${c.dec}`).toBe('₹61,496.54');
    expect(c.hero).not.toContain('72');
    expect(c.heroNote).toBe('banked');
    expect(c.tone).toBe('mint');
    // Still told, just not as the headline.
    expect(c.heroSub).toContain('₹72,716.96 avoided');
  });

  it('never paints a losing trade green', () => {
    // The colour is the first thing read, and it was saying the opposite of
    // the truth on every red card.
    const stopped = buildTradeCard({ trades: [CLOSED({ pnl: -5000 })], breaches: [BREACH()], ...RULES });
    const taken = buildTradeCard({ trades: [CLOSED({ pnl: -5000 })], breaches: [], ...RULES });
    expect(stopped.tone).toBe('red');
    expect(taken.tone).toBe('red');
  });

  it('paints a winning trade green either way', () => {
    const locked = buildTradeCard({ trades: [CLOSED({ pnl: 61496 })], breaches: [BREACH()], ...RULES });
    const banked = buildTradeCard({ trades: [CLOSED({ pnl: 61496 })], breaches: [], ...RULES });
    expect(locked.tone).toBe('mint');
    expect(banked.tone).toBe('mint');
    expect(locked.label).toContain('Locked in');
    expect(banked.label).toContain('Banked');
  });
});

describe('what "worth a card" is measured against', () => {
  it('uses the user’s own day of risk, which is in the right currency', () => {
    // A position's notional is quoted in the QUOTE asset, so on Shark
    // comparing a rupee P&L against it is the same currency-mixing that
    // reported a trade as +209.55%. Rule amounts are in the settling currency.
    expect(materialFloor({ dailyLoss: 35000 })).toBe(700);
    expect(materialFloor({ dailyTarget: 50000 })).toBe(1000);
    expect(materialFloor({})).toBeNull();
  });

  it('prefers the loss limit when both are set', () => {
    expect(materialFloor({ dailyLoss: 35000, dailyTarget: 50000 })).toBe(700);
  });

  it('judges a figure against that floor, not against the notional', () => {
    expect(isMaterial(CLOSED(), 17.03, 700)).toBe(false);
    expect(isMaterial(CLOSED(), 61496, 700)).toBe(true);
  });

  it('falls back to the notional when no rule gives a floor', () => {
    // Correct wherever the quote asset and the settling asset are the same
    // thing, which is every venue except Shark.
    expect(isMaterial(CLOSED(), 2, null)).toBe(true);
    expect(isMaterial(CLOSED(), 0.4, null)).toBe(false);
  });
});

describe('the card draws the trade it is about', () => {
  // The chart was a fixed polyline from the handoff — the same descending line
  // on every card, so a winning trade got a falling green line and the picture
  // contradicted the number above it.
  const WIN = { P: [0, 200, 150, 600, 61496], A: [61496, 30000, 5000, -5610] };

  it('rises for a winning trade and falls for a losing one', () => {
    expect(chartGeometry(WIN).rising).toBe(true);
    expect(chartGeometry({ P: [0, -50, -218], A: [-218, -800, -1140] }).rising).toBe(false);
  });

  it('shades the gap between where it closed and where it went', () => {
    // The hero figure is "what the rule was worth" and it had no picture at
    // all. This wedge IS that number.
    const g = chartGeometry(WIN);
    expect(g.gap).toBeTruthy();
    expect(g.tail).toBeTruthy();
    expect(g.closeX).toBeGreaterThan(0);
    expect(g.closeX).toBeLessThan(g.w);
  });

  it('puts the close marker where the path ends, not at a fixed point', () => {
    const short = chartGeometry({ P: [0, 10], A: [10, 5, 0, -5, -10, -20] });
    const long = chartGeometry({ P: [0, 1, 2, 3, 4, 5, 10], A: [10, -10] });
    expect(short.closeX).toBeLessThan(long.closeX);
  });

  it('keeps every point inside the frame', () => {
    const g = chartGeometry(WIN);
    const ys = `${g.line} ${g.tail}`.split(' ').map((p) => Number(p.split(',')[1]));
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(g.h);
    }
  });

  it('always has an entry line to label, wherever the path went', () => {
    // It used to be drawn only when the path crossed break-even, so on a
    // trade that only ever went one way the single most useful reference
    // line on the chart was missing — and when it did appear, nothing said
    // what it was.
    const win = chartGeometry(WIN);
    expect(win.zeroY).not.toBeNull();
    expect(win.zeroPct).toBeGreaterThan(0);

    // A path that never went negative: entry sits on the floor of the frame.
    const up = chartGeometry({ P: [10, 20, 30], A: [30, 40] });
    expect(up.zeroY).toBeCloseTo(up.h - up.h * 0.14, 5);
    // ...and one that never went positive: entry sits at the top.
    const down = chartGeometry({ P: [-10, -20, -30], A: [-30, -40] });
    expect(down.zeroY).toBeCloseTo(down.h * 0.14, 5);
  });

  it('is 3:1, so the shape of the curve is not a function of the card', () => {
    // The panel used to take whatever height the card had left over, with the
    // path stretched into it — so a 9:16 Story turned a 2% drawdown into a
    // cliff. The geometry is the same box at every size now.
    const g = chartGeometry(WIN);
    expect(g.w / g.h).toBe(3);
  });

  it('gives the markers percentages, not user units', () => {
    // The SVG is stretched to the panel, so a circle drawn in it comes out an
    // ellipse. The dots are HTML now and need where, not how big.
    const g = chartGeometry(WIN);
    const ids = g.dots.map((d) => d.id);
    expect(ids).toEqual(['entry', 'exit', 'held']);
    for (const d of g.dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(100);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeLessThanOrEqual(100);
    }
    // The exit dot is the end of the drawn path, to the pixel.
    const [lastX, lastY] = g.line.split(' ').pop().split(',').map(Number);
    expect(g.dots[1].x).toBeCloseTo((lastX / g.w) * 100, 1);
    expect(g.dots[1].y).toBeCloseTo((lastY / g.h) * 100, 1);
  });

  it('joins the after-path to the exit with no vertical jump', () => {
    // A[0] must BE P[last]. A gap there puts a step in the line at precisely
    // the moment the card makes its claim.
    const g = chartGeometry(WIN);
    const pEnd = g.line.split(' ').pop();
    const aStart = g.tail.split(' ')[0];
    expect(aStart).toBe(pEnd);
  });

  it('has no after-path at all when A is not given', () => {
    // Non-guard cards pass the paths through with A stripped: the red tail is
    // a claim about a move the user was closed out of, and there is no such
    // claim on a trade they closed themselves.
    const g = chartGeometry({ ...WIN, A: null });
    expect(g.tail).toBeNull();
    expect(g.gap).toBeNull();
    expect(g.dots.map((d) => d.id)).toEqual(['entry', 'exit']);
  });

  it('draws nothing rather than something decorative', () => {
    // A card with no priced counterfactual has no path to show.
    expect(chartGeometry(null)).toBeNull();
    expect(chartGeometry({ P: [5] })).toBeNull();
  });

  it('survives a flat path without dividing by zero', () => {
    const g = chartGeometry({ P: [0, 0, 0], A: [0, 0] });
    expect(Number.isFinite(g.closeY)).toBe(true);
  });
});

describe('the venue on the card', () => {
  it('names the venue the trade actually happened on', () => {
    // It was hard-coded to Delta — logo, orange dot and all — so a Shark
    // account's card told the world the trade happened somewhere it did not.
    // On something the user posts under their own name that is not a styling
    // slip, it is a false statement about their own trading.
    expect(venueMark('shark').name).toBe('Shark');
    expect(venueMark('coindcx').name).toBe('CoinDCX');
    expect(venueMark('delta_india').name).toBe('Delta Exchange');
  });

  it('gives each venue its own colour, not ours', () => {
    const bgs = ['shark', 'coindcx', 'delta_india'].map((v) => venueMark(v).bg);
    expect(new Set(bgs).size).toBe(3);
  });

  it('still names an unmapped venue correctly', () => {
    // Only the styling falls back. Getting the NAME wrong is the thing that
    // matters, so it is derived rather than defaulted.
    expect(venueMark('bybit').name).toBe('Bybit');
    expect(venueMark('some_new_venue').name).toBe('Some New Venue');
  });

  it('shows nothing rather than a guess when the account has no venue', () => {
    expect(venueMark(null)).toBeNull();
  });

  it('is carried by the card the account is on', () => {
    const c = buildTradeCard({ trades: [CLOSED({ pnl: 61496 })], breaches: [], venue: 'shark', dailyLoss: 35000 });
    expect(c.venue.name).toBe('Shark');
  });
});

describe('the chart keeps clear of its frame', () => {
  it('insets every point, so a 3px stroke and a 7px marker are not clipped', () => {
    // The panel clips what overflows it. A path starting at x=0 and peaking at
    // y=0 loses half its stroke to the frame — which is what "cropped" was.
    const g = chartGeometry({ P: [0, 100, 50, 200], A: [200, 0, -100] });
    const xs = `${g.line} ${g.tail}`.split(' ').map((p) => Number(p.split(',')[0]));
    const ys = `${g.line} ${g.tail}`.split(' ').map((p) => Number(p.split(',')[1]));
    expect(Math.min(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(g.w);
    expect(Math.min(...ys)).toBeGreaterThan(0);
    expect(Math.max(...ys)).toBeLessThan(g.h);
  });

  it('leaves room for the marker at the close', () => {
    const g = chartGeometry({ P: [0, 200], A: [200, -100] });
    expect(g.closeY).toBeGreaterThan(7);
    expect(g.h - g.closeY).toBeGreaterThan(7);
  });
});

describe('the trade the hook prices is the trade the card shows', () => {
  // The hook resolved "the one asked for, or the newest CLOSED" and passed
  // that down as an explicit request — which overrode the card's own "newest
  // worth showing" rule. On an account whose last fill made ₹0.00 the trade
  // card vanished and the Overview strip showed one card where it should have
  // shown two.
  const trades = [
    CLOSED({ tradeUid: 'dud', closedAt: '2026-10-01T17:38:00Z', pnl: 0 }),
    CLOSED({ tradeUid: 'good', closedAt: '2026-09-30T12:33:00Z', pnl: 61496.54 }),
  ];

  it('skips a worthless newest fill', () => {
    expect(pickTrade({ trades, breaches: [], floor: 700 }).tradeUid).toBe('good');
  });

  it('honours an explicit request, worthless or not', () => {
    expect(pickTrade({ trades, breaches: [], tradeUid: 'dud', floor: 700 }).tradeUid).toBe('dud');
  });

  it('agrees with the card built from the same inputs', () => {
    const picked = pickTrade({ trades, breaches: [], floor: 700 });
    const card = buildTradeCard({ trades, breaches: [], dailyLoss: 35000 });
    expect(card.tradeUid).toBe(picked.tradeUid);
    expect(card.available).toBe(true);
  });

  it('keeps a guard-closed trade however small', () => {
    const b = [BREACH({ createdAt: '2026-10-01T17:38:05Z' })];
    expect(pickTrade({ trades, breaches: b, floor: 700 }).tradeUid).toBe('dud');
  });
});

describe('the strip says what it is showing', () => {
  const trades = [
    CLOSED({ tradeUid: 'dud', closedAt: '2026-10-01T17:38:00Z', pnl: 0 }),
    CLOSED({ tradeUid: 'good', closedAt: '2026-09-30T12:33:00Z', pnl: 61496.54 }),
  ];
  const VIS = [{ kind: 'trade', k: 'Last trade', accent: '#3ff0c8' }];
  const build = (counter) => stripItems(
    buildShareCards({ trades, breaches: [BREACH({ breachType: 'daily_target_reached', createdAt: '2026-09-30T12:33:05Z' })], currency: 'INR', dailyLoss: 35000, counter }),
    { currency: 'INR', visuals: VIS },
  )[0];

  it('does not call a different day’s trade "last trade"', () => {
    // The card shows the newest trade WORTH showing. On an account whose last
    // fill was break-even, "LAST TRADE" over a different day's result had the
    // user reading ₹67,000 of profit into a flat trade.
    const it0 = build({ saved: 67106.75, low: -5610.21, tradeUid: 'good' });
    expect(it0.k).not.toMatch(/^Last trade/);
    expect(it0.k).toContain('30 Sep');
  });

  it('leads with what the account did, not the counterfactual', () => {
    // "₹67,106.75 saved" at 26px reads as "I made ₹67,106.75".
    const it0 = build({ saved: 67106.75, low: -5610.21, tradeUid: 'good' });
    expect(it0.v).toBe('+₹61,496.54');
    expect(it0.vLabel).toBe('banked');
    expect(it0.note).toContain('saved ₹67,106.75 more');
  });

  it('names the rule that did the saving', () => {
    expect(build({ saved: 67106.75, low: -5610.21, tradeUid: 'good' }).note).toContain('daily target');
  });

  it('says plainly when no rule acted', () => {
    const plainCard = stripItems(
      buildShareCards({ trades, breaches: [], currency: 'INR', dailyLoss: 35000 }),
      { currency: 'INR', visuals: VIS },
    )[0];
    expect(plainCard.k).toMatch(/^Recent trade/);
    expect(plainCard.note).not.toMatch(/saved/);
  });
});

describe('the week is a calendar, not a chart', () => {
  // A line or a bar chart has to pick one scale for the whole week, and a real
  // week does not cooperate: one day of ₹61,496 beside four of a few rupees
  // gives one block and four invisible slivers, whichever shape you draw.
  const days = [
    { d: 'MON', key: 'a', v: 312.4 },
    { d: 'TUE', key: 'b', v: -5.97, ghost: -23 },
    { d: 'WED', key: 'c', v: 61496.54 },
    { d: 'THU', key: 'd', v: -0.53 },
    { d: 'FRI', key: 'e', v: 0 },
  ];

  it('gives every day a tile, whatever it did', () => {
    expect(weekCalendar(days, 'INR')).toHaveLength(5);
  });

  it('keeps a quiet day legible beside one that made the week', () => {
    // This is the whole reason for the change: on a bar chart ₹0.53 against
    // ₹61,496 is sub-pixel.
    const c = weekCalendar(days, 'INR');
    expect(c[3].text).toBe('−₹1');
    expect(c[2].text).toBe('+₹61k');
  });

  it('shortens a figure to fit the cell', () => {
    const c = weekCalendar([{ d: 'A', key: 'a', v: 1500 }, { d: 'B', key: 'b', v: 250000 }], 'INR');
    expect(c[0].text).toBe('+₹1.5k');
    expect(c[1].text).toBe('+₹2.5L');
  });

  it('uses depth of colour for size, not height', () => {
    const c = weekCalendar(days, 'INR');
    expect(c[2].heat).toBeGreaterThan(c[0].heat);
    // Square root, not a linear share, or the quiet days of a lopsided week
    // all come out black.
    expect(c[0].heat).toBeGreaterThan(312.4 / 61496.54);
  });

  it('marks a flat day as flat rather than green', () => {
    expect(weekCalendar(days, 'INR')[4].flat).toBe(true);
  });

  it('flags the days a rule stepped in', () => {
    const c = weekCalendar(days, 'INR');
    expect(c[1].guarded).toBe(true);
    expect(c[0].guarded).toBe(false);
  });

  it('refuses a week with one day', () => {
    expect(weekCalendar([{ d: 'MON', key: 'a', v: 10 }])).toBeNull();
    expect(weekCalendar(null)).toBeNull();
  });
});

describe('the week strip counts days', () => {
  // The handoff's own framing, and the right one: a week's story is how many
  // days held, not a rupee total — and a total is what made "₹67,123.78 saved"
  // read as profit.
  const days = [
    { d: 'MON', key: 'a', v: 312 },
    { d: 'TUE', key: 'b', v: -6, ghost: -1140 },
    { d: 'WED', key: 'c', v: 486 },
    { d: 'THU', key: 'd', v: -1, ghost: -900 },
    { d: 'FRI', key: 'e', v: 61496 },
  ];
  const trades = days.map((d, i) => CLOSED({ tradeUid: `t${i}`, closedAt: `2026-09-2${i + 3}T06:00:00Z`, pnl: d.v }));
  const item = () => stripItems(
    { week: { ...buildWeekCard({ trades, breaches: [], currency: 'INR' }), guarded: 2, upDays: 3 } },
    { currency: 'INR', visuals: [{ kind: 'week', k: 'This week', accent: '#c4b0ff' }] },
  )[0];

  it('leads with the count, not the money', () => {
    const i = item();
    expect(i.v).toBe('3');
    expect(i.vLabel).toBe('green days of 5');
  });

  it('says what the rules did underneath', () => {
    expect(item().note).toContain('2 days stopped by your rules');
  });

  it('a count cannot be misread as profit', () => {
    expect(item().v).not.toMatch(/[₹$]/);
  });
});

describe('the strip draws the same days the card does', () => {
  // Height-encoded bars were tried twice in this spot and failed the same way
  // both times: one day of ₹61,496 beside three of a few rupees leaves every
  // other day a single pixel, whichever scale you pick.
  const days = [
    { d: 'MON', key: 'a', v: 312 },
    { d: 'TUE', key: 'b', v: -6, ghost: -1140 },
    { d: 'WED', key: 'c', v: 61496 },
    { d: 'THU', key: 'd', v: -1 },
  ];
  const card = { ...buildWeekCard({ trades: days.map((d, i) => CLOSED({ tradeUid: `t${i}`, closedAt: `2026-09-2${i + 4}T06:00:00Z`, pnl: d.v })), breaches: [], currency: 'INR' }), guarded: 1, upDays: 2 };

  it('hands the strip day tiles, not a series of heights', () => {
    const [item] = stripItems({ week: card }, { currency: 'INR', visuals: [{ kind: 'week', k: 'This week', accent: '#c4b0ff' }] });
    expect(item.series).toHaveLength(4);
    expect(item.series[0]).toHaveProperty('heat');
    expect(item.series[0]).toHaveProperty('text');
    expect(item.series[0]).not.toHaveProperty('h');
  });

  it('keeps a quiet day as present as a loud one', () => {
    const [item] = stripItems({ week: card }, { currency: 'INR', visuals: [{ kind: 'week', k: 'This week', accent: '#c4b0ff' }] });
    // Every tile is the same size; only the colour differs. A day too small to
    // tint is marked `flat` and renders neutral grey — still a day, still
    // there, which is the whole point of dropping height encoding.
    expect(item.series.every((d) => d.heat > 0 || d.flat)).toBe(true);
    expect(Math.max(...item.series.map((d) => d.heat))).toBeLessThanOrEqual(1);
  });
});

describe('a card works for an ordinary trade too', () => {
  // The whole composition hung off the counterfactual chart, which only exists
  // when a rule fired AND the price history calibrates. Most trades are
  // ordinary, so most cards were a large empty panel with one grey line in it.
  it('gives a self-closed trade its own facts to show', () => {
    const c = buildTradeCard({ trades: [CLOSED({ pnl: -333.8, entryPrice: 0.5412, exitPrice: 0.5488 })], breaches: [], dailyLoss: 200 });
    expect(c.available).toBe(true);
    expect(c.facts.map((f) => f.k)).toEqual(['Entry', 'Exit', 'Held']);
    expect(c.facts[0].v).toBe('0.5412');
    expect(c.facts[1].v).toBe('0.5488');
  });

  it('says "—" rather than "0" for a price the venue never sent', () => {
    // Shark reports no exit price at all.
    const c = buildTradeCard({ trades: [CLOSED({ pnl: -333.8, exitPrice: null })], breaches: [], dailyLoss: 200 });
    expect(c.facts[1].v).toBe('—');
  });
});

describe('rule chips read as English', () => {
  it('does not write "1 trades/day"', () => {
    // The sort of thing a reader trusts a product less for.
    const one = { instances: [{ templateSlug: 'max-trades-day', enabled: true, config: { maxTrades: 1 } }] };
    const many = { instances: [{ templateSlug: 'max-trades-day', enabled: true, config: { maxTrades: 6 } }] };
    expect(ruleLabels(one)).toEqual(['1 trade/day']);
    expect(ruleLabels(many)).toEqual(['6 trades/day']);
  });
});
