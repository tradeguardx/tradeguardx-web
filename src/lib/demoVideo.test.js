import { describe, expect, it } from 'vitest';
import { DEMO_VIDEO, DEMO_VIDEO_ID, demoVideoEmbedUrl, demoVideoPoster, videoFor } from './demoVideo';

/**
 * THE WALKTHROUGH HAS TO MATCH THE PAGE IT IS ON.
 *
 * Every venue guide played one video — the Delta setup guide, "Connect Delta
 * Exchange for Automatic Risk Management". So a reader following the Shark
 * API-key steps pressed play and watched someone create a key on a different
 * exchange, with a different screen, different permissions, and none of the IP
 * whitelisting Shark requires. That is worse than no video: it makes the page
 * look like it was written for somewhere else.
 */
describe('which video a guide plays', () => {
  it('gives Shark its own', () => {
    const v = videoFor('shark');
    expect(v.id).toBe('UO748FFiThA');
    expect(v.id).not.toBe(DEMO_VIDEO_ID);
  });

  it('falls back to the general walkthrough for a venue without one', () => {
    // Delta's guide IS the general walkthrough, and CoinDCX has no video of
    // its own yet — the fallback is the right introduction to the product
    // even when it is not the right screencast.
    expect(videoFor('delta').id).toBe(DEMO_VIDEO_ID);
    expect(videoFor('coindcx').id).toBe(DEMO_VIDEO_ID);
    expect(videoFor(undefined).id).toBe(DEMO_VIDEO_ID);
    expect(videoFor('nonsense').id).toBe(DEMO_VIDEO_ID);
  });

  it('is case-insensitive, because slugs arrive from a URL', () => {
    expect(videoFor('Shark').id).toBe('UO748FFiThA');
  });

  it('says what language it is in before the click, where that differs', () => {
    // Someone who does not speak it should find out from the card, not from
    // ten seconds of a lightbox they have to close again.
    expect(videoFor('shark').lang).toBe('Hindi');
    expect(DEMO_VIDEO.lang).toBeUndefined();
  });
});

describe('the embed and the poster follow the video', () => {
  it('embeds the id it was given, not the default', () => {
    expect(demoVideoEmbedUrl({ id: 'UO748FFiThA' })).toContain('/embed/UO748FFiThA');
    expect(demoVideoPoster('maxres', 'UO748FFiThA')).toContain('/vi/UO748FFiThA/');
  });

  it('skips the title card only where there is one', () => {
    // A video with no intro keeps exactly the URL it always had.
    expect(demoVideoEmbedUrl({ id: 'x', start: 7 })).toContain('start=7');
    expect(demoVideoEmbedUrl({ id: 'x' })).not.toContain('start=');
    expect(demoVideoEmbedUrl({ id: 'x', start: 0 })).not.toContain('start=');
  });

  it('still defaults to the walkthrough for every existing caller', () => {
    expect(demoVideoEmbedUrl()).toContain(`/embed/${DEMO_VIDEO_ID}`);
    expect(demoVideoPoster()).toContain(`/vi/${DEMO_VIDEO_ID}/`);
  });

  it('keeps the privacy-preserving host the privacy page promises', () => {
    expect(demoVideoEmbedUrl({ id: 'UO748FFiThA' })).toContain('youtube-nocookie.com');
  });
});
