import { describe, expect, it } from 'vitest';
import { at, bump, colourFor, hash, interpolate, M, money, split, tw, usd } from './reelMotion';
import { CUES, STORIES, dayT0, dayVal, yRange } from './reelStories';

/**
 * The reel's correctness is almost entirely in this file's maths.
 *
 * Everything on screen is a pure function of T, which is what lets the preview
 * scrub, the loop close without a seam, and an MP4 renderer ask for an
 * arbitrary frame and get the one the user saw. These tests pin the parts that
 * would break that silently — a tween that keeps moving past its window, a
 * colour that changes between the preview and the export, a story whose two
 * paths do not meet where the rule fired.
 */

describe('tweens settle at both ends', () => {
  it('holds `from` before the window and `to` after it', () => {
    const f = tw(10, 20, 2, 4);
    expect(f(0)).toBe(10);
    expect(f(2)).toBe(10);
    expect(f(4)).toBe(20);
    expect(f(99)).toBe(20);
  });

  it('is monotonic through the window', () => {
    // Layers are composed by MULTIPLYING tweens — fade in times fade out — so
    // a factor that overshoots or keeps climbing past its end makes an element
    // reappear later in the reel.
    const f = tw(0, 1, 0, 1, M.glide);
    let prev = -Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = f(t);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it('pop overshoots and still lands exactly on the target', () => {
    // easeOutBack goes past 1 mid-flight; that is the point. What matters is
    // that it ends at the target, or a card settles a few pixels off.
    const f = tw(0, 1, 0, 1, M.pop);
    const mid = Math.max(...[0.6, 0.7, 0.8, 0.9].map(f));
    expect(mid).toBeGreaterThan(1);
    expect(f(1)).toBe(1);
  });
});

describe('interpolate', () => {
  it('clamps outside the given times', () => {
    const f = interpolate([1, 2, 3], [10, 20, 30]);
    expect(f(0)).toBe(10);
    expect(f(9)).toBe(30);
  });

  it('passes through every knot exactly', () => {
    // Guardy's position is a four-knot interpolate; a knot that is not hit
    // exactly means he arrives somewhere other than where the card expects.
    const f = interpolate([0, 0.6, 3.4, 4.2], [1300, 1250, 1250, 1590]);
    expect(f(0)).toBe(1300);
    expect(f(0.6)).toBe(1250);
    expect(f(3.4)).toBe(1250);
    expect(f(4.2)).toBe(1590);
  });

  it('survives a zero-length segment', () => {
    expect(interpolate([1, 1, 2], [0, 5, 10])(1)).toBe(0);
  });
});

describe('sampling and gestures', () => {
  it('at() hits the ends and interpolates between', () => {
    expect(at([0, 10, 20], 0)).toBe(0);
    expect(at([0, 10, 20], 1)).toBe(20);
    expect(at([0, 10, 20], 0.25)).toBe(5);
  });

  it('at() clamps rather than running off the array', () => {
    expect(at([0, 10], 2)).toBe(10);
    expect(at([0, 10], -1)).toBe(0);
  });

  it('bump peaks at its centre and dies at its edges', () => {
    expect(bump(5, 5, 0.3)).toBeCloseTo(1, 6);
    // Not toBe(0) at the boundary: |5.3 - 5| / 0.3 is 0.9999999999999998, so
    // the guard does not trip and sin() returns about 9e-16. Visually zero,
    // and matching the reference implementation, which is the contract.
    expect(bump(5.3, 5, 0.3)).toBeCloseTo(0, 12);
    expect(bump(4.7, 5, 0.3)).toBeCloseTo(0, 12);
    expect(bump(5.4, 5, 0.3)).toBe(0);
    expect(bump(4.5, 5, 0.3)).toBe(0);
  });
});

describe('money', () => {
  it('uses a real minus sign, not a hyphen', () => {
    // U+2212. A hyphen is a different width, and at 150px in tabular-nums the
    // number visibly jitters as it crosses zero.
    expect(money(-218.4).startsWith('−')).toBe(true);
    expect(money(-218.4).includes('-')).toBe(false);
  });

  it('never shows a signed zero', () => {
    // −$0.00 reads as a loss of nothing. Anything that rounds to zero is +.
    expect(money(0)).toBe('+$0.00');
    expect(money(-0.001)).toBe('+$0.00');
  });

  it('formats the figures the captions quote', () => {
    expect(money(-218.4)).toBe('−$218.40');
    expect(money(-1140.2)).toBe('−$1,140.20');
    expect(usd(921.8)).toBe('$921.80');
    expect(money(400)).toBe('+$400.00');
  });

  it('splits at the last dot so decimals can be shrunk', () => {
    expect(split('$1,140.20')).toEqual(['$1,140', '.20']);
    expect(split('no-dot')).toEqual(['no-dot', '']);
  });
});

describe("Guardy's colour", () => {
  it('is the same every time for the same id', () => {
    // The colour is part of what the user shared. A re-render that changes it
    // makes the downloaded MP4 disagree with the preview they posted.
    const a = colourFor('trade-7d1cac0e');
    for (let i = 0; i < 20; i += 1) expect(colourFor('trade-7d1cac0e')).toBe(a);
  });

  it('spreads across all three colours', () => {
    const seen = new Set();
    for (let i = 0; i < 30; i += 1) seen.add(colourFor(`trade-${i}`));
    expect(seen.size).toBe(3);
  });

  it('hashes without collisions on similar ids', () => {
    expect(hash('trade-1')).not.toBe(hash('trade-2'));
  });
});

describe('story data', () => {
  it('has all four stories the share modal offers', () => {
    expect(Object.keys(STORIES).sort()).toEqual(['day', 'month', 'trade', 'week']);
  });

  it('joins the two paths where the rule fired, in `after` stories', () => {
    // A[0] must equal P[last]: the saved area is drawn between them, so a gap
    // here is a visible break exactly where the reel makes its claim.
    for (const s of Object.values(STORIES)) {
      if (s.mode !== 'after') continue;
      expect(s.A[0]).toBeCloseTo(s.P[s.P.length - 1], 6);
    }
  });

  it('runs both paths over the same period in `parallel` stories', () => {
    // Week and month compare the same days with and without the guard, so the
    // two paths start together and must have one point each per period —
    // a mismatch would draw the avoided loss against the wrong day.
    for (const s of Object.values(STORIES)) {
      if (s.mode !== 'parallel') continue;
      expect(s.A).toHaveLength(s.P.length);
      expect(s.A[0]).toBe(s.P[0]);
    }
  });

  it('lands the trade story on the figures it quotes', () => {
    const t = STORIES.trade;
    expect(t.P[t.P.length - 1]).toBeCloseTo(-218.4, 6);
    expect(t.A[t.A.length - 1]).toBeCloseTo(-1140.2, 6);
    expect(Math.abs(t.A[t.A.length - 1] - t.P[t.P.length - 1])).toBeCloseTo(t.saved, 6);
  });

  it('lands the day story on its figures too', () => {
    const d = STORIES.day;
    expect(d.P[d.P.length - 1]).toBe(400);
    expect(d.A[d.A.length - 1]).toBe(-185.4);
    expect(Math.abs(d.A[d.A.length - 1] - d.P[d.P.length - 1])).toBeCloseTo(d.saved, 6);
  });

  it('lands the week story on its figures', () => {
    const w = STORIES.week;
    expect(w.P[w.P.length - 1]).toBeCloseTo(1248.3, 6);
    expect(w.A[w.A.length - 1]).toBeCloseTo(-1366.9, 6);
    expect(Math.abs(w.A[w.A.length - 1] - w.P[w.P.length - 1])).toBeCloseTo(w.saved, 6);
  });

  it('the week’s five bars add up to the week it claims', () => {
    // The headline P&L is the running sum of the bars, so if these disagree
    // with the stamp the number on screen contradicts the caption under it.
    const sum = STORIES.week.days.reduce((a, d) => a + d.v, 0);
    expect(sum).toBeCloseTo(1248.3, 6);
  });

  it('the week’s ghosts add up to the week it avoided', () => {
    const noGuard = STORIES.week.days.reduce((a, d) => a + (d.ghost ?? d.v), 0);
    expect(noGuard).toBeCloseTo(-1366.9, 6);
  });

  it('only the red week days carry a ghost', () => {
    // A ghost on a green day would claim the guard saved a day it never
    // touched.
    for (const d of STORIES.week.days) {
      if (d.ghost == null) expect(d.v).toBeGreaterThan(0);
      else expect(d.v).toBeLessThan(0);
    }
  });

  it('lands the month story on its figures', () => {
    const m = STORIES.month;
    expect(m.P[m.P.length - 1]).toBeCloseTo(4812.6, 6);
    expect(m.A[m.A.length - 1]).toBeCloseTo(-6240.1, 6);
    expect(Math.abs(m.A[m.A.length - 1] - m.P[m.P.length - 1])).toBeCloseTo(m.saved, 6);
  });

  it('gives every story six captions', () => {
    // The caption schedule has exactly six slots. A seventh never shows and a
    // fifth leaves the last third of the reel silent.
    for (const s of Object.values(STORIES)) expect(s.caps).toHaveLength(6);
  });

  it('keeps the trade range hand-set', () => {
    expect(yRange(STORIES.trade)).toEqual({ HI: 80, LO0: -260, LO1: -1220 });
  });

  it('derives a range for day that contains both paths', () => {
    const { HI, LO1 } = yRange(STORIES.day);
    const all = STORIES.day.P.concat(STORIES.day.A);
    expect(HI).toBeGreaterThan(Math.max(...all));
    expect(LO1).toBeLessThan(Math.min(...all));
  });

  it('points each story at a rule block that exists', () => {
    // `lit` indexes RULES. Out of range means nothing glows when the rule
    // fires, which is the one beat the whole reel is built around.
    for (const s of Object.values(STORIES)) {
      expect(s.lit).toBeGreaterThanOrEqual(0);
      expect(s.lit).toBeLessThan(4);
    }
  });

  it('gives every story six captions', () => {
    for (const s of Object.values(STORIES)) expect(s.caps).toHaveLength(6);
  });
});

describe('the loop', () => {
  it('runs the cues in order and ends at 17.6', () => {
    expect(CUES.S).toBeLessThan(CUES.Tr);
    expect(CUES.Tr).toBeLessThan(CUES.G);
    expect(CUES.G).toBeLessThan(CUES.C);
    expect(CUES.C).toBeLessThan(CUES.END);
    expect(CUES.END).toBe(17.6);
  });

  it('is black at both ends, so the loop has no seam', () => {
    const black = (T) =>
      Math.max(tw(1, 0, 0, 0.45, M.enter)(T), tw(0, 1, CUES.END - 0.45, CUES.END, M.enter)(T));
    expect(black(0)).toBe(1);
    expect(black(CUES.END)).toBe(1);
    expect(black(CUES.END / 2)).toBe(0);
  });
});

describe('the week bar race', () => {
  const { Tr, G, END } = CUES;
  const W = STORIES.week;
  const total = (T) => W.days.reduce((a, d, i) => a + dayVal(d, i, T, Tr), 0);

  it('every bar has landed before the reveal', () => {
    // The guard beat at G is the payoff. A bar still growing into it reads as
    // the week not being over when the stamp says it closed.
    const last = dayT0(Tr, W.days.length - 1) + 0.8;
    expect(last).toBeLessThan(G);
  });

  it('settles on the week it claims, and stays there', () => {
    expect(total(G)).toBeCloseTo(1248.3, 6);
    expect(total(END)).toBeCloseTo(1248.3, 6);
  });

  it('is flat before the first bar', () => {
    expect(total(Tr)).toBe(0);
  });

  it('plunges a red day and then snaps it back to the limit', () => {
    // The snap IS the guard. Without the overshoot below the close there is
    // no moment for the shield coin to land on, and the red days just grow
    // like the green ones.
    const i = 1;
    const d = W.days[i];
    const t0 = dayT0(Tr, i);
    const deep = dayVal(d, i, t0 + 0.45, Tr);
    expect(deep).toBeCloseTo(-700, 6);
    expect(dayVal(d, i, t0 + 0.8, Tr)).toBeCloseTo(d.v, 6);
    expect(deep).toBeLessThan(d.v);
  });

  it('grows a green day straight to its close', () => {
    const i = 0;
    const d = W.days[i];
    const t0 = dayT0(Tr, i);
    let prev = -Infinity;
    for (let T = t0; T <= t0 + 0.5; T += 0.02) {
      const v = dayVal(d, i, T, Tr);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
    expect(dayVal(d, i, t0 + 0.5, Tr)).toBeCloseTo(d.v, 6);
  });

  it('is a pure function of T', () => {
    // The whole reel depends on this: an MP4 renderer asks for frames out of
    // order and must get the same picture the preview showed.
    for (const T of [0, 4.2, 6.37, G, G + 1.9, END]) {
      expect(total(T)).toBe(total(T));
      expect(dayVal(W.days[3], 3, T, Tr)).toBe(dayVal(W.days[3], 3, T, Tr));
    }
  });
});

describe('the reel is not dollar-only', () => {
  it('formats in whatever the account settles in', () => {
    // Shark settles in INR. Every figure in the reel comes from that ledger,
    // so a hard-coded '$' is the same number off by roughly eighty to one —
    // on the artefact the user posts publicly.
    expect(money(1248.3, '\u20b9')).toBe('+\u20b91,248.30');
    expect(usd(2615.2, '\u20b9')).toBe('\u20b92,615.20');
  });

  it('still defaults to dollars', () => {
    expect(money(1248.3)).toBe('+$1,248.30');
  });
});
