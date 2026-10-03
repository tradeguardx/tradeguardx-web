import { M, clamp, interpolate, tw } from './reelMotion';

/**
 * What the reel is about, per story.
 *
 * All four ship: `trade` (one trade closed by the loss limit), `day` (a day
 * locked by the daily target), `week` (five bars, two of them caught by the
 * limit) and `month` (a long equity line against the one it avoided).
 *
 * `mode` decides how the avoided path is drawn:
 *
 *   'after'     A continues where P stopped — what the price did NEXT.
 *               The reveal widens the x-axis past the close.
 *   'parallel'  A runs alongside P over the same period — the same days
 *               without the guard. The x-axis does not grow; only the floor
 *               drops. Used by week and month, where "afterwards" is not a
 *               thing that happened.
 *
 * `days` marks the bar-race layout. When it is present WeekBars replaces the
 * price chart, the close stamp moves to the top-left of the panel, and the
 * "if held" line is dropped — the ghost bars already say it, per-day.
 *
 * IN PRODUCTION THESE COME FROM THE CLOSED TRADE. The numbers below are the
 * demo values, and the shape is the contract:
 *
 *   P      realised P&L up to the close
 *   A      what the price did AFTERWARDS, expressed as P&L if it had been held
 *   saved  |A[last] − P[last]| — the whole point of the reel
 *
 * A[0] must equal P[last]. The "saved" area is drawn between the two paths,
 * so if they do not meet, the reel shows a gap where the rule fired and the
 * claim it is making stops being true.
 */

export const RED = '#ff7a70';
export const MINT = '#2fe3bd';
export const GREY = '#c9d2e0';

const RAW = [0, 5, 8, 3, -2, -6, -3, -11, -16, -12, -20, -26, -22, -30, -34];
const RAW_AFTER = [-34, -42, -38, -55, -61, -74, -70, -88, -95, -110, -124, -138, -150];

export const STORIES = {
  trade: {
    // Scaled so the close lands exactly on −218.40 and the day's low on
    // −1,140.20 — the two figures the captions and the card both quote.
    P: RAW.map((v) => (v * 218.4) / 34),
    A: RAW_AFTER.map((v) => -218.4 + (v + 34) * (921.8 / 116)),
    mode: 'after',
    win: false,
    k: 1,
    limit: -220,
    limitLabel: '−$220 MAX LOSS',
    limitC: RED,
    lit: 0,
    saved: 921.8,
    sym: 'SOLUSD',
    tag: 'LONG · 8X',
    liveLabel: 'LIVE P&L',
    savedLabel: 'SAVED BY HIS RULE',
    stamp: 'Guard closed at −$218.40',
    heldPre: 'If he’d held, the day’s low was ',
    held: '−$1,140.20',
    // How brightly the max-loss block glows as the loss approaches it.
    near: (l) => clamp((-l - 150) / 70, 0, 1) * 0.6,
    card: {
      sym: 'SOLUSD',
      meta: 'Long · 8x',
      badge: 'Guard closed',
      label: 'Saved by my rule',
      pill: '−$218.40',
      pillC: RED,
      pillText: 'instead of −$1,140.20 at the day’s low',
      tiles: [
        ['Closed at', '−$218.40', '#ff8a80'],
        ['If held', '−$1,140.20', GREY],
        ['Rule', 'Loss limit', '#fff'],
      ],
      ach: 'Saved by the guard',
      tier: 'RARE',
      achText: 'Your rule closed it before the move kept going.',
      date: '30 Sep 2026',
    },
    caps: [
      'Arjun sets his rules before he trades.',
      'Then locks them, so he can’t change his mind mid-trade.',
      'He goes long SOL.',
      'Then it turns against him.',
      'His rule closes it at the limit.',
      'The price kept falling. He didn’t.',
    ],
  },
  day: {
    P: [0, 40, 25, 95, 140, 120, 190, 245, 230, 300, 340, 325, 372, 400],
    A: [400, 360, 380, 290, 240, 270, 150, 90, 120, 10, -60, -120, -185.4],
    mode: 'after',
    win: true,
    k: 1.5,
    limit: 400,
    limitLabel: '+$400 DAILY TARGET',
    limitC: MINT,
    lit: 1,
    saved: 585.4,
    sym: 'DAY P&L',
    tag: 'TUE 29 SEP',
    liveLabel: '6 TRADES',
    savedLabel: 'KEPT BY HIS LOCK',
    stamp: 'Day locked at +$400.00',
    heldPre: 'If he’d kept trading, he’d have closed at ',
    held: '−$185.40',
    near: (l) => clamp((l - 300) / 90, 0, 1) * 0.7,
    card: {
      sym: 'Daily recap',
      meta: '6 trades · Tue 29 Sep',
      badge: 'Day locked',
      label: 'Kept by my lock',
      pill: '+$400.00',
      pillC: MINT,
      pillText: 'banked, instead of −$185.40 by the close',
      tiles: [
        ['Locked at', '+$400.00', MINT],
        ['If he kept going', '−$185.40', GREY],
        ['Rule', 'Daily target', '#fff'],
      ],
      ach: 'Quit while ahead',
      tier: 'EPIC',
      achText: 'Your target locked the day before you gave it back.',
      date: '29 Sep 2026',
    },
    caps: [
      'Arjun sets his rules before the session.',
      'Then locks them, so he can’t move the target mid-day.',
      'Six trades. The day goes green.',
      'He wants one more.',
      'His target locks the day at +$400.',
      'The trades he didn’t take would have lost it all.',
    ],
  },
  week: {
    // The bar race. `v` is where the day actually closed; `ghost` is where it
    // was heading when the limit stopped it — drawn as a dashed outline below
    // the bar at the reveal. Only the two red days have one.
    days: [
      { d: 'MON', v: 312.4 },
      { d: 'TUE', v: -218.6, ghost: -1140.2 },
      { d: 'WED', v: 486.9 },
      { d: 'THU', v: -219.8, ghost: -1913.4 },
      { d: 'FRI', v: 887.4 },
    ],
    // Cumulative, for the card's mini chart only — the reel draws bars.
    // Sum of v = +1,248.30; sum with the ghosts = −1,366.90; saved = 2,615.20.
    P: [0, 312.4, 93.8, 580.7, 360.9, 1248.3],
    A: [0, 312.4, -827.8, -340.9, -2254.3, -1366.9],
    mode: 'parallel',
    win: true,
    k: 3,
    limit: 0,
    limitLabel: '',
    limitC: RED,
    lit: 0,
    saved: 2615.2,
    sym: 'THIS WEEK',
    tag: '28 SEP – 2 OCT',
    liveLabel: 'WEEK P&L',
    savedLabel: 'THE GUARD WAS WORTH',
    stamp: 'Week closed at +$1,248.30',
    heldPre: 'Same week without the guard: ',
    held: '−$1,366.90',
    near: () => 0,
    card: {
      sym: 'Weekly recap',
      meta: '28 Sep – 2 Oct',
      badge: 'Green week',
      label: 'The guard was worth',
      pill: '+$1,248.30',
      pillC: MINT,
      pillText: 'instead of −$1,366.90 without it',
      tiles: [
        ['Week', '+$1,248.30', MINT],
        ['Days', '3 up · 2 down', '#fff'],
        ['Without guard', '−$1,366.90', GREY],
      ],
      ach: 'Green week, rules held',
      tier: 'EPIC',
      achText: '3 green days, 2 red days stopped at the limit, 0 rule edits.',
      date: 'Week 40 · 2026',
    },
    caps: [
      'Arjun locks his rules on Monday.',
      'Seven days. No edits allowed.',
      'One bar a day. Watch the red ones.',
      'Both red days stopped dead at −$220.',
      'The week closes green.',
      'Without the guard, it was −$1,366.90.',
    ],
  },
  month: {
    P: [0, 420, 310, 820, 1240, 980, 1610, 2050, 1830, 2480, 3010, 2790, 3560, 4120, 4812.6],
    A: [0, 420, -150, 380, 700, -620, -210, 300, -1350, -900, -400, -2100, -3300, -4700, -6240.1],
    mode: 'parallel',
    win: true,
    k: 25,
    limit: 0,
    limitLabel: '',
    limitC: RED,
    lit: 0,
    saved: 11052.7,
    sym: 'SEPTEMBER',
    tag: '21 TRADING DAYS',
    liveLabel: 'MONTH P&L',
    savedLabel: 'THE GUARD WAS WORTH',
    stamp: 'September closed at +$4,812.60',
    heldPre: 'Same month without the guard: ',
    held: '−$6,240.10',
    near: () => 0,
    card: {
      sym: 'Monthly recap',
      meta: 'September · 21 days',
      badge: 'Green month',
      label: 'The guard was worth',
      pill: '+$4,812.60',
      pillC: MINT,
      pillText: 'instead of −$6,240.10 without it',
      tiles: [
        ['Month', '+$4,812.60', MINT],
        ['Without guard', '−$6,240.10', GREY],
        ['Guard closes', '9', '#fff'],
      ],
      ach: 'Rule-proof month',
      tier: 'LEGENDARY',
      achText: '21 days, 9 closes, 0 rule edits.',
      date: 'Sep 2026',
    },
    caps: [
      'Arjun locked his rules on the 1st.',
      'Re-locked every 7 days. Never edited once.',
      'Twenty-one trading days.',
      'Nine times, the guard closed a bad day.',
      'September closes green.',
      'Without the guard: −$6,240.10.',
    ],
  },
};

/** When day `i`'s bar starts animating. One a second, a little over. */
export const dayT0 = (Tr, i) => Tr + 0.6 + i * 1.05;

/**
 * What day `i` is worth at time T — the whole point of the week story.
 *
 * A green day simply grows to its close. A red day does not: it plunges
 * towards −700, and then, 0.45s in, snaps back up to where the limit actually
 * stopped it. That snap is the guard, and it is why the red bars are the ones
 * the caption tells you to watch.
 */
export function dayVal(d, i, T, Tr) {
  const t0 = dayT0(Tr, i);
  if (d.v >= 0) return d.v * tw(0, 1, t0, t0 + 0.5, M.enter)(T);
  if (T < t0 + 0.45) return -700 * tw(0, 1, t0, t0 + 0.45, M.enter)(T);
  return interpolate([t0 + 0.45, t0 + 0.8], [-700, d.v], M.pop)(T);
}

/**
 * The chart's vertical range, in three parts.
 *
 *   HI   the top, fixed for the whole reel
 *   LO0  the bottom WHILE trading — tight, so the move has drama
 *   LO1  the bottom once the "if held" path is revealed — zoomed out far
 *        enough to contain it
 *
 * The zoom between LO0 and LO1 is the moment the reel is built around: the
 * chart pulls back and the loss the rule avoided comes into frame.
 *
 * `trade` is hand-set rather than derived. Its numbers were chosen for the
 * composition — the limit line sits just under the close, and the day's low
 * fills the lower half — and deriving them would move both.
 */
export function yRange(story) {
  if (story === STORIES.trade) return { HI: 80, LO0: -260, LO1: -1220 };
  const all = story.P.concat(story.A);
  const mx = Math.max(0, ...all);
  const mnP = Math.min(0, ...story.P);
  const mnA = Math.min(0, ...all);
  const span = mx - mnA;
  return {
    HI: mx + span * 0.08,
    LO0: mnP - (mx - mnP) * 0.18,
    LO1: mnA - span * 0.08,
  };
}

/**
 * The rules shown on the rail and on the card.
 *
 * In production these are the user's real active rules, capped at four. These
 * are the demo values, and they are the ones the captions quote — a reel whose
 * rail says −$220 while its caption says something else is worse than no reel.
 */
export const RULES = [
  { k: 'Max loss / day', v: '−$220', c: '#ff7a70' },
  { k: 'Daily target', v: '+$400', c: '#2fe3bd' },
  { k: 'Trades / day', v: '6', c: '#f0b429' },
  { k: 'Risk / trade', v: '1%', c: '#b191fb' },
];

/** Guardy's three bodies: [highlight, base]. Colour is the only thing that varies. */
export const BODY = {
  mint: ['#5ff2d2', '#00b893'],
  violet: ['#c4b0ff', '#7c3aed'],
  gold: ['#ffe28a', '#e09a00'],
};

export const FONT_D = "'Space Grotesk', sans-serif";
export const FONT_B = 'Manrope, sans-serif';
export const FONT_M = "'JetBrains Mono', monospace";

/** Scene cues, in seconds. END is where the loop closes. */
export const CUES = { S: 0, Tr: 3.6, G: 9.6, C: 13.1, END: 17.6 };
