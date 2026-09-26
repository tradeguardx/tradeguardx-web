import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, applyDefaultUpgradesOnce, readPrefs } from './prefs';

/**
 * The house defaults are Print chrome and a dark dashboard.
 *
 * Changing the two constants was not enough, and the reason is worth pinning:
 * both values were already in every returning user's localStorage without
 * anyone having picked them. setPref writes the whole prefs object when any one
 * key changes, and the theme provider wrote itself to storage on every mount.
 * So the stored value — which always wins — was the app's own old default,
 * looking exactly like a deliberate choice.
 *
 * applyDefaultUpgradesOnce clears that, once. These tests cover the two ways a
 * one-shot migration goes wrong: running again on a later visit (which would
 * undo the user's own choice every time they load the page), and not running at
 * all.
 */

const PREFS_KEY = 'tgx_prefs_v1';
const THEME_KEY = 'tradeguardx-dash-theme';
const MARKER = 'tgx_defaults_upgraded_v1';

beforeEach(() => localStorage.clear());

describe('the shipped defaults', () => {
  it('are Print chrome and Signal accent', () => {
    expect(DEFAULT_PREFS.chrome).toBe('print');
    expect(DEFAULT_PREFS.accent).toBe('signal');
  });

  it('apply to a browser that has never stored anything', () => {
    expect(readPrefs().chrome).toBe('print');
  });
});

describe('upgrading values the app stored on the user’s behalf', () => {
  it('moves a stored depth chrome to print', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, chrome: 'depth' }));
    applyDefaultUpgradesOnce();
    expect(readPrefs().chrome).toBe('print');
  });

  it('moves a stored light theme to dark', () => {
    localStorage.setItem(THEME_KEY, 'light');
    applyDefaultUpgradesOnce();
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('leaves every other preference alone', () => {
    const before = { ...DEFAULT_PREFS, chrome: 'depth', currency: 'INR', density: 'compact', landing: 'live' };
    localStorage.setItem(PREFS_KEY, JSON.stringify(before));
    applyDefaultUpgradesOnce();
    const after = readPrefs();
    expect(after.currency).toBe('INR');
    expect(after.density).toBe('compact');
    expect(after.landing).toBe('live');
  });

  it('does not touch a chrome the user moved to flat', () => {
    // Only the OLD DEFAULT is upgraded. 'flat' can only be there because
    // somebody picked it, and overwriting that would be taking a choice away.
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, chrome: 'flat' }));
    applyDefaultUpgradesOnce();
    expect(readPrefs().chrome).toBe('flat');
  });
});

describe('it runs exactly once', () => {
  it('does not undo a later switch back to light', () => {
    // The failure that would make this unusable: someone prefers light, sets
    // it, and every subsequent page load drags them back to dark.
    localStorage.setItem(THEME_KEY, 'light');
    applyDefaultUpgradesOnce();
    localStorage.setItem(THEME_KEY, 'light');

    applyDefaultUpgradesOnce();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('does not undo a later switch back to depth', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, chrome: 'depth' }));
    applyDefaultUpgradesOnce();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, chrome: 'depth' }));

    applyDefaultUpgradesOnce();
    expect(readPrefs().chrome).toBe('depth');
  });

  it('leaves the marker behind so a later load skips the work', () => {
    applyDefaultUpgradesOnce();
    expect(localStorage.getItem(MARKER)).toBe('1');
  });

  it('survives prefs that are not valid JSON', () => {
    // Storage can hold anything — an older shape, a half-written value. A throw
    // here runs before React mounts, so it would be a blank page, not a bad theme.
    localStorage.setItem(PREFS_KEY, '{not json');
    localStorage.setItem(THEME_KEY, 'light');
    expect(() => applyDefaultUpgradesOnce()).not.toThrow();
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });
});
