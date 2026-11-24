/**
 * The TradeGuardX course (24 Nov 2026): every video as a lesson, grouped in
 * sections, played Udemy-style in one player at /tutorials and
 * /dashboard/tutorials.
 *
 * Lesson names are kept plain ("How to connect Exness"). The search phrasing
 * lives in `seoTitle`, used only for the VideoObject Google reads. Those
 * follow Google autocomplete for India, checked 24 Nov 2026: "kill switch
 * trading", "how to get exness api key", "does exness have kill switch",
 * "how to create api key in delta exchange india", "shark exchange api key",
 * "how to stop revenge trading", "how to stop overtrading".
 *
 * Video `seconds` and `uploaded` were read from YouTube the same day (Google
 * requires an upload date). `lang: 'Hindi'` only where the video's own title
 * is Hindi; nothing is guessed.
 *
 * Adding a broker video: give its lesson a `video`. A lesson without one shows
 * "Coming soon" with its written steps.
 *
 * Trading-strategy videos on the channel (the gold and Solana "liquidity"
 * challenges, "Liquidity explained") are deliberately NOT here: they would
 * read as trading advice.
 *
 * ONLY the playlist "Crypto Kill Switch Setup | TradeGuardX Tutorials"
 * (PLYhRgI8Az98s) is in here (owner, 24 Nov 2026): older uploads show the
 * old dashboard. A new playlist video goes in as a lesson; a broker without
 * one shows "Coming soon" with written steps.
 *
 * Each video also lives on the one existing page about its topic (`guide`):
 * the exchange API-key guides, /help/kill-switch, /help/changing-rules and
 * /security. Those pages carry the search intent; /tutorials collects the
 * videos as a course and links each one back to its page.
 *
 * Deep links: /tutorials#exness opens that lesson. Plain ESM, no JSX.
 */

export const CHANNEL_URL = 'https://www.youtube.com/@TradeGuardX';

export const SECTIONS = [
  { key: 'start', title: 'Getting started' },
  { key: 'connect', title: 'Connect your exchange' },
];

const STEP_OPEN = (name) => `In TradeGuardX, open Accounts → Add trading account → ${name}. Keep the form open: it shows our IP.`;
const STEP_RULES = 'Set your daily loss limit and switch the guard on.';

export const LESSONS = [
  // ── Getting started ─────────────────────────────────────────
  {
    key: 'set-up-rules', section: 'start',
    guide: '/help/kill-switch', guideLabel: 'Read: what happens when you break a rule',
    points: [
      'Manual vs rule-based kill switch, and when to use each',
      'Setting the rules: daily loss limit, daily profit target, max trades per day',
      'Rule lock: a 15-minute setup window, then your rules freeze (7 days by default)',
      'A live XRP short on Shark Exchange: the early warning, then the auto-close at the limit',
      'The lockout: trying to trade again, and why the order opens and is then closed',
    ],
    notes: [
      'The profit target never closes a winning trade that is still running. Once a closed trade takes you past it, new trades are blocked for the day.',
      'No exchange lets a third party block orders before they reach it. TradeGuardX closes any trade opened during a lockout as soon as it appears.',
      'Works with Delta Exchange, CoinDCX, Shark Exchange, Bybit and Exness.',
    ],
    chapters: [[0, 'This trade closed itself'], [11, 'Two kinds of kill switch'], [41, 'Setting the rules'], [71, 'Rule lock'], [98, 'Live test on Shark Exchange'], [125, 'The kill switch fires'], [151, 'Locked out: trying to trade anyway'], [175, 'Wrap-up']],
    title: 'How to set up your kill switch',
    seoTitle: 'How to set up a crypto kill switch: rules, rule lock and a live test',
    desc: 'Manual or rule-based, setting a daily loss limit, profit target and max trades, the rule lock, then a live trade on Shark that closes itself at the limit.',
    video: { id: 'vYp5ddNgDk0', seconds: 192, uploaded: '2026-11-24' },
  },
  {
    key: 'rule-lock', section: 'start',
    guide: '/help/changing-rules', guideLabel: 'Read: how rule lock works',
    points: [
      'What rule lock does, and why tightening is frozen too',
      'Your options: Off, 3 days, 7 days (default) or 30 days',
      'With the lock Off: edit rules only in the morning, before your first trade',
      'The 15-minute setup window: change anything after you save, including the lock itself',
      'Never locked: switching a rule on',
    ],
    notes: [
      'Need to change a rule mid-lock? Raise a support ticket.',
    ],
    chapters: [[0, 'Your calm self sets the rules'], [8, 'What rule lock does'], [23, 'Off, 3, 7 or 30 days'], [29, 'When the lock is Off'], [42, 'The 15-minute setup window'], [54, 'Example: a 3-day lock'], [63, 'Changing it mid-lock'], [74, 'Never locked: turning rules on'], [80, 'Wrap-up']],
    title: 'Rule lock explained',
    seoTitle: 'Rule lock explained: why you can’t change your trading rules mid-day',
    desc: 'Why your rules freeze after setup: Off, 3, 7 or 30 days, the 15-minute setup window, and what is never locked.',
    video: { id: 'ybcBeL4oG9w', seconds: 92, uploaded: '2026-11-24' },
  },
  {
    key: 'is-my-money-safe', section: 'start',
    guide: '/security', guideLabel: 'Read: how we keep your key safe',
    faq: [
      ['Are my funds safe?', 'The API key can read and trade, but never withdraw. Your funds stay in your own exchange wallet. The key is locked to our server’s IP and encrypted before it is stored.'],
      ['Can TradeGuardX open trades with my key?', 'No. It is only used to cancel orders and close positions when one of your rules breaks.'],
      ['Can I remove my API key?', 'Yes. You can replace or disconnect it in TradeGuardX whenever no lock is running.'],
      ['Can I remove it during a lock?', 'Not in TradeGuardX. That is what makes the lock hold.'],
      ['Can I delete the key on the exchange?', 'Yes, at any time. Then we can no longer close anything, and we tell you the key stopped working.'],
      ['Does it work when I trade from the exchange’s mobile app?', 'Yes. Trades from the exchange website, its phone app and bots are all seen and acted on within seconds.'],
      ['Can I switch my rules off?', 'Rules can be loosened only before your first trade of the day. Switching a rule on is always allowed.'],
      ['What happens to open positions when it fires?', 'It cancels open orders, closes positions, checks you are flat, then locks the account.'],
    ],
    chapters: [[0, 'Intro'], [10, 'Are my funds safe?'], [26, 'Can TradeGuardX open trades with my key?'], [40, 'Can I remove my API key?'], [51, 'Can I remove it during a lock?'], [61, 'Can I delete the key on the exchange?'], [78, 'Does it work from the exchange’s mobile app?'], [93, 'Can I switch my rules off?'], [104, 'What happens to open positions when it fires?'], [121, 'Do I even need it?'], [134, 'Your question?']],
    title: 'Is my money safe? Your questions answered',
    seoTitle: 'Can a kill switch withdraw my funds? TradeGuardX FAQ',
    desc: 'Funds, what the key can and cannot do, removing it during a lock, the exchange’s mobile app, and what happens to open positions when it fires.',
    video: { id: 'ajr7xr3di0U', seconds: 145, uploaded: '2026-11-24' },
  },

  // ── Connect your exchange ───────────────────────────────────
  {
    key: 'exness', section: 'connect', venue: 'exness',
    notes: [
      'Works only with Exness platform accounts (Exness Terminal and web terminal). MT4 and MT5 accounts are not supported.',
      'Forex, metals and crypto work. Indices (US Tech, S&P 500, Dow, DAX) do not, because Exness won’t close them through its API.',
      'Exness shows the secret only once. Never share your API key or secret.',
    ],
    chapters: [[0, 'Intro'], [11, 'Sign in'], [21, 'Choose Exness'], [28, 'Name the account'], [35, 'Connect the key (MT4/MT5 and indices note)'], [78, 'Create the API key on Exness'], [107, 'Expiry, allowed IP and public key'], [127, 'Confirm on Exness'], [133, 'Paste API key, secret and account ID'], [157, 'Your revenge report'], [181, 'Choose a plan']],
    title: 'How to connect Exness',
    seoTitle: 'How to get an Exness API key and connect a kill switch',
    desc: 'Create the Exness API key with the exact settings, paste it in and arm your rules, in about three minutes.',
    video: { id: 'mCfyRweWofY', seconds: 205, uploaded: '2026-11-23' },
    guide: '/exchanges/exness/api-key',
    steps: [
      STEP_OPEN('Exness'),
      'On my.exness.com, open API management and press New API key. Only Exness platform accounts can have one; MT4 and MT5 cannot.',
      'Tick Trading with Full access (not Read-only), set Expiry to Never, and add our IP under Allowed IPs.',
      'Paste the API key, the secret and your account number into TradeGuardX.',
      STEP_RULES,
    ],
  },  {
    key: 'shark', section: 'connect', venue: 'shark',
    notes: [
      'Use a laptop or desktop. The Shark mobile app can’t create API keys.',
      'Tick Trade Futures. A read-only key connects fine but can’t close anything, so the kill switch would do nothing.',
      'Key settings: label tradeguardx, our IP in the whitelist, permissions Read + Trade Futures.',
    ],
    chapters: [[0, 'Intro'], [10, 'Add Shark Exchange'], [20, 'Connect the key'], [42, 'Open API Management on Shark'], [48, 'Create the API key and whitelist the IP'], [63, 'Verify with OTP'], [69, 'Tick Trade Futures (don’t skip this)'], [87, 'Paste the key and connect'], [92, 'Choose your alerts'], [102, 'Connected']],
    title: 'How to connect Shark Exchange',
    seoTitle: 'How to connect Shark Exchange to a kill switch: API key in 2 minutes',
    desc: 'Create the Shark API key, whitelist our IP, turn on Trade Futures and connect, in about two minutes.',
    video: { id: 'VtfAydIu_FQ', seconds: 119, uploaded: '2026-11-24' },
    guide: '/exchanges/shark/api-key',
    steps: [
      STEP_OPEN('Shark Exchange'),
      'On Shark, on a laptop or desktop (the app cannot create keys), open API Management and create a key named tradeguardx.',
      'Add our IP to its whitelist and confirm with the OTP Shark sends to your phone.',
      'Tick Trade Futures. It is off by default, and a read-only key cannot close a position.',
      'Copy the secret straight away (Shark shows it once), paste the key and secret into TradeGuardX and press Connect.',
      STEP_RULES,
    ],
  },  {
    key: 'delta', section: 'connect', venue: 'delta',
    title: 'How to connect Delta Exchange',
    seoTitle: 'How to create an API key on Delta Exchange India and connect a kill switch',
    desc: 'The new video is on its way. Until then, the steps below and the written guide cover everything.',
    // Stop-gap, DASHBOARD ONLY (owner, 25 Nov 2026): a 101 s Hindi Short until
    // the proper Delta video is recorded. Deliberately not `video`, so it stays
    // out of /tutorials, the sitemap, VideoObject and the public guide pages.
    dashVideo: { id: 'OGmoEeUr3Hc', seconds: 101, lang: 'Hindi', short: true },
    guide: '/exchanges/delta/api-key',
    steps: [
      STEP_OPEN('Delta Exchange'),
      'On Delta, create an API key and tick Trading. Read Data stays on, and there is no withdrawal option.',
      'Whitelist our IP on the key. Delta requires it for Trading keys.',
      'Paste the API key and secret into TradeGuardX.',
      STEP_RULES,
    ],
  },  {
    key: 'coindcx', section: 'connect', venue: 'coindcx',
    title: 'How to connect CoinDCX',
    desc: 'The video is on its way. Until then, the steps below and the written guide cover everything.',
    guide: '/exchanges/coindcx/api-key',
    steps: [
      STEP_OPEN('CoinDCX'),
      'On CoinDCX, create an API key and bind it to our IP.',
      'Paste the API key and secret into TradeGuardX.',
      STEP_RULES,
    ],
  },  {
    key: 'bybit', section: 'connect', venue: 'bybit',
    title: 'How to connect Bybit',
    desc: 'The video is on its way. Until then, the steps below and the written guide cover everything.',
    guide: '/exchanges/bybit/api-key',
    steps: [
      STEP_OPEN('Bybit'),
      'On Bybit, create an API key with Read-Write permissions, and tick Orders and Positions under Contract.',
      'Restrict the key to our IP. Bybit deletes a key with no IP after 90 days.',
      'Paste the API key and secret into TradeGuardX.',
      STEP_RULES,
    ],
  },];

/** Lessons that have a video, for the schema and "N videos" counts. */
export const VIDEO_LESSONS = LESSONS.filter((l) => l.video);

/** "3:25", "13:11". */
export function formatLength(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** ISO 8601 duration for VideoObject: PT3M25S. */
export function isoDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  return `PT${m ? `${m}M` : ''}${s % 60}S`;
}

/** "7 min", to the nearest minute, at least 1. */
export const minutes = (seconds) => `${Math.max(1, Math.round((Number(seconds) || 0) / 60))} min`;

export const lessonsIn = (section) => LESSONS.filter((l) => l.section === section);

/** The lesson a hash or broker id points at ("exness", "delta-india" → delta). */
export function lessonFor(key) {
  const s = String(key ?? '').toLowerCase();
  if (!s) return null;
  return LESSONS.find((l) => l.key === s)
    ?? LESSONS.find((l) => l.venue && !l.quick && (s.startsWith(`${l.venue}-`) || s.startsWith(`${l.venue}_`)))
    ?? null;
}

/** A lesson's video for the dashboard: its course video, else a dashboard-only
 *  stop-gap (`dashVideo`, never shown on public pages). */
export const dashVideoOf = (l) => l?.video ?? l?.dashVideo ?? null;

/** An exchange's main connect video, as { id, title, seconds, lang, start, short }, or null.
 *  Dashboard only, so it includes `dashVideo` stop-gaps. */
export function connectTutorialFor(slug) {
  const l = lessonFor(slug);
  const v = dashVideoOf(l);
  if (!l || l.section !== 'connect' || l.quick || !v) return null;
  return { ...v, title: l.title };
}

/** Cover image: the video's own designed thumbnail (for a Short its 9:16
 *  cover sits mid-frame, so object-fit: cover crops a tall box to it). */
export const coverFor = (id) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
export const fallbackCoverFor = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** A lesson's video as the card the content pages play (WatchDemoCard), or null. */
export function videoCardFor(key) {
  const l = LESSONS.find((x) => x.key === key);
  if (!l?.video) return null;
  return { id: l.video.id, start: l.video.start, lang: l.video.lang, title: `Watch: ${l.title.charAt(0).toLowerCase()}${l.title.slice(1)}`, subtitle: l.desc };
}

/** schema.org VideoObject for a lesson, for the page it lives on. */
export function videoObjectFor(key) {
  const l = LESSONS.find((x) => x.key === key);
  if (!l?.video) return null;
  const v = l.video;
  const watch = `https://www.youtube.com/watch?v=${v.id}`;
  return {
    '@type': 'VideoObject',
    name: l.seoTitle ?? l.title,
    description: l.desc,
    thumbnailUrl: [coverFor(v.id), fallbackCoverFor(v.id)],
    uploadDate: v.uploaded,
    duration: isoDuration(v.seconds),
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`,
    contentUrl: watch,
    inLanguage: v.lang === 'Hindi' ? 'hi' : 'en',
    ...(l.chapters ? {
      hasPart: l.chapters.map(([sec, label], i) => ({
        '@type': 'Clip', name: label, startOffset: sec, endOffset: l.chapters[i + 1]?.[0] ?? v.seconds, url: `${watch}&t=${sec}s`,
      })),
    } : {}),
  };
}
