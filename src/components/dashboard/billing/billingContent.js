/**
 * The five protections, as a list.
 *
 * They were five cards with proof panels — a live countdown, a tax table, an
 * account list, a detected-pattern panel. Individually good, together they
 * ran past the fold and pushed the plan panel off screen, so the screen that
 * exists to sell a subscription spent most of its height demonstrating
 * features to someone who had not yet seen the price.
 *
 * One line each. The demonstrations belong in the product, which they are
 * about to have for seven days.
 */

export const PROTECTIONS = [
  {
    id: 'kill',
    n: '01',
    title: 'Rule-based kill switch',
    body: 'At your limit we close your positions, cancel open orders and lock the day — in about 120ms, with the app closed.',
    gradient: 'linear-gradient(145deg,#ff8a80,#d63a2f)',
    color: '#fff',
    glyph: 'shield',
  },
  {
    id: 'manual',
    n: '02',
    title: 'Manual kill switch',
    body: 'Lock yourself out for 3, 6 or 12 hours. There is no cancel button, only the clock.',
    gradient: 'linear-gradient(145deg,#ffd666,#e0a400)',
    color: '#2a1a00',
    glyph: 'power',
  },
  {
    id: 'tax',
    n: '03',
    title: 'Tax management',
    body: 'Every trade reconciled into one financial-year P&L, with a report you can hand to your CA.',
    gradient: 'linear-gradient(145deg,#7cb0fd,#2563eb)',
    color: '#fff',
    glyph: 'receipt',
  },
  {
    id: 'accounts',
    n: '04',
    title: 'Up to 5 trading accounts',
    body: 'Each with its own rules, limits and guard. Switch between them in one tap.',
    gradient: 'linear-gradient(145deg,#5ff2d2,#00a98a)',
    color: '#04140f',
    glyph: 'windows',
  },
  {
    id: 'journal',
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
