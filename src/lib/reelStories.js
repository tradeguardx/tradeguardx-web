import { clamp } from './reelMotion';

/**
 * What the reel is about, per story.
 *
 * Two stories ship now — `trade` (one trade closed by the loss limit) and
 * `day` (a day locked by the daily target). Week and month use a bar layout
 * rather than a price line and are deliberately not built here.
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
};

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
