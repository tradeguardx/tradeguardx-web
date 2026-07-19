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
 * `maxres` isn't generated for every upload, so callers fall back to `hq` on
 * an image error — `hq` always exists.
 */
export function demoVideoPoster(size = 'maxres') {
  const file = size === 'maxres' ? 'maxresdefault' : 'hqdefault';
  return `https://i.ytimg.com/vi/${DEMO_VIDEO_ID}/${file}.jpg`;
}

/** Privacy-preserving embed host, consistent with what the privacy page claims. */
export function demoVideoEmbedUrl({ autoplay = false } = {}) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  if (autoplay) params.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?${params.toString()}`;
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
