/**
 * The five protections, as a list.
 *
 * They were five cards with proof panels — a live countdown, a tax table, an
 * account list, a detected-pattern panel. Individually good, together they
 * ran past the fold and pushed the plan panel off screen, so the screen that
 * exists to sell a subscription spent most of its height demonstrating
 * features to someone who had not yet seen the price.
 *
 * One line each. The summary IS the fix — what the protection does — so what
 * hides behind the disclosure is the part the summary cannot carry: why it
 * matters, and the one caveat or specific that a buyer deserves before
 * paying rather than after.
 *
 * The first pass put a restated "Fix:" down there. Expanding cost a click
 * and returned the sentence already on screen, which teaches people that the
 * chevrons are not worth pressing.
 */

export const PROTECTIONS = [
  {
    id: 'kill',
    pain: 'You hit your daily limit, then take “one more” to win it back. One red trade becomes five.',
    detail: "We cannot stop an order being placed inside the exchange's own app — no exchange gives anyone that switch. We close the position immediately after it opens, then check you are actually flat.",
    n: '01',
    title: 'Rule-based kill switch',
    body: 'At your limit we close your positions, cancel open orders and lock the day — in about 120ms, with the app closed.',
    gradient: 'linear-gradient(145deg,#ff8a80,#d63a2f)',
    color: '#fff',
    glyph: 'shield',
  },
  {
    id: 'manual',
    pain: "You know you're tilted, but you can't stop clicking.",
    detail: 'Rules cannot be loosened while it runs, either. Raising the limit that locked you would be a way straight out of it, so the clock is the only way out.',
    n: '02',
    title: 'Manual kill switch',
    body: 'Lock yourself out for 3, 6 or 12 hours. There is no cancel button, only the clock.',
    gradient: 'linear-gradient(145deg,#ffd666,#e0a400)',
    color: '#2a1a00',
    glyph: 'power',
  },
  {
    id: 'tax',
    pain: "A year of trades, and your CA wants a reconciled P&L you've never built.",
    detail: 'Two illustrative treatments, side by side. Reconciled per account and never merged — two accounts under one login can be two taxpayers. Export as PDF or CSV.',
    /* Legally careful, and it belongs next to the claim it qualifies rather
       than loose under the list where it qualifies nothing on screen. */
    note: 'Illustrative, not a confirmed liability. Review with your CA.',
    n: '03',
    title: 'Tax management',
    body: 'Every trade reconciled into one financial-year P&L, with a report you can hand to your CA.',
    gradient: 'linear-gradient(145deg,#7cb0fd,#2563eb)',
    color: '#fff',
    glyph: 'receipt',
  },
  {
    id: 'accounts',
    pain: "You scalp in one account and swing in another, but one set of rules can't fit both.",
    detail: 'Rules, limits, guard state and history are per account. Nothing is shared between them, so a lockout on one leaves the others trading.',
    n: '04',
    title: 'Up to 5 trading accounts',
    body: 'Each with its own rules, limits and guard. Switch between them in one tap.',
    gradient: 'linear-gradient(145deg,#5ff2d2,#00a98a)',
    color: '#04140f',
    glyph: 'windows',
  },
  {
    id: 'journal',
    pain: 'You repeat the same mistake because you never wrote it down.',
    detail: 'It reads your closed trades, not your notes — so a habit you never admitted to still shows up, with a number against it.',
    n: '05',
    title: 'Journal + AI trade analyser',
    body: 'A two-minute journal after each session. The AI puts a cost on each habit and suggests a rule to stop it.',
    gradient: 'linear-gradient(145deg,#b191fb,#7c3aed)',
    color: '#fff',
    glyph: 'sparkle',
  },
];

export const GLYPH = {
  shield: ['M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z', 'M12 8v4M12 15h.01'],
  power: ['M12 3v9', 'M6.4 6.6a8 8 0 1011.2 0'],
  receipt: ['M7 3h10v18l-2.5-1.6L12 21l-2.5-1.6L7 21V3z', 'M10 8h4M10 12h4'],
  windows: ['M4 7h11v11H4z', 'M9 4h11v11'],
  sparkle: ['M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z', 'M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z'],
  warn: ['M12 3.5l9 16H3l9-16z', 'M12 10v4M12 17h.01'],
};
