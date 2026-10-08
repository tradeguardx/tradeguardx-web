/**
 * Copy and demo values for the billing step's five protection cards.
 *
 * Every string, colour and number here comes from
 * reference/billing-setup.reference.dc.html and is copied rather than
 * interpreted. Separate from the components so fast refresh keeps working —
 * a module that exports both stops hot-reloading cleanly.
 *
 * The figures are ILLUSTRATIVE. They are a demonstration of what each
 * protection does, shown to someone who has no history with us yet, and the
 * tax card says so in its own footnote because that one is legally careful.
 */

export const PAIN_FIX = {
  killSwitch: {
    pain: 'You hit your daily limit, then take “one more” to win it back. One red trade becomes five.',
    fix: "At your limit we close your positions, cancel open orders and lock the day in about 120ms. It works even when you're not at the screen.",
  },
  manual: {
    pain: "you know you're tilted, but you can't stop clicking.",
    fix: "lock yourself out for 3, 6 or 12 hours. There's no cancel button, only the clock.",
  },
  tax: {
    pain: "a year of trades, and your CA wants a reconciled P&L you've never built.",
    fix: 'we reconcile every trade into one financial-year P&L, show two illustrative treatments, and export a report for your CA.',
  },
  accounts: {
    pain: "you scalp in one account and swing in another, but one set of rules can't fit both.",
    fix: 'every account gets its own rules, limits and guard. Switch between them in one tap.',
  },
  journal: {
    pain: 'you repeat the same mistake because you never wrote it down.',
    fix: 'a two-minute guided journal after each session. The AI reads your trades, puts a dollar cost on each habit, and suggests a rule to stop it.',
  },
};

export const KS_LOG = [
  { t: '14:12:03', c: '#ef4444', x: 'Loss limit reached' },
  { t: '14:12:03', c: '#f0b429', x: '3 positions closed · 2 orders cancelled' },
  { t: '14:12:03', c: '#00d4aa', x: 'Day locked until 05:30 tomorrow' },
];

export const TAX_ROWS = [
  { k: 'FY2026-27 economic P&L', v: '+₹8,930.90', c: '#2fe3bd' },
  { k: 'Trades reconciled', v: '1,284 of 1,284', c: '#f6f9fc' },
  { k: 'CA report', v: 'PDF + CSV ready', c: '#f6f9fc' },
];

export const ACCTS = [
  { name: 'Delta · Main', rules: '6 rules · −$220/day', state: 'ARMED', bg: 'rgba(0,212,170,.16)', fg: '#2fe3bd' },
  { name: 'Delta · Swing', rules: '3 rules · −$500/day', state: 'ARMED', bg: 'rgba(0,212,170,.16)', fg: '#2fe3bd' },
  { name: 'Delta · Scalp', rules: '4 rules · 10 trades/day', state: 'LOCKED', bg: 'rgba(240,180,41,.16)', fg: '#fbc94f' },
];

export const GLYPH = {
  shield: ['M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z', 'M12 8v4M12 15h.01'],
  power: ['M12 3v9', 'M6.4 6.6a8 8 0 1011.2 0'],
  receipt: ['M7 3h10v18l-2.5-1.6L12 21l-2.5-1.6L7 21V3z', 'M10 8h4M10 12h4'],
  windows: ['M4 7h11v11H4z', 'M9 4h11v11'],
  sparkle: ['M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z', 'M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z'],
  warn: ['M12 3.5l9 16H3l9-16z', 'M12 10v4M12 17h.01'],
  shieldPlain: ['M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z'],
};

/** Shared card shell: padding 22, r22, #0d1422 with a hairline ring. */
/*
 * Tighter than the reference's 22/22. At full width the five cards ran well
 * past a laptop fold, so the plan panel beside them — the thing the screen is
 * for — scrolled away while someone was still reading what they were buying.
 * Every size below came down together; shrinking padding alone just makes a
 * card look cramped around text that did not change.
 */
export const CARD = {
  display: 'flex',
  flexDirection: 'column',
  padding: 16,
  borderRadius: 18,
  background: '#0d1422',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)',
};
