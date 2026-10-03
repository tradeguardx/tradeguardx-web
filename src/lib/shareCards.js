/**
 * Share-card data, ported from the design handoff's `shareVals()`
 * (reference/06_logic.reference.js).
 *
 * Four cards — trade, day, week, month — each a closed period the rules held
 * through. The card is the artefact; this file is every string and every
 * derived value behind it.
 *
 * In production the figures come from the existing journal and ledger. The
 * handoff is explicit that nothing new is computed server-side: whatever Trade
 * detail and Journal already show is what a card may claim. A card that quotes
 * a number the app does not otherwise display is a number nobody can check.
 */

/** The per-card copy. Every string is the handoff's, verbatim. */
export const SHARE_CARDS = {
  trade: {
    tab: 'This trade',
    sym: 'SOLUSD',
    meta: 'Long · 8x',
    badge: 'Guard closed',
    label: 'Saved by my rule',
    hero: '$921',
    dec: '.80',
    pill: '−$218.40',
    pillRed: true,
    pillText: 'instead of −$1,140.20 at the day’s low',
    ach: 'Saved by the guard',
    tier: 'RARE',
    date: '30 Sep 2026',
    reelStory: 'trade',
    cap: 'My loss limit closed SOL at −$218.40. It kept falling to −$1,140.20. Saved $921.80 by a rule I set while calm.',
  },
  day: {
    tab: 'Today',
    sym: 'Daily recap',
    meta: '6 trades · Tue 29 Sep',
    badge: 'Day locked',
    label: 'Kept by my lock',
    hero: '$585',
    dec: '.40',
    pill: '+$400.00',
    pillRed: false,
    pillText: 'banked, instead of −$185.40 by the close',
    ach: 'Quit while ahead',
    tier: 'EPIC',
    date: '29 Sep 2026',
    reelStory: 'day',
    cap: 'Hit my +$400 target and the day locked. Kept going would have ended at −$185.40.',
  },
  week: {
    tab: 'This week',
    sym: 'Weekly recap',
    meta: '28 Sep – 2 Oct',
    badge: 'Green week',
    label: 'The guard was worth',
    hero: '$2,615',
    dec: '.20',
    pill: '+$1,248.30',
    pillRed: false,
    pillText: 'instead of −$1,366.90 without it',
    ach: 'Green week, rules held',
    tier: 'EPIC',
    date: 'Week 40 · 2026',
    reelStory: 'week',
    cap: '3 green days, 2 red days stopped at −$220. Week closed +$1,248.30 instead of −$1,366.90.',
  },
  month: {
    tab: 'September',
    sym: 'Monthly recap',
    meta: 'September · 21 days',
    badge: 'Green month',
    label: 'The guard was worth',
    hero: '$11,052',
    dec: '.70',
    pill: '+$4,812.60',
    pillRed: false,
    pillText: 'instead of −$6,240.10 without it',
    ach: 'Rule-proof month',
    tier: 'LEGENDARY',
    date: 'Sep 2026',
    reelStory: 'month',
    cap: 'September: +$4,812.60 with my rules locked. Without them, −$6,240.10.',
  },
};

export const SHARE_KINDS = ['trade', 'day', 'week', 'month'];

/**
 * Every money figure in a string, replaced with $•••.
 *
 * The regex has to catch the sign too, or "−$218.40" becomes "−$•••" in the
 * pill and "$•••" in the caption — the same hidden number formatted two ways
 * on one screen. It also has to catch the grouped thousands and the decimals,
 * so "$1,140.20" does not leave ",140.20" behind, which would be a worse leak
 * than showing the figure outright.
 */
const MASK = /[−+]?\$[\d,]+(\.\d+)?/g;

/**
 * The card for a kind, with amounts optionally hidden.
 *
 * Hiding is not cosmetic. A user sharing to a public timeline may want the
 * story — a rule fired, it was worth it — without publishing their account
 * size. If any one figure survives the mask, the toggle has lied to them.
 */
export function shareCard(kind, { amounts = true } = {}) {
  const c = { ...(SHARE_CARDS[kind] || SHARE_CARDS.trade) };
  if (!amounts) {
    c.hero = '$•••';
    c.dec = '';
    c.pill = c.pillRed ? '−$•••' : '+$•••';
    c.pillText = 'amounts hidden';
    c.cap = c.cap.replace(MASK, '$•••');
  }
  return c;
}

/** `card.cap` plus the referral tail. The code is what makes a share earn. */
export function shareCaption(card, referral = 'ARJUN14') {
  return `${card.cap} Would yours hold? tradeguardx.com/r/${referral}`;
}

/**
 * A segmented-control segment: which of a set is active, and the three style
 * values that express it. Kept as data rather than a CSS class because the
 * handoff specifies the exact background, foreground and shadow per state.
 */
export function segment(active, k, v) {
  const on = String(active) === String(v);
  return {
    k,
    v: String(v),
    bg: on ? 'var(--surface)' : 'transparent',
    fg: on ? 'var(--ink)' : 'var(--ink-3)',
    sh: on ? '0 1px 3px rgba(0,0,0,.25)' : 'none',
  };
}

/**
 * The five share destinations.
 *
 * `s` is a stroked path, `f` a filled one — the glyphs are drawn as two paths
 * because a single path cannot be both. The handoff notes these are
 * approximations and that the official brand SVGs must replace them before
 * launch; that is a trademark matter, not a visual one.
 */
export function shareTargets(fmt = 'card') {
  const noun = fmt === 'card' ? 'card' : 'reel';
  return [
    {
      name: 'WhatsApp',
      bg: '#25D366',
      fg: '#fff',
      s: 'M12 3.5a8.5 8.5 0 00-7.3 12.9L3.5 20.5l4.2-1.1A8.5 8.5 0 1012 3.5z',
      f: 'M9.2 7.8c-.3 0-.7.1-.9.5-.3.4-.8 1-.8 2.3s.9 2.6 1 2.8c.2.2 1.8 2.8 4.4 3.8 2.1.8 2.6.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3l-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.3 0-.4.1-.5l.4-.5.3-.5c.1-.2 0-.3 0-.5l-.8-2c-.2-.5-.4-.5-.6-.5h-.3z',
      msg: `Opened WhatsApp with your ${noun} and caption`,
    },
    {
      name: 'Telegram',
      bg: '#229ED9',
      fg: '#fff',
      s: '',
      f: 'M20.6 4.2L2.9 11c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.3c.2.6.4.8.8.8.4 0 .6-.2.9-.4l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14c.3-1.2-.5-1.8-1.4-1.4zM9.4 14.4l8.4-7.6c.4-.3-.1-.5-.6-.2L7.8 12.6',
      msg: `Opened Telegram with your ${noun} and caption`,
    },
    {
      name: 'X',
      bg: '#0b0b0b',
      fg: '#fff',
      s: '',
      f: 'M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z',
      msg: `Opened a post on X with your ${noun} attached`,
    },
    {
      name: 'Instagram',
      bg: 'radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)',
      fg: '#fff',
      s: 'M7.5 3h9A4.5 4.5 0 0121 7.5v9a4.5 4.5 0 01-4.5 4.5h-9A4.5 4.5 0 013 16.5v-9A4.5 4.5 0 017.5 3zM12 8a4 4 0 110 8 4 4 0 010-8z',
      f: 'M17.2 5.6a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2z',
      msg: 'Sent to Instagram Stories — the 9:16 version is used',
    },
    {
      name: 'Discord',
      bg: '#5865F2',
      fg: '#fff',
      s: '',
      f: 'M19.3 5.3A16.6 16.6 0 0015.2 4l-.5 1a15.4 15.4 0 00-5.4 0l-.5-1a16.6 16.6 0 00-4.1 1.3C2.1 9.2 1.4 13 1.8 16.7a16.7 16.7 0 005 2.5l1.1-1.7a10.8 10.8 0 01-1.7-.8l.4-.3a11.9 11.9 0 0010.8 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.7 16.7 0 005-2.5c.5-4.3-.8-8.1-2.9-11.4zM8.7 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z',
      msg: 'Copied for Discord — paste it into any channel',
    },
  ];
}

export const DOWNLOAD_LABEL = (fmt) => (fmt === 'card' ? 'Download PNG' : 'Download MP4');
export const DOWNLOAD_MSG = (fmt) =>
  fmt === 'card'
    ? 'Saved tradeguardx-card.png (1080 × 1350)'
    : 'Saved tradeguardx-reel.mp4 (1080 × 1920, 18 s)';

/** The four cards on the Overview strip. Colours and glyphs are the handoff's. */
export const STRIP_ITEMS = [
  {
    kind: 'trade',
    k: 'Last trade',
    ach: 'Saved by the guard',
    v: '$921.80',
    vLabel: 'saved',
    note: 'SOLUSD · loss limit closed it',
    fresh: true,
    tier: 'RARE',
    orb: 'rgba(0,212,170,.55)',
    orb2: 'rgba(122,215,255,.35)',
    accent: '#3ff0c8',
    tierBg: 'rgba(122,215,255,.2)',
    tierFg: '#7ad7ff',
    d1: 'M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z',
    d2: 'M9 12l2.2 2.2L15.5 10',
  },
  {
    kind: 'day',
    k: 'Yesterday',
    ach: 'Quit while ahead',
    v: '+$400',
    vLabel: 'locked',
    note: 'Daily target held the day',
    fresh: false,
    tier: 'EPIC',
    orb: 'rgba(240,180,41,.55)',
    orb2: 'rgba(255,122,217,.3)',
    accent: '#fbc94f',
    tierBg: 'rgba(177,145,251,.22)',
    tierFg: '#c4b0ff',
    d1: 'M7 11V8a5 5 0 0110 0v3',
    d2: 'M5 11h14v9H5z',
  },
  {
    kind: 'week',
    k: 'This week',
    ach: 'Green week',
    v: '3',
    vLabel: 'green days of 5',
    note: 'Both red days stopped at −$220',
    fresh: false,
    tier: 'EPIC',
    orb: 'rgba(124,58,237,.6)',
    orb2: 'rgba(0,212,170,.3)',
    accent: '#c4b0ff',
    tierBg: 'rgba(177,145,251,.22)',
    tierFg: '#c4b0ff',
    d1: 'M4 20h16',
    d2: 'M7 16v-4M12 16V7M17 16v-6',
  },
  {
    kind: 'month',
    k: 'September',
    ach: 'Rule-proof month',
    v: '+$4,812',
    vLabel: 'month',
    note: '0 rule edits all month',
    fresh: false,
    tier: 'LEGENDARY',
    orb: 'rgba(255,122,217,.5)',
    orb2: 'rgba(255,226,122,.4)',
    accent: '#ffe27a',
    tierBg: 'rgba(255,226,122,.2)',
    tierFg: '#ffe27a',
    d1: 'M12 3l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.5z',
    d2: '',
  },
];

/** The week card's mini chart: red days hang below the baseline. */
export const WEEK_BARS = [
  { hu: '46%', hd: '0%', g: false },
  { hu: '0%', hd: '100%', g: true },
  { hu: '64%', hd: '0%', g: false },
  { hu: '0%', hd: '100%', g: true },
  { hu: '100%', hd: '0%', g: false },
];

/** "Next to unlock": only the goals still locked, with their progress. */
export const STRIP_LOCKED = [
  { name: '10-day green streak', note: '6 of 10 days', tier: 'EPIC', pct: '60%' },
  { name: 'Diamond discipline', note: '38 of 90 days, no breaks', tier: 'LEGENDARY', pct: '42%' },
];

/** The default rule chips on a card. Production passes the real four. */
export const DEFAULT_RULE_CHIPS = ['−$220 max loss', '+$400 target', '6 trades/day', '1% risk'];
