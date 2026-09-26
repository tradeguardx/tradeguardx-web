import { describe, expect, it } from 'vitest';
import { venueFor } from './venues';

// venueFor is the module's public surface; VENUES itself is private and stays
// that way — a test is not a reason to widen an API.
const delta = venueFor('delta_india');
const coindcx = venueFor('coindcx');
const shark = venueFor('shark');

/**
 * Venue guide data, pinned because it is read by copy that counts it.
 *
 * The connect button used to say "Show me how · 4 steps" with the 4 written
 * out. Correct for Delta, silently wrong for CoinDCX the moment it arrived
 * with six — and nothing would have failed, it would just have lied on screen.
 */
describe('connect walkthroughs', () => {
  it('Delta has four steps, each with a bundled fallback', () => {
    const steps = delta.appGuide;
    expect(steps).toHaveLength(4);
    // The hosted images can go down mid-connect; every one must have a local
    // copy to fall back to. See AppGuide's failure path.
    for (const s of steps) {
      expect(s.fallbackSrc).toMatch(/^\/guide\//);
      expect(s.alt).toBeTruthy();
    }
  });

  it('Shark has four steps', () => {
    expect(shark.appGuide).toHaveLength(4);
  });

  it("names Shark's scope control the way Shark's form does", () => {
    // The form says "Trade Futures" under Edit API Restrictions. We said
    // "Futures trading", which is a control nobody can find by that name — and
    // it is the one that decides whether the kill switch can act at all.
    expect(shark.scopeLabel).toBe('Trade Futures');
  });

  it("keeps Shark's OTP step, which its flow will not skip", () => {
    // Shark texts a code and will not issue the key without it. The steps
    // originally went name -> IP -> scope -> copy, which walks someone into a
    // screen they were never told about.
    const titles = shark.createSteps.map((s) => s.title).join(' | ');
    expect(titles).toMatch(/verification code/i);
  });

  it('desktop-only venues describe the same journey', () => {
    // CoinDCX and Shark both need a computer, both hide the form behind a
    // profile menu, and both send a code. They used to be written at different
    // levels: Shark started at "log in on a laptop", CoinDCX started at
    // "Label" — the fourth thing you actually do. Someone reading CoinDCX on a
    // phone had no idea they needed a computer, and someone on a computer
    // still had to find the API Dashboard alone.
    for (const v of [coindcx, shark]) {
      expect(v.createSteps).toHaveLength(6);
      expect(v.createSteps[0].title).toMatch(/laptop|desktop/i);
      // The navigation step: how you reach the form at all.
      expect(v.createSteps[1].title).toMatch(/profile/i);
      // Both verify by code before the key exists.
      expect(v.createSteps.some((st) => /code|otp/i.test(st.title))).toBe(true);
    }
  });

  it('CoinDCX has six steps', () => {
    expect(coindcx.appGuide).toHaveLength(6);
  });

  it('CoinDCX is marked desktop-only and names no mobile path', () => {
    // CoinDCX issues API keys only from a desktop browser. A mobilePath here
    // would send phone users hunting for a screen that does not exist, and
    // they would blame us for it.
    expect(coindcx.desktopOnly).toBe(true);
    expect(coindcx.mobilePath).toBeNull();
  });

  it('Shark needs a computer, and says so', () => {
    // Shark's mobile app has no create-key flow at all. This briefly claimed a
    // phone browser would do, inferred from a caption that said "log in on a
    // browser" — a constraint read out of a word they never used. The error
    // ran the dangerous way: someone follows it on a phone, cannot finish, and
    // blames the product.
    expect(shark.desktopOnly).toBe(true);
    expect(shark.mobilePath).toBeNull();
    expect(shark.desktopOnlyNote).toMatch(/laptop|desktop/i);
  });

  it('Shark names the computer requirement as its first step', () => {
    // Discovering it at step five, after hunting the app for a screen that is
    // not there, is the whole failure this prevents.
    expect(shark.createSteps[0].title).toMatch(/laptop|desktop/i);
    expect(shark.createSteps).toHaveLength(6);
  });

  it('every desktop-only venue explains itself', () => {
    // The surfaces render desktopOnlyNote directly; a venue flagged without one
    // shows an empty paragraph where the explanation should be.
    for (const v of [delta, coindcx, shark]) {
      if (v.desktopOnly) expect(v.desktopOnlyNote).toBeTruthy();
    }
  });

  it('venues with a mobile key flow still name the path', () => {
    expect(delta.desktopOnly).toBeFalsy();
    expect(delta.mobilePath).toBeTruthy();
  });

  it('every step has an alt that reads as an instruction', () => {
    // The alt text is what shows when an image fails, so it has to say what to
    // DO, not what the picture contains.
    for (const venue of [delta, coindcx, shark]) {
      for (const s of venue.appGuide ?? []) {
        expect(s.alt.length).toBeGreaterThan(12);
        expect(s.src).toBeTruthy();
      }
    }
  });
});

describe('the suggested API key name', () => {
  it('is one value, because three surfaces and four screenshots show it', async () => {
    // Connect page, Accounts page and the settings panel all tell the user what
    // to type, and the Delta walkthrough has it printed into the artwork. They
    // disagreed: the connect page suggested `TradeGuardX-<account>-guard` while
    // everywhere else said `tradeguardx`, so someone following the guide read
    // one thing in the instruction and another in the picture below it.
    //
    // Changing this value means re-exporting the screenshots too.
    const { SUGGESTED_KEY_NAME } = await import('../components/dashboard/deltaConnectShared');
    expect(SUGGESTED_KEY_NAME).toBe('tradeguardx');
  });
});
