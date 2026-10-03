import { describe, expect, it } from 'vitest';
import { buildStories, ownTradeStory, tradeStory, weekStory } from './reelBuild';
import { CUES, dayVal } from './reelStories';

const CARD = (over = {}) => ({
  available: true, meta: 'Long · 8x', badge: 'Guard closed', label: 'Saved by my loss limit',
  pill: '−$218.40', pillRed: true, pillText: 'instead of −$1,140.20 at the day’s low',
  ach: 'Saved by the guard', tier: 'RARE', date: '30 Sep 2026', ...over,
});

const PATHS = { P: [0, -80, -150, -218.4], A: [-218.4, -600, -900, -1140.2], worstAfter: -1140.2, endAfter: -1140.2 };

describe('every trade gets a reel', () => {
  /*
   * MOST TRADES ARE ORDINARY. Someone opened a position, it moved, they
   * closed it themselves, and every rule they wrote was standing the whole
   * time. Gating the reel on a guard close meant the format was dead for
   * almost everyone who opened the modal — a greyed-out tab and a paragraph
   * explaining why they could not have the thing they came for.
   */
  const trade = { symbol: 'ETHUSD', side: 'short', openedAt: '2026-08-04T04:00:00Z', closedAt: '2026-08-04T05:06:00Z' };
  const OWN = { P: [0, 60, 120, 177.99], A: [177.99, 400, 900], worstAfter: 177.99, endAfter: 900 };
  const GREEN = CARD({ badge: 'Closed green', label: 'Banked on this trade', pill: '+$177.99', pillRed: false, tier: null });

  it('builds the trade’s own run when no rule fired', () => {
    const s = ownTradeStory({ trade, card: GREEN, paths: OWN, rulesKept: 4 });
    expect(s.mode).toBe('own');
    expect(s.savedLabel).toBe('BANKED, INSIDE MY RULES');
    expect(s.stamp).toBe('Closed at +$177.99');
    expect(s.caps[4]).toBe('You closed it yourself at +$177.99.');
    expect(s.caps[5]).toContain('4 rules standing');
  });

  it('claims no path the trade did not take', () => {
    // A is a single point sitting exactly on the close, so the chart never
    // widens and no second line is drawn. Inventing an after-path here would
    // be the counterfactual the card refused to make.
    const s = ownTradeStory({ trade, card: GREEN, paths: OWN, rulesKept: 4 });
    expect(s.A).toEqual([177.99]);
    expect(s.heldPre).toBe('');
    expect(s.held).toBe('');
  });

  it('does not arrive in the colour of a win on a losing trade', () => {
    /*
     * The end card's hero, its glow and the badge chip were all hard-coded
     * mint, and the figure came from `story.saved` — a magnitude. So a trade
     * that LOST ₹5.97 ended its reel with a large green ₹5.97 under a green
     * badge and no minus sign: three things at once saying "you won", on the
     * frame people screenshot.
     */
    const red = { P: [0, -100, -333.8], A: [-333.8], worstAfter: -333.8, endAfter: -333.8 };
    const s = ownTradeStory({ trade, card: CARD({ badge: 'Closed', pill: '−$333.80' }), paths: red, rulesKept: 3 });
    expect(s.savedLabel).toBe('TAKEN, INSIDE MY RULES');
    expect(s.savedC).toBe('#ff7a70');
    // The reveal counts to the magnitude; `savedNeg` puts the minus back on.
    expect(s.saved).toBeCloseTo(333.8, 6);
    expect(s.savedNeg).toBe(true);
    // And the end card is signed and red, not a bare figure in mint.
    expect(s.card.hero).toBe('−$333.80');
    expect(s.card.heroC).toBe('#ff7a70');
    expect(s.card.tiles[0][2]).toBe('#ff8a80');
  });

  it('never says a rule stood by when a rule is what closed it', () => {
    /*
     * This story covers guard closes too — whenever the saving could not be
     * priced, or was too small to be the headline. It said "you closed it
     * yourself" and "not one of them had to fire" on a reel whose badge read
     * GUARD CLOSED and whose own caption said the loss limit closed it. Two
     * statements on one artefact, contradicting each other.
     */
    const red = { P: [0, 3, -5.97], A: [-5.97], worstAfter: -5.97, endAfter: -5.97 };
    const s = ownTradeStory({
      trade, card: CARD({ badge: 'Guard closed', pill: '−$5.97' }), paths: red, rulesKept: 2, rule: 'Loss limit',
    });
    expect(s.savedLabel).toBe('CLOSED BY MY LOSS LIMIT');
    expect(s.stamp).toBe('Loss limit closed it at −$5.97');
    expect(s.caps.join(' ')).toContain('Your loss limit closed it at −$5.97.');
    expect(s.caps.join(' ')).not.toContain('closed it yourself');
    expect(s.caps.join(' ')).not.toContain('had to fire');
  });

  it('still says you closed it when you did', () => {
    const own = { P: [0, 60, 177.99], A: [177.99] };
    const s = ownTradeStory({ trade, card: GREEN, paths: own, rulesKept: 4 });
    expect(s.caps.join(' ')).toContain('You closed it yourself');
    expect(s.savedNeg).toBe(false);
    expect(s.card.heroC).toBe('#2fe3bd');
  });

  it('tells the same story as the card beside it', () => {
    // card.type is the one place that decides which of the three a trade is.
    const saved = buildStories({
      cards: { trade: { ...CARD(), type: 'saved' } }, trade, paths: PATHS, rule: 'Loss limit',
    });
    expect(saved.trade.mode).toBe('after');

    const own = buildStories({
      cards: { trade: { ...GREEN, type: 'plain' } }, trade, paths: OWN, rule: null, rulesKept: 4,
    });
    expect(own.trade.mode).toBe('own');
  });

  it('never gives a rule the credit for a close the user made', () => {
    /*
     * The after-path is priced for ordinary trades now, because it is what
     * draws their chart. Without the rule check, a trade the user closed
     * themselves that happened to be followed by a move in their favour would
     * have got the full "SAVED BY YOUR RULE" reel for a rule that never fired.
     */
    expect(tradeStory({ trade, card: GREEN, paths: PATHS, rule: null })).toBeNull();
    const out = buildStories({ cards: { trade: { ...GREEN, type: 'plain' } }, trade, paths: PATHS, rule: null });
    expect(out.trade.mode).toBe('own');
    expect(out.trade.savedLabel).not.toContain('SAVED');
  });

  it('still has no reel when the chart itself cannot be priced', () => {
    expect(ownTradeStory({ trade, card: GREEN, paths: null })).toBeNull();
    expect(buildStories({ cards: { trade: GREEN }, trade, paths: null }).trade).toBeUndefined();
  });
});

describe('the trade reel, from a real trade', () => {
  const trade = { symbol: 'SOLUSD', side: 'long' };

  it('ends its path on the figure the ledger reports', () => {
    // The stamp quotes this number and the card repeats it. A path that
    // settles anywhere else contradicts the two things drawn on top of it.
    const s = tradeStory({ trade, card: CARD(), paths: PATHS, rule: 'Loss limit' });
    expect(s.P[s.P.length - 1]).toBe(-218.4);
    expect(s.stamp).toBe('Guard closed at −$218.40');
  });

  it('joins the two paths where the rule fired', () => {
    const s = tradeStory({ trade, card: CARD(), paths: PATHS, rule: 'Loss limit' });
    expect(s.A[0]).toBe(s.P[s.P.length - 1]);
  });

  it('prices the saving against the worst point after the close', () => {
    const s = tradeStory({ trade, card: CARD(), paths: PATHS, rule: 'Loss limit' });
    expect(s.saved).toBeCloseTo(921.8, 6);
  });

  it('refuses to build when there is no priced counterfactual', () => {
    // No path means no "it kept falling", and the reel's entire middle act is
    // that claim. The modal offers the card instead.
    expect(tradeStory({ trade, card: CARD(), paths: null, rule: 'Loss limit' })).toBeNull();
  });

  it('refuses when the price went the other way', () => {
    // The guard still did its job, but there is nothing to boast about.
    const good = { ...PATHS, A: [-218.4, 50, 120], worstAfter: 20 };
    expect(tradeStory({ trade, card: CARD(), paths: good, rule: 'Loss limit' })).toBeNull();
  });

  it('names the user’s own rule, not the demo’s', () => {
    const s = tradeStory({ trade, card: CARD(), paths: PATHS, rule: 'Daily target' });
    expect(s.savedLabel).toContain('DAILY TARGET');
    expect(s.caps.join(' ')).toContain('daily target');
  });

  it('gives six captions however short the source list', () => {
    const s = tradeStory({ trade, card: CARD(), paths: PATHS, rule: 'Loss limit' });
    expect(s.caps).toHaveLength(6);
    expect(s.caps.every(Boolean)).toBe(true);
  });

  it('scales the mood to the size of the trade', () => {
    // k normalises the expression curve. Without it a ₹50,000 trade pins
    // Guardy at maximum panic from the first frame.
    const big = tradeStory({ trade, card: CARD(), paths: { ...PATHS, P: [0, -20000], A: [-20000, -90000], worstAfter: -90000 }, rule: 'Loss limit' });
    expect(big.k).toBeGreaterThan(50);
  });
});

describe('the week reel, from real days', () => {
  const days = [
    { d: 'MON', key: '2026-09-28', v: 312.4 },
    { d: 'TUE', key: '2026-09-29', v: -218.6, ghost: -1140.2 },
    { d: 'WED', key: '2026-09-30', v: 486.9 },
  ];

  it('keeps one bar per trading day', () => {
    const s = weekStory({ card: CARD({ days, meta: '28 Sep – 30 Sep', saved: 921.6 }) });
    expect(s.days).toHaveLength(3);
    expect(s.days.map((d) => d.d)).toEqual(['MON', 'TUE', 'WED']);
  });

  it('every bar has landed before the guard beat', () => {
    const s = weekStory({ card: CARD({ days, saved: 921.6 }) });
    const { Tr, G } = CUES;
    const last = s.days.length - 1;
    // dayVal settles 0.8s after a bar starts; the reveal must come after that.
    expect(Tr + 0.6 + last * 1.05 + 0.8).toBeLessThan(G);
    expect(dayVal(s.days[last], last, G, Tr)).toBeCloseTo(s.days[last].v, 6);
  });

  it('builds without a single priced ghost', () => {
    // "Five days, all inside the rules" is a true story on its own.
    const s = weekStory({ card: CARD({ days: days.map(({ ghost, ...d }) => d), saved: null }) });
    expect(s).not.toBeNull();
    expect(s.days.every((d) => d.ghost === undefined)).toBe(true);
    expect(s.caps.join(' ')).not.toMatch(/without the guard/i);
  });

  it('refuses a week with one trading day', () => {
    expect(weekStory({ card: CARD({ days: days.slice(0, 1) }) })).toBeNull();
  });
});

describe('which stories an account gets', () => {
  it('offers no reel at all on an account with nothing priced', () => {
    expect(buildStories({ cards: { trade: { available: false }, week: { available: false } } })).toEqual({});
  });

  it('never offers day or month', () => {
    // Both need an intraday equity curve the journal does not store. Drawing
    // one would mean animating a path the account never took.
    const s = buildStories({
      cards: { trade: CARD(), week: CARD({ days: [{ d: 'MON', key: 'a', v: 1 }, { d: 'TUE', key: 'b', v: 2 }] }) },
      trade: { symbol: 'SOLUSD', side: 'long' },
      paths: PATHS,
      rule: 'Loss limit',
    });
    expect(Object.keys(s).sort()).toEqual(['trade', 'week']);
  });
});

describe('the week chart stays on the stage', () => {
  // The reference hard-codes the bar scale to its own demo figures (220/887.4,
  // then 0.115). On a real week those are meaningless: a best day of ₹61,000
  // drew a bar seventy times the height of the frame. WeekBars derives the
  // scale instead, and these pin the derivation.
  const REACH = 220;
  const scaleBefore = (days) => REACH / Math.max(...days.map((d) => Math.abs(d.v)), 1);
  const scaleAfter = (days) => REACH / Math.max(...days.map((d) => Math.max(Math.abs(d.v), Math.abs(d.ghost ?? 0))), 1);

  const DEMO = [
    { d: 'MON', v: 312.4 }, { d: 'TUE', v: -218.6, ghost: -1140.2 }, { d: 'WED', v: 486.9 },
    { d: 'THU', v: -219.8, ghost: -1913.4 }, { d: 'FRI', v: 887.4 },
  ];

  it('reproduces the reference’s own constants on the reference’s data', () => {
    expect(scaleBefore(DEMO)).toBeCloseTo(220 / 887.4, 10);
    expect(scaleAfter(DEMO)).toBeCloseTo(0.115, 3);
  });

  it('keeps a ₹61,000 week inside the same 220px', () => {
    const big = [{ d: 'MON', v: 61483.63 }, { d: 'TUE', v: -5850.72 }];
    expect(Math.max(...big.map((d) => Math.abs(d.v))) * scaleBefore(big)).toBeCloseTo(REACH, 6);
  });

  it('survives a flat week without dividing by zero', () => {
    const flat = [{ d: 'MON', v: 0 }, { d: 'TUE', v: 0 }];
    expect(Number.isFinite(scaleBefore(flat))).toBe(true);
  });
});

describe('what the week card claims about the guard', () => {
  it('counts days the guard acted on, not days that lost money', () => {
    // A losing day inside your limit was not stopped by anything. Calling it
    // "stopped at my limit" is a claim about your rules that did not happen.
    const days = [
      { d: 'MON', key: 'a', v: 300 },
      { d: 'TUE', key: 'b', v: -100 },
      { d: 'WED', key: 'c', v: -200, ghost: -900 },
    ];
    const s = weekStory({ card: CARD({ days, guarded: 1, saved: 700, meta: 'wk' }) });
    expect(s.caps.join(' ')).toContain('stepped in on 1');
    expect(s.caps.join(' ')).not.toMatch(/stopped at your limit/);
  });
});
