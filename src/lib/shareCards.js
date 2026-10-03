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
 * What the card says about the product, to someone who has never heard of it.
 *
 * A share card travels to people with no context. Everything else on it — the
 * figures, the chart, the rules — assumes you already know what a killswitch
 * is and that this one exists. These two lines are the only part written for
 * the stranger, which makes them the part that converts.
 *
 * Kept here rather than inline so the claim is in one place: it is a marketing
 * statement on an artefact we hand to users to publish under their own names,
 * and it has to stay true as venues come and go.
 */
/**
 * The venue mark on the card.
 *
 * It was hard-coded to Delta — logo, orange dot and all — so a Shark account's
 * card told the world the trade happened somewhere it did not. On an artefact
 * the user posts under their own name that is not a styling slip, it is a
 * false statement about their own trading.
 *
 * Colours are each venue's own, so the chip reads as theirs rather than ours.
 */
const VENUES = {
  delta_india: { name: 'Delta Exchange', mark: '\u0394', bg: '#fd7d02', fg: '#2a1400' },
  delta_global: { name: 'Delta Global', mark: '\u0394', bg: '#fd7d02', fg: '#2a1400' },
  coindcx: { name: 'CoinDCX', mark: 'C', bg: '#1a73e8', fg: '#eaf2ff' },
  shark: { name: 'Shark', mark: 'S', bg: '#12b5a6', fg: '#02261f' },
};

export function venueMark(slug) {
  if (!slug) return null;
  const key = String(slug).toLowerCase();
  if (VENUES[key]) return VENUES[key];
  // An unmapped venue still gets a correct NAME; only the styling falls back.
  const name = key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { name, mark: name.charAt(0).toUpperCase(), bg: '#4b5a72', fg: '#eef3fa' };
}

export const BRAND = {
  tagline: 'India\u2019s first crypto killswitch',
  venues: 'Live on Delta \u00b7 CoinDCX \u00b7 Shark',
};

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
export function shareCard(kind, { amounts = true, cards = null, mask = MASK, sym = '$' } = {}) {
  // `cards` is the account's real figures, built by shareBuild.js. The static
  // table below it is the design handoff's demo data, which must never reach a
  // user: it describes a stranger's SOL trade. Callers that have real data
  // pass it; the standalone preview page does not.
  const src = (cards && cards[kind]) || SHARE_CARDS[kind] || SHARE_CARDS.trade;
  const c = { ...src };
  if (!amounts) {
    const dots = `${sym}•••`;
    c.hero = dots;
    c.dec = '';
    c.pill = c.pillRed ? `−${dots}` : `+${dots}`;
    c.pillText = 'amounts hidden';
    c.cap = String(c.cap ?? '').replace(mask, dots);
    /*
     * EVERY FIGURE, NOT THE ONES THAT EXISTED WHEN THIS WAS WRITTEN.
     *
     * The card grew a sub-line under the hero and a row of tiles, and both
     * carry money. Masking four named fields meant the toggle hid the hero
     * and the pill while "+₹61,496.54", "−₹11,220.42" and "₹72,716.96
     * avoided" stayed on the card — the figures a user turns this off to
     * avoid publishing, left in the three places they are easiest to read.
     *
     * So the sweep is over everything that can hold one, and `hide` runs the
     * same regex the caption uses rather than naming fields, because the next
     * field someone adds will not be named here either.
     */
    const hide = (v) => (v == null ? v : String(v).replace(mask, dots));
    c.heroSub = hide(c.heroSub);
    c.heldLabel = hide(c.heldLabel);
    c.savedLabel = hide(c.savedLabel);
    c.headline = hide(c.headline);
    c.label = hide(c.label);
    c.meta = hide(c.meta);
    if (Array.isArray(c.tiles)) c.tiles = c.tiles.map((t) => ({ ...t, v: hide(t.v) }));
  }
  return c;
}

/**
 * `card.cap` plus the referral tail. The code is what makes a share earn.
 *
 * Until the rewards system issues real codes there is nothing to append, and
 * a made-up one would send every friend who typed it to a dead link and credit
 * the sharer nothing. No code, no /r/ path.
 */
export function shareCaption(card, referral) {
  const tail = referral ? `tradeguardx.com/r/${referral}` : 'tradeguardx.com';
  return `${card.cap} Would yours hold? ${tail}`;
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
      msg: 'Sent to Instagram — attach the saved card to a post or a Story',
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

/*
 * Always PNG, because that is always what you get.
 *
 * It read "Download MP4" under the reel, which is a promise the product
 * cannot keep: the reel is a DOM animation and there is no video export yet.
 * The button now names the file it actually writes in both formats.
 */
export const DOWNLOAD_LABEL = () => 'Download PNG';
/**
 * The prototype's success lines. Kept for the sizes they name — the modal now
 * builds its own message from the file it actually wrote, because the reel's
 * MP4 does not exist yet and this one claimed it had been saved.
 */
export const DOWNLOAD_MSG = (fmt) =>
  fmt === 'card'
    ? 'Saved tradeguardx-card.png (1080 × 1350)'
    : 'Saved tradeguardx-reel.mp4 (1080 × 1920, 18 s)';

/** The link every card carries, and the one a web intent publishes. */
export function shareLink(referral) {
  return referral ? `https://tradeguardx.com/r/${referral}` : 'https://tradeguardx.com';
}

/**
 * Where a destination button goes when the browser has no native share sheet.
 *
 * Only three of the five can be opened with content: WhatsApp, Telegram and X
 * all take a prefilled text intent. Instagram and Discord have no web compose
 * endpoint at all — nothing we can open will carry either the caption or the
 * image — so those are `manual`, and the modal says so rather than claiming a
 * post was opened.
 *
 * None of the three can carry the PNG either: a web intent is text-only. The
 * modal therefore saves the file first and tells the user to attach it, which
 * is the truthful version of the prototype's "Opened WhatsApp with your card
 * and caption".
 */
export function shareIntent(name, { caption, referral = null } = {}) {
  // No default code. 'ARJUN14' is the handoff's demo, and defaulting to it put
  // a stranger's referral into the Telegram link of every share.
  const text = encodeURIComponent(caption ?? '');
  switch (name) {
    case 'WhatsApp':
      return { url: `https://wa.me/?text=${text}`, manual: false };
    case 'Telegram':
      return { url: `https://t.me/share/url?url=${encodeURIComponent(shareLink(referral))}&text=${text}`, manual: false };
    case 'X':
      return { url: `https://twitter.com/intent/tweet?text=${text}`, manual: false };
    default:
      return { url: '', manual: true };
  }
}

/** The exported PNG is this component at 432×540 × 2.5 — exactly 1080×1350. */
export const EXPORT = { width: 432, pixelRatio: 2.5, bg: '#080a14' };

/**
 * THE SHAPE. Singular.
 *
 * There were three — Post 4:5, Story 9:16 and Square 1:1 — with a picker in
 * the modal to choose between them. It cost a section of the panel, three
 * versions of the composition to keep in agreement, and a decision from
 * someone who came here to post a trade and now had to think about aspect
 * ratios.
 *
 * 4:5 is the one every platform in the Share-to row takes as-is: Instagram
 * feed, X, Telegram, WhatsApp and Discord all render it without cropping. The
 * other two were a choice between the shape that always works and two that
 * sometimes do, which is not a choice worth asking anyone to make.
 *
 * 1080 x 1350, and it divides into whole pixels at EXPORT.pixelRatio — a
 * fractional height there is a half-pixel row of background along the bottom
 * edge of every card.
 */
export const SHARE_SIZE = { key: 'post', label: 'Post', sub: '4:5', w: 1080, h: 1350 };

/** File name for a saved card. One place so the success line cannot drift. */
export function exportFileName(kind) {
  return `tradeguardx-${kind}-card.png`;
}

/** The four cards on the Overview strip. Colours and glyphs are the handoff's. */
export const STRIP_ITEMS = [
  {
    kind: 'trade',
    // The 1.5px gradient frame the card sits inside, and Guardy's two body
    // tones plus his mouth for the shield portrait. All from the reference.
    frame: 'linear-gradient(140deg,#9be3ff,rgba(122,215,255,.15) 40%,rgba(122,215,255,.15) 60%,#5ff2d2)',
    c1: '#5ff2d2',
    c2: '#00b893',
    mood: 'M-30 34 Q0 64 30 34 Q0 40 -30 34',
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
    // The 1.5px gradient frame the card sits inside, and Guardy's two body
    // tones plus his mouth for the shield portrait. All from the reference.
    frame: 'linear-gradient(140deg,#ffe28a,rgba(177,145,251,.15) 40%,rgba(177,145,251,.15) 60%,#c4b0ff)',
    c1: '#ffe28a',
    c2: '#e09a00',
    mood: 'M-30 34 Q0 64 30 34 Q0 40 -30 34',
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
    // The 1.5px gradient frame the card sits inside, and Guardy's two body
    // tones plus his mouth for the shield portrait. All from the reference.
    frame: 'linear-gradient(140deg,#c4b0ff,rgba(177,145,251,.15) 40%,rgba(177,145,251,.15) 60%,#ff7ad9)',
    c1: '#c4b0ff',
    c2: '#7c3aed',
    mood: 'M-30 34 Q0 58 30 34',
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
    // The 1.5px gradient frame the card sits inside, and Guardy's two body
    // tones plus his mouth for the shield portrait. All from the reference.
    frame: 'conic-gradient(from 210deg,#ffe27a,#ff7ad9,#7ad7ff,#7affd4,#ffe27a)',
    c1: '#ffe28a',
    c2: '#e09a00',
    mood: 'M-30 34 Q0 64 30 34 Q0 40 -30 34',
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

/** The day card's six bars. */
export const DAY_BARS = ['22%', '34%', '30%', '52%', '70%', '100%'];

/**
 * The month card's 21-day heat strip, one cell per trading day.
 *
 * G and R are the handoff's own string, kept as a string so the sequence stays
 * readable and reviewable rather than becoming 21 opaque objects.
 */
export const MONTH_HEAT = 'GRGGRGGRGRRGRGRGGRGRG'
  .split('')
  .map((c) => ({ bg: c === 'G' ? 'rgba(47,227,189,.85)' : 'rgba(255,122,112,.75)' }));

/** The week card's mini chart: red days hang below the baseline. */
export const WEEK_BARS = [
  { hu: '46%', hd: '0%', g: false },
  { hu: '0%', hd: '100%', g: true },
  { hu: '64%', hd: '0%', g: false },
  { hu: '0%', hd: '100%', g: true },
  { hu: '100%', hd: '0%', g: false },
];

/**
 * "Next to unlock": only the goals still locked, with their progress.
 *
 * Four of six are already earned, which is what the counter beside the heading
 * says — showing the earned ones again here would make the section a list of
 * things the user has rather than a reason to come back.
 */
export const STRIP_LOCKED = [
  { name: '10-day green streak', note: '6 of 10 days', tier: 'EPIC', pct: '60%', gem: 'var(--surface-3)', glyph: 'M13 3L5 13h6l-1 8 8-10h-6l1-8z', locked: true },
  { name: 'Diamond discipline', note: '38 of 90 days, no breaks', tier: 'LEGENDARY', pct: '42%', gem: 'var(--surface-3)', glyph: 'M6 3h12l3 6-9 12L3 9l3-6zM3 9h18', locked: true },
];

export const ACHIEVEMENTS_EARNED = 4;
export const ACHIEVEMENTS_TOTAL = 6;

/** The default rule chips on a card. Production passes the real four. */
export const DEFAULT_RULE_CHIPS = ['−$220 max loss', '+$400 target', '6 trades/day', '1% risk'];
