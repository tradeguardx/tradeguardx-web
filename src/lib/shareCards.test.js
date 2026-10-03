import { describe, expect, it } from 'vitest';
import {
  DOWNLOAD_LABEL,
  DOWNLOAD_MSG,
  SHARE_CARDS,
  SHARE_KINDS,
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
  it('match the format', () => {
    expect(DOWNLOAD_LABEL('card')).toBe('Download PNG');
    expect(DOWNLOAD_LABEL('reel')).toBe('Download MP4');
    expect(DOWNLOAD_MSG('card')).toContain('1080 × 1350');
    expect(DOWNLOAD_MSG('reel')).toContain('1080 × 1920');
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
