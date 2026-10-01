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

/**
 * Delta's create-key form, pinned field by field against a screenshot of the
 * live page.
 *
 * Our copy had drifted into names Delta does not use — "Whitelisted IP" for a
 * field labelled "Trusted IPs to Whitelist", "Name" for "API Key Name" — and
 * was missing the two things on that screen that actually cost people a
 * working key.
 */
describe("Delta's create-key form, as the form is", () => {
  it('names the IP field the way Delta labels it', () => {
    expect(delta.ipField).toBe('Trusted IPs to Whitelist');
  });

  it('tells the user to press + Add', () => {
    // The box is not the whitelist. An IP typed in and left there is dropped
    // when Create API key is pressed, and the key then fails from our engine
    // with nothing on screen having looked wrong.
    const steps = delta.createSteps.map((s) => `${s.title} ${s.body}`).join(' | ');
    expect(steps).toMatch(/\+ Add/);
    expect(delta.ipAddNote).toMatch(/\+ Add/);
  });

  it("warns that Delta's My IP Address chip is not us", () => {
    // The likeliest wrong turn on the page: the chip that reads as correct
    // whitelists the user's own computer. The key connects, passes the scope
    // check, and cannot act when it is needed.
    const copy = `${delta.ipAddNote} ${delta.createSteps.map((s) => s.body).join(' ')}`;
    expect(copy).toMatch(/My IP Address/);
  });

  it('names the account dropdown Delta opens with', () => {
    // Nothing else we support has one. A key on the wrong account is watching
    // an account the user is not trading.
    expect(delta.accountField).toBe('Account Name');
    expect(delta.accountNote).toBeTruthy();
    expect(delta.createSteps[0].title).toBe('Account Name');
  });

  it("keeps Read Data and Trading as the two cards Delta shows", () => {
    expect(delta.readScopeLabel).toBe('Read Data');
    expect(delta.scopeLabel).toBe('Trading');
  });
});

/**
 * Reaching the form, as taps.
 *
 * Step one of the connect flow renders navPath alone now. The written
 * walkthrough it replaced there is still what the account page and the
 * settings panel show, so createSteps stays the checked source — but a venue
 * without a navPath renders nothing at all in step one, which is a step that
 * silently tells the user nothing.
 */
describe('the path to the create-key form', () => {
  it('every venue names it, in at most three taps', () => {
    for (const v of [delta, coindcx, shark]) {
      expect(v.navPath?.length).toBeGreaterThan(1);
      expect(v.navPath.length).toBeLessThanOrEqual(3);
      for (const tap of v.navPath) expect(tap.trim()).toBeTruthy();
    }
  });

  it('ends on the button that opens the form', () => {
    // Not "API Management" — the step after it. A path that stops at the list
    // of existing keys leaves the user one click short, looking at a screen
    // that has no form on it.
    for (const v of [delta, coindcx, shark]) {
      expect(v.navPath.at(-1)).toMatch(/create api key/i);
    }
  });

  it("matches Delta's app path", () => {
    expect(delta.navPath).toEqual(['Algo Hub', 'APIs', 'Create API key']);
  });

  it('keeps the confirmation code where a venue sends one', () => {
    // Dropped from step one with the rest of the written list; it has to
    // survive somewhere, and the replica renders it under the form.
    expect(coindcx.otpNote).toMatch(/email/i);
    expect(coindcx.otpNote).toMatch(/SMS/i);
    expect(shark.otpNote).toMatch(/code/i);
    // Delta sends none. An invented one is a user waiting for a text.
    expect(delta.otpNote).toBeUndefined();
  });
});

/**
 * Which venues get the in-app flow on a phone.
 *
 * ConnectKeyPage hides the "Open the key page" link and lists the walkthrough
 * in the page when a venue has a real app flow. The gate is data, so it is
 * pinned here: get it wrong in the permissive direction and a CoinDCX user on
 * a phone is shown a walkthrough for a screen their app does not have, with
 * the link to the page they actually need now hidden.
 */
describe('the phone flow', () => {
  it('Delta qualifies — app path, screenshots, not desktop-only', () => {
    expect(delta.desktopOnly).toBeFalsy();
    expect(delta.mobilePath).toBeTruthy();
    expect(delta.appGuide).toHaveLength(4);
  });

  it('CoinDCX and Shark do not, so they keep the link', () => {
    for (const v of [coindcx, shark]) {
      expect(v.desktopOnly).toBe(true);
      expect(v.mobilePath).toBeNull();
    }
  });
});

/**
 * Shark's create form, pinned against its live modal (1 Oct 2026).
 *
 * Two of these were wrong in a way that costs a user the key: the IP field was
 * described as optional when Shark marks it required, and the whole
 * after-Create screen — where the secret is shown once and the only useful
 * permission is granted — existed in our copy as a single sentence.
 */
describe("Shark's create form, as the form is", () => {
  it('names both fields the way Shark labels them', () => {
    expect(shark.keyNameField).toBe('Label API');
    expect(shark.ipField).toBe('Add IP addresses (comma separated)');
  });

  it('marks the IP required, because Shark does', () => {
    // Their modal puts a red asterisk on it. Calling it optional told people
    // to skip the one thing that makes the key usable from us.
    expect(shark.ipRequired).toBe(true);
  });

  it('has no permission control on the create form', () => {
    // Two fields and a Create button. A permissions block here sends someone
    // looking for a checkbox that is on the NEXT screen.
    expect(shark.scopeChoice).toBe(false);
    // ...it is on the screen AFTER Create, which afterCreate draws.
    expect(shark.afterCreate).toBeTruthy();
  });

  it('carries the after-Create screen, where the job is actually finished', () => {
    const a = shark.afterCreate;
    expect(a).toBeTruthy();
    expect(a.readScopeLabel).toBe('Read');
    // Save & Complete is inert until the confirmation box is ticked; someone
    // who copies the keys and leaves has a key that can never close anything.
    expect(a.confirmLabel).toMatch(/noted & stored/i);
    expect(a.submitLabel).toBe('Save & Complete');
  });

  it('is the only venue with one', () => {
    expect(delta.afterCreate).toBeUndefined();
    expect(coindcx.afterCreate).toBeUndefined();
  });
});
