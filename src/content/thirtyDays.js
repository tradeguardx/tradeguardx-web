/**
 * 30 Days of Discipline — the content file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONLY FILE YOU EDIT DAILY. Add one entry to DAYS, commit, push.
 * Vercel redeploys and the page updates. Nothing else needs touching.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Everything on the page derives from what's here — the "Day N of 30" counter,
 * the tally card, the timeline. There are no numbers hardcoded in the page
 * component, so the tally can never drift out of sync with the log.
 *
 * A word on what this page is: it's a public claim about your own trading. The
 * numbers should be the ones your dashboard actually shows. If a day goes badly,
 * post the bad day — a discipline log with no red days reads as marketing and
 * everyone can tell. The whole persuasive value is that it's checkable.
 *
 * Any entry with `draft: true` renders a loud amber DRAFT banner and is excluded
 * from the tally, so a half-written day can sit in the file safely. Remove the
 * flag to publish it.
 */

export const CHALLENGE = {
  /** Day 1. Everything counts forward from here. ISO yyyy-mm-dd. */
  startDate: '2026-07-23',
  totalDays: 30,
  exchange: 'Delta Exchange',

  /**
   * The limits actually configured in TradeGuardX, written as they should read
   * in the hero strip. Keep these honest — they're the terms of the whole
   * experiment, and the first thing a sceptical reader checks against your
   * daily numbers.
   *
   * Only list rules the product genuinely enforces. There is no leverage rule
   * in TradeGuardX today; if you want to hold yourself to one, say so in a note
   * as a personal rule rather than listing it here as an enforced limit.
   */
  rules: ['$3 daily loss cap', 'warning at $2', '3 trades max'],

  /** The headline limit, used in the page description. */
  lossCap: '$3',

  /** Shown under the hero. Keep it to one line. */
  tagline: 'Every day: the limits I set, what the market did, and whether the kill switch had to stop me.',
};

/**
 * One object per day. Newest or oldest order doesn't matter — the page sorts by
 * `n`. Only `n`, `date` and `status` are required; everything else is optional
 * and the layout adapts to what's present.
 *
 *   n         1–30.
 *   date      ISO yyyy-mm-dd.
 *   status    'armed'   — rules held, nothing had to intervene
 *             'warned'  — crossed the warning level, no breach
 *             'blocked' — an order was blocked / a position force-closed
 *             'locked'  — kill switch fired, account locked for the day
 *             'flat'    — didn't trade
 *   pnl       Number in USD. Negative for a loss. null/omit if you didn't trade.
 *   trades    Trades opened that day.
 *   blocked   Orders blocked by TradeGuardX.
 *   cooldowns Cooldowns triggered.
 *   loosened  true if you loosened a rule that day. Be honest; it's the number
 *             that actually matters and the tally calls it out either way.
 *   note      Array of paragraphs. First one renders larger.
 *   quote     One pull-quote line. Optional — skip it on days with nothing to say.
 *   tags      Short chips: symbols traded, session, whatever.
 *   video     YouTube ID only, not the full URL. For a normal link
 *             youtube.com/watch?v=ID it's the v= part; for a Short
 *             youtube.com/shorts/ID it's the bit after /shorts/.
 *   short     true if `video` is a YouTube Short (vertical 9:16). Renders the
 *             player portrait instead of the default 16:9.
 *   poster    Optional path under /public for the branded video poster's
 *             background frame, e.g. '/30days/day-01-poster.jpg'. Omit and it
 *             uses the YouTube thumbnail. Either way it sits dimmed behind the
 *             TradeGuardX overlay — this just picks which frame shows through.
 *   image     Path under /public, e.g. '/30days/day-01.png' — the share card the
 *             dashboard exports from a trade.
 *   draft     true → renders a DRAFT banner, excluded from the tally.
 */
export const DAYS = [
  {
    n: 1,
    date: '2026-07-23',
    status: 'armed',
    pnl: 7.15,
    trades: 1,
    blocked: 0,
    cooldowns: 0,
    loosened: false,
    video: 'h2pBVkx9uTU',
    short: true,
    note: [
      'Set the limits and started trading. A clean green day — rules held, nothing had to step in.',
    ],
    tags: ['XRPUSD', 'setup'],
  },
  {
    n: 2,
    date: '2026-07-24',
    status: 'armed',
    pnl: 7.21,
    trades: 1,
    blocked: 0,
    cooldowns: 0,
    loosened: false,
    video: 'DnVy8oXqqOg',
    short: true,
    note: [
      'Second green day in a row. Still under every limit — the rules haven’t had to do anything yet.',
    ],
    tags: ['XRPUSD'],
  },
  {
    n: 3,
    date: '2026-07-25',
    status: 'locked',
    pnl: -3.17,
    trades: 1,
    blocked: 0,
    cooldowns: 1,
    loosened: false,
    video: 'pDGEAZ2AcVs',
    short: true,
    note: [
      'Hit the daily loss limit. The kill switch fired: cancelled the open order, closed the position, and locked the account for the rest of the day. Verified flat a few seconds later — first real save.',
    ],
    quote: 'This is the whole point. It closed it so I didn’t have to decide.',
    tags: ['XRPUSD', 'kill switch'],
  },
  {
    n: 4,
    date: '2026-07-26',
    status: 'locked',
    pnl: -3.87,
    trades: 1,
    blocked: 0,
    cooldowns: 1,
    loosened: false,
    video: 'G9r0ABedHdg',
    short: true,
    // Precise on purpose: the daily loss limit was correctly detected and the
    // account was correctly locked for the day — but the close itself did NOT
    // go through the kill switch that day (a stale-credential bug, fixed since;
    // the position was actually closed by my own stop-loss). Not overclaiming
    // what happened just because the bug is fixed now — this log is a record,
    // not a highlight reel.
    note: [
      'Second red day. The daily loss limit was hit and the account locked for the rest of the day — but the position closed on my own stop-loss, not the kill switch. Found and fixed the bug behind that afterward: it was enforcing with a stale API key.',
    ],
    tags: ['SOLUSD'],
  },
  {
    n: 5,
    date: '2026-07-27',
    status: 'armed',
    pnl: 9.12,
    trades: 1,
    blocked: 0,
    cooldowns: 0,
    loosened: false,
    video: 'va4HLqFfTVI',
    short: true,
    note: [
      'Recovered both red days in one trade, inside the same risk limits as every other day — no widened stop, no oversized position to "get it back". +$9.12 on the day covers the −$3.17 and −$3.87 from days three and four with room to spare.',
    ],
    quote: 'Proper risk management, not revenge trading.',
    tags: ['XRPUSD', 'recovery'],
  },
];

/* ───────────────────────── derived — no need to edit ───────────────────────── */

/** Published (non-draft) days, oldest first. */
export function publishedDays() {
  return DAYS.filter((d) => !d.draft).sort((a, b) => a.n - b.n);
}

/** All days the page should render, newest first. Drafts included (banner shown). */
export function logDays() {
  return [...DAYS].sort((a, b) => b.n - a.n);
}

/**
 * The tally card. Every figure is summed from published entries, so it cannot
 * disagree with the log below it.
 */
export function tally() {
  const days = publishedDays();
  const sum = (k) => days.reduce((t, d) => t + (Number(d[k]) || 0), 0);
  const traded = days.filter((d) => d.pnl != null);
  return {
    logged: days.length,
    blocked: sum('blocked'),
    cooldowns: sum('cooldowns'),
    loosened: days.filter((d) => d.loosened).length,
    trades: sum('trades'),
    net: traded.length ? traded.reduce((t, d) => t + Number(d.pnl), 0) : null,
    green: traded.filter((d) => d.pnl > 0).length,
    red: traded.filter((d) => d.pnl < 0).length,
  };
}

/** Which day number we're on — clamped to the challenge length. */
export function currentDay() {
  const highest = DAYS.reduce((m, d) => Math.max(m, d.n), 0);
  return Math.min(highest, CHALLENGE.totalDays);
}
