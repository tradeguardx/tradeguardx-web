import { describe, expect, it } from 'vitest';
import { STORIES } from './reelStories';
import {
  DOWNLOAD_LABEL,
  EXPORT,
  exportFileName,
  shareIntent,
  shareLink,
  SHARE_CARDS,
  SHARE_KINDS,
  SHARE_SIZE,
  STRIP_ITEMS,
  WEEK_BARS,
  segment,
  shareCaption,
  shareCard,
  shareTargets,
} from './shareCards';

/**
 * "Show dollar amounts" is the test that matters here.
 *
 * Someone sharing to a public timeline may want the story — a rule fired, it
 * was worth it — without publishing their account size. The toggle promises
 * that. If one figure survives the mask anywhere, in the hero, the pill, the
 * pill text or the caption, the toggle has lied to them, and it has lied in a
 * screenshot they cannot take back.
 */

describe('hiding amounts', () => {
  it('leaves no digits anywhere on the card', () => {
    for (const kind of SHARE_KINDS) {
      const c = shareCard(kind, { amounts: false });
      const surfaces = [c.hero, c.dec, c.pill, c.pillText, c.cap].join(' ');
      // Any run of digits attached to a $ is a leak. Dates ("29 Sep") are not
      // amounts and are allowed to survive.
      expect(surfaces).not.toMatch(/\$[\d,]/);
    }
  });

  it('masks grouped thousands whole, leaving no tail', () => {
    // "$1,140.20" must not leave ",140.20" behind — a partial mask is a worse
    // leak than no mask, because it looks deliberate.
    const c = shareCard('trade', { amounts: false });
    expect(c.cap).not.toMatch(/,\d/);
    expect(c.cap).not.toMatch(/\.\d\d/);
  });

  it('keeps the sign on the pill, so a loss still reads as a loss', () => {
    expect(shareCard('trade', { amounts: false }).pill).toBe('−$•••');
    expect(shareCard('day', { amounts: false }).pill).toBe('+$•••');
  });

  it('says so in the pill text rather than leaving a stale claim', () => {
    // The unmasked text quotes a figure. Left alone it would contradict the
    // mask sitting directly above it.
    expect(shareCard('trade', { amounts: false }).pillText).toBe('amounts hidden');
  });

  it('hides amounts in the caption people actually paste', () => {
    const c = shareCard('trade', { amounts: false });
    const cap = shareCaption(c, 'ARJUN14');
    expect(cap).not.toMatch(/\$[\d,]/);
    // The referral code still has to survive — it is why the share earns.
    expect(cap).toContain('tradeguardx.com/r/ARJUN14');
  });

  it('does not mutate the source card', () => {
    // shareCard copies before masking; without that, toggling amounts off once
    // would blank the figures for the rest of the session.
    shareCard('trade', { amounts: false });
    expect(SHARE_CARDS.trade.hero).toBe('$921');
    expect(SHARE_CARDS.trade.cap).toContain('$921.80');
  });
});

describe('showing amounts', () => {
  it('passes every figure through untouched', () => {
    const c = shareCard('trade', { amounts: true });
    expect(c.hero).toBe('$921');
    expect(c.dec).toBe('.80');
    expect(c.pill).toBe('−$218.40');
    expect(c.cap).toContain('−$1,140.20');
  });

  it('falls back to the trade card for an unknown kind', () => {
    expect(shareCard('nonsense').sym).toBe(SHARE_CARDS.trade.sym);
  });
});

describe('the caption', () => {
  it('ends with the referral link', () => {
    const cap = shareCaption(shareCard('day'), 'CODE9');
    expect(cap.endsWith('Would yours hold? tradeguardx.com/r/CODE9')).toBe(true);
  });
});

describe('segmented controls', () => {
  it('marks only the active segment', () => {
    const on = segment('trade', 'kind', 'trade');
    const off = segment('trade', 'kind', 'day');
    expect(on.bg).toBe('var(--surface)');
    expect(on.sh).not.toBe('none');
    expect(off.bg).toBe('transparent');
    expect(off.sh).toBe('none');
  });

  it('compares as strings, so booleans and numbers still match', () => {
    expect(segment(true, 'x', 'true').bg).toBe('var(--surface)');
  });
});

describe('share targets', () => {
  it('offers exactly the five destinations, with a glyph each', () => {
    const t = shareTargets('card');
    expect(t.map((x) => x.name)).toEqual(['WhatsApp', 'Telegram', 'X', 'Instagram', 'Discord']);
    // Every glyph needs at least one path, or the tile renders as a blank
    // coloured square that looks like a loading failure.
    for (const x of t) expect((x.s || '') + (x.f || '')).not.toBe('');
  });

  it('names the format in each message', () => {
    expect(shareTargets('card')[0].msg).toContain('card');
    expect(shareTargets('reel')[0].msg).toContain('reel');
  });
});

describe('download labels', () => {
  it('names the file it actually writes, in both formats', () => {
    /*
     * It read "Download MP4" under the reel, which is a promise the product
     * cannot keep: the reel is a DOM animation, MediaRecorder can only
     * capture a canvas or a media element, and a real export needs the same
     * component rendered frame by frame on a server. The button writes a PNG
     * either way, so it says PNG either way.
     */
    expect(DOWNLOAD_LABEL('card')).toBe('Download PNG');
    expect(DOWNLOAD_LABEL('reel')).toBe('Download PNG');
    expect(DOWNLOAD_LABEL()).toBe('Download PNG');
  });
});

describe('the overview strip', () => {
  it('has one card per kind, in order', () => {
    expect(STRIP_ITEMS.map((i) => i.kind)).toEqual(SHARE_KINDS);
  });

  it('marks exactly one card as new', () => {
    // The pulsing NEW pill is on the newest card only; two would make it
    // meaningless and none would waste the beat.
    expect(STRIP_ITEMS.filter((i) => i.fresh)).toHaveLength(1);
  });

  it('gives the week chart five days, each up or down but not both', () => {
    expect(WEEK_BARS).toHaveLength(5);
    for (const b of WEEK_BARS) {
      expect(b.hu === '0%' || b.hd === '0%').toBe(true);
    }
  });

  it('guards exactly the two red days', () => {
    // The gold shield dot marks a day the rule stopped. It belongs on the
    // down days and nowhere else.
    const guarded = WEEK_BARS.filter((b) => b.g);
    expect(guarded).toHaveLength(2);
    for (const b of guarded) expect(b.hd).toBe('100%');
  });
});

describe('share destinations and the exported file', () => {
  it('exports exactly 1080 x 1350', () => {
    // The 4:5 card is 432x540 in CSS pixels. Anything other than 2.5 here and
    // the file stops being the size every caption and modal line claims.
    expect(EXPORT.width * EXPORT.pixelRatio).toBe(1080);
    expect(EXPORT.width * 1.25 * EXPORT.pixelRatio).toBe(1350);
  });

  it('names the file after the card, not the moment', () => {
    // No timestamp: a second save of the same card should overwrite, not
    // litter the Downloads folder with four copies of one trade.
    expect(exportFileName('week')).toBe('tradeguardx-week-card.png');
  });

  it('carries the referral code in the link a web post publishes', () => {
    expect(shareLink('ARJUN14')).toBe('https://tradeguardx.com/r/ARJUN14');
  });

  it('opens WhatsApp, Telegram and X with the caption', () => {
    const caption = shareCaption(shareCard('trade', { amounts: true }), 'ARJUN14');
    for (const name of ['WhatsApp', 'Telegram', 'X']) {
      const i = shareIntent(name, { caption, referral: 'ARJUN14' });
      expect(i.manual).toBe(false);
      expect(i.url).toContain(encodeURIComponent(caption));
    }
  });

  it('admits Instagram and Discord cannot be opened with content', () => {
    // Neither has a web composer that accepts text or an image. Claiming
    // otherwise is what the prototype's message did.
    for (const name of ['Instagram', 'Discord']) {
      const i = shareIntent(name, { caption: 'x' });
      expect(i.manual).toBe(true);
      expect(i.url).toBe('');
    }
  });

  it('every destination the modal renders resolves to an intent', () => {
    for (const t of shareTargets('card')) {
      expect(shareIntent(t.name, { caption: 'x' })).toHaveProperty('manual');
    }
  });
});

describe('every card can become a reel', () => {
  it('each tab points at a story that exists', () => {
    // ShareReel falls back to the trade story for an unknown id, so a missing
    // story does not throw — it silently plays someone else's trade under the
    // week's heading. Nothing on screen says anything is wrong.
    for (const kind of SHARE_KINDS) {
      expect(STORIES[SHARE_CARDS[kind].reelStory], `no reel story for ${kind}`).toBeDefined();
    }
  });

  it('no two tabs share a reel', () => {
    const used = SHARE_KINDS.map((k) => SHARE_CARDS[k].reelStory);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe('one export shape', () => {
  /*
   * There were three — Post 4:5, Story 9:16 and Square 1:1 — with a picker in
   * the modal to choose between them. It cost a section of the panel, three
   * sets of type sizes inside the card, and a decision from someone who came
   * here to post a trade and now had to think about aspect ratios.
   *
   * 4:5 is the one every platform in the Share-to row takes as-is.
   */
  it('is the feed shape, 1080 × 1350', () => {
    expect(SHARE_SIZE.w).toBe(1080);
    expect(SHARE_SIZE.h / SHARE_SIZE.w).toBeCloseTo(5 / 4, 6);
  });

  it('divides into whole pixels at the export ratio', () => {
    // The canvas is laid out in CSS pixels and scaled by EXPORT.pixelRatio. A
    // fractional height there is a half-pixel row of background along the
    // bottom edge of every card.
    expect(Number.isInteger(SHARE_SIZE.w / EXPORT.pixelRatio)).toBe(true);
    expect(Number.isInteger(SHARE_SIZE.h / EXPORT.pixelRatio)).toBe(true);
  });

  it('gives a whole canvas height at the design width', () => {
    const h = (EXPORT.width * SHARE_SIZE.h) / SHARE_SIZE.w;
    expect(EXPORT.width).toBe(432);
    expect(Number.isInteger(h)).toBe(true);
  });

  it('names the file one way, because there is one shape', () => {
    expect(exportFileName('trade')).toBe('tradeguardx-trade-card.png');
    expect(exportFileName('week')).toBe('tradeguardx-week-card.png');
  });
});

describe('hiding amounts hides every amount', () => {
  /*
   * "If any one figure survives the mask, the toggle has lied to them."
   *
   * It did. The mask named four fields, and the card later grew a sub-line
   * under the hero and a row of tiles — both carrying money. With amounts off
   * the hero read "₹•••" while "+₹61,496.54", "−₹11,220.42" and "₹72,716.96
   * avoided" stayed on the card, in the three places they are easiest to
   * read. This is the test that the next field added does not do it again.
   */
  const CARD = {
    available: true,
    hero: '\u20b961,496', dec: '.54', pill: '+\u20b961,496.54', pillRed: false,
    pillText: 'instead of \u2212\u20b911,220.42 at the day\u2019s low',
    heroSub: '\u20b972,716.96 avoided \u00b7 it fell to \u2212\u20b911,220.42',
    heldLabel: '\u2212\u20b911,220.42',
    savedLabel: '\u20b972,716.96',
    headline: 'My daily target banked it before the move gave it back.',
    label: 'Saved by my daily target',
    meta: 'Long \u00b7 10x',
    tiles: [{ k: 'Mine', v: '+\u20b961,496.54' }, { k: 'If I\u2019d held', v: '\u2212\u20b911,220.42' }],
    cap: 'My daily target closed SOLUSDT at +\u20b961,496.54. Saved \u20b972,716.96.',
  };
  const INR = /[\u2212+]?\u20b9[\d,]+(\.\d+)?/g;
  const hidden = () => shareCard('trade', { amounts: false, cards: { trade: CARD }, mask: INR, sym: '\u20b9' });

  it('leaves no figure anywhere on the card', () => {
    const c = hidden();
    const everything = [c.hero, c.dec, c.pill, c.pillText, c.heroSub, c.heldLabel, c.savedLabel, c.headline, c.label, c.meta, c.cap]
      .concat((c.tiles ?? []).map((t) => t.v))
      .join(' | ');
    expect(everything).not.toMatch(/61,496|11,220|72,716/);
  });

  it('keeps the story, which is the point of the toggle', () => {
    // A user hiding their account size still wants "a rule fired, it was
    // worth it" to be readable.
    const c = hidden();
    expect(c.headline).toContain('My daily target banked it');
    expect(c.tiles.map((t) => t.k)).toEqual(['Mine', 'If I\u2019d held']);
    expect(c.meta).toBe('Long \u00b7 10x');
  });

  it('shows every figure when the toggle is on', () => {
    const c = shareCard('trade', { cards: { trade: CARD }, mask: INR, sym: '\u20b9' });
    expect(c.heroSub).toContain('72,716.96');
    expect(c.tiles[0].v).toBe('+\u20b961,496.54');
  });
});

describe('no demo values escape into a real share', () => {
  it('never puts the demo referral code in a link', () => {
    // shareIntent defaulted to 'ARJUN14', so an account with no code of its
    // own published a stranger's referral in every Telegram share.
    const i = shareIntent('Telegram', { caption: 'hello' });
    expect(i.url).not.toContain('ARJUN');
    expect(i.url).toContain(encodeURIComponent('https://tradeguardx.com'));
  });

  it('uses a real code when there is one', () => {
    expect(shareIntent('Telegram', { caption: 'x', referral: 'TEST9' }).url).toContain('TEST9');
  });

  it('leaves the /r/ path off a link with no code', () => {
    expect(shareLink(null)).toBe('https://tradeguardx.com');
    expect(shareCaption({ cap: 'x' })).not.toContain('/r/');
  });
});
