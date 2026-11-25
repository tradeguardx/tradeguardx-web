/**
 * One source of truth for the product walkthrough video.
 *
 * It now appears on the landing page, in the guides, in the welcome email, and
 * in VideoObject structured data. When the video is re-recorded, this is the
 * only id that changes.
 */

export const DEMO_VIDEO_ID = 'rHXl3EWuO6E';

export const DEMO_VIDEO_URL = `https://www.youtube.com/watch?v=${DEMO_VIDEO_ID}`;

/**
 * THE WALKTHROUGH IS PER VENUE, BECAUSE THE WALKTHROUGH IS PER VENUE.
 *
 * The id above is the Delta setup guide — "Connect Delta Exchange for
 * Automatic Risk Management" — and every venue guide played it, including
 * Shark's and CoinDCX's. A reader following the Shark API-key steps pressed
 * play and watched someone create a key on a different exchange, with a
 * different screen, different permissions and no IP whitelist step. That is
 * worse than no video: it makes the page look like it was written for
 * somewhere else.
 *
 * A venue with no video of its own falls back to the Delta one, which is
 * still the right general introduction to the product — but once a venue has
 * its own, that is what its guide plays.
 *
 * `start` skips a title card. `lang` is shown on the card: a reader who does
 * not speak the language should find that out before the lightbox opens, not
 * after.
 */
const VENUE_VIDEOS = {
  // "How to Connect Shark Exchange to a Kill Switch (2-Minute Setup)",
  // 24 Nov 2026; replaces the 13-minute Hindi walkthrough (UO748FFiThA),
  // which stays in the tutorials course.
  shark: {
    id: 'VtfAydIu_FQ',
    title: 'Watch: connect Shark Exchange to the kill switch',
    subtitle: 'Creating the API key, whitelisting the IP, ticking Trade Futures and connecting, in about two minutes.',
  },
  // "How to Connect Exness to a Kill Switch (Full Setup in 3 Minutes)",
  // published 23 Nov 2026 (owner, 24 Nov).
  exness: {
    id: 'mCfyRweWofY',
    title: 'Watch: connect Exness to the kill switch',
    subtitle: 'Choosing Exness, creating the API key with the exact settings, pasting it in and arming your rules, in about three minutes.',
  },
};

/** The default walkthrough, as a video descriptor. */
export const DEMO_VIDEO = {
  id: DEMO_VIDEO_ID,
  title: 'Watch the setup walkthrough',
  subtitle: 'The whole flow — API key, rules, and the kill switch firing — in about three minutes.',
};

/**
 * "How to use TradeGuardX" — the full setup across Delta, Shark and Exness
 * (owner, 13 Nov 2026). Shown on the first setup step, where someone is about
 * to choose an exchange and has not yet seen how any of it works.
 */
export const HOW_TO_USE_VIDEO = {
  // "How to Set Up a Crypto Kill Switch (Rules, Rule Lock & Live Test)",
  // 24 Nov 2026; replaces TR8aCHD_YCs, which showed the old dashboard.
  id: 'vYp5ddNgDk0',
  title: 'How to set up your kill switch',
  subtitle: 'Setting your rules, the rule lock, and a live trade on Shark that closes itself at the limit.',
};

/* Broker ids can carry a region ("shark-exchange", "delta-india"): match the
   venue by prefix, as venueFor() in venues.js does. */
const venueKey = (slug) => {
  const s = String(slug ?? '').toLowerCase();
  return Object.keys(VENUE_VIDEOS).find((k) => s === k || s.startsWith(`${k}-`) || s.startsWith(`${k}_`)) ?? null;
};

/** The venue's own walkthrough, or null when it has none (no Delta stand-in). */
export function ownVideoFor(venueSlug) {
  const k = venueKey(venueSlug);
  return k ? VENUE_VIDEOS[k] : null;
}

/*
 * Dashboard-only stop-gaps (owner, 25 Nov 2026): shown while connecting an
 * exchange that has no proper video yet, never on public pages or /tutorials.
 */
const DASH_ONLY_VIDEOS = {
  // "Delta Exchange ko Kill Switch se kaise connect karein? 2-min setup", a
  // Hindi Short. Replace once the full Delta video is recorded.
  delta: {
    id: 'OGmoEeUr3Hc',
    short: true,
    title: 'Watch: connect Delta Exchange to the kill switch',
    subtitle: 'Creating the Delta API key with Trading on, whitelisting our IP and connecting, in under two minutes.',
  },
};

/** For the dashboard: the venue's own video, else its dashboard-only stop-gap. */
export function dashVideoFor(venueSlug) {
  const own = ownVideoFor(venueSlug);
  if (own) return own;
  const s = String(venueSlug ?? '').toLowerCase();
  const k = Object.keys(DASH_ONLY_VIDEOS).find((x) => s === x || s.startsWith(`${x}-`) || s.startsWith(`${x}_`));
  return k ? DASH_ONLY_VIDEOS[k] : null;
}

/** The video a venue's guides should play, or the general walkthrough. */
export function videoFor(venueSlug) {
  return ownVideoFor(venueSlug) ?? DEMO_VIDEO;
}


/**
 * `maxres` isn't generated for every upload, so callers fall back to `hq` on
 * an image error — `hq` always exists.
 */
export function demoVideoPoster(size = 'maxres', id = DEMO_VIDEO_ID) {
  const file = size === 'maxres' ? 'maxresdefault' : 'hqdefault';
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`;
}

/** Privacy-preserving embed host, consistent with what the privacy page claims. */
export function demoVideoEmbedUrl({ autoplay = false, id = DEMO_VIDEO_ID, start = 0 } = {}) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  if (autoplay) params.set('autoplay', '1');
  // Skips a title card. Only set when there is one, so the URL of a video
  // without an intro stays exactly what it was.
  if (start > 0) params.set('start', String(Math.round(start)));
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/**
 * VideoObject structured data — lets the walkthrough surface as a video result
 * for "how to set up" queries, which is a much cheaper search win than the
 * head terms.
 *
 * `uploadDate` is required by Google; it's the video's publish date, so it is a
 * fixed constant rather than something derived at render time.
 */
export function demoVideoSchema() {
  return {
    '@type': 'VideoObject',
    name: 'TradeGuardX setup walkthrough — connect Delta Exchange and arm the kill switch',
    description:
      'Step-by-step setup: create a trading account, generate a Delta Exchange API key with trade-only permissions, set your daily loss limit and risk rules, and see the kill switch cancel orders and close positions when a limit is crossed.',
    thumbnailUrl: [demoVideoPoster('maxres')],
    uploadDate: '2026-07-17',
    embedUrl: demoVideoEmbedUrl(),
    contentUrl: DEMO_VIDEO_URL,
    publisher: {
      '@type': 'Organization',
      name: 'TradeGuardX',
      url: 'https://tradeguardx.com',
    },
  };
}
