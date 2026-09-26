/**
 * User preferences — client-side, per browser. There is no server endpoint
 * for these yet (// TODO(api): persist prefs per user), so they live in
 * localStorage and travel with the browser, not the account.
 */

const KEY = 'tgx_prefs_v1';

export const DEFAULT_PREFS = {
  landing: 'overview', // 'overview' | 'live'
  density: 'comfortable', // 'comfortable' | 'compact'
  currency: 'USD', // display currency for our own figures; tax is always INR
  weekStart: 'mon', // 'mon' | 'sun'
  confirmBeforeClose: true,
  soundOnRuleFire: false,
  // §6 tweak props — root attributes with token overrides
  accent: 'signal', // 'mint' | 'signal' | 'ion' — amber is the house default
  /*
   * 'print' is the house chrome: hairlines and tight radii rather than shadows
   * and washes. It is the look the product is designed around, so it is what
   * someone should meet before they know this control exists.
   *
   * NOTE ON EXISTING USERS. setPref persists the whole prefs object, not the
   * one key that changed — so anyone who has ever touched any preference
   * already has `chrome: 'depth'` written to localStorage and keeps Depth.
   * Only people with no stored prefs pick this up. Changing that means a
   * one-time migration that overwrites a value some of them chose on purpose,
   * which is a different decision from changing the default.
   */
  chrome: 'print', // 'depth' | 'flat' | 'print'
  voice: 'coach', // 'coach' | 'clinical'
};

export function readPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — prefs simply don't persist */
  }
}

/**
 * Storage keys that hold a value a user never actually chose.
 *
 * Both of these persist eagerly: setPref writes the WHOLE prefs object when any
 * single key changes, and the dashboard theme wrote itself to localStorage on
 * every mount. So "change the default" reaches almost nobody — every existing
 * browser is already carrying `chrome: 'depth'` and `theme: 'light'`, written
 * by the app rather than picked by the person using it.
 *
 * This upgrades those two stored values once, behind a marker so it can never
 * run twice. It is deliberately a one-shot: someone who genuinely preferred
 * Depth or Light is moved once and their next choice sticks forever, which is
 * the least-bad option when the storage cannot distinguish a chosen value from
 * one the app wrote on its own.
 *
 * Runs from main.jsx BEFORE React mounts, because both consumers read
 * localStorage in a useState initialiser — after mount would be too late.
 */
const DEFAULTS_UPGRADE_KEY = 'tgx_defaults_upgraded_v1';
const THEME_KEY = 'tradeguardx-dash-theme';

export function applyDefaultUpgradesOnce() {
  try {
    if (localStorage.getItem(DEFAULTS_UPGRADE_KEY)) return;

    // Each upgrade gets its own catch. They share nothing, and stored prefs can
    // be any shape — an older version, a half-written value — so a JSON.parse
    // throw on the first one used to take the second down with it and leave the
    // theme on light. Two independent steps, failing independently.
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.chrome === 'depth') {
          localStorage.setItem(KEY, JSON.stringify({ ...parsed, chrome: 'print' }));
        }
      }
    } catch {
      /* unreadable prefs — readPrefs() falls back to DEFAULT_PREFS anyway */
    }

    try {
      if (localStorage.getItem(THEME_KEY) === 'light') {
        localStorage.setItem(THEME_KEY, 'dark');
      }
    } catch {
      /* noop */
    }

    localStorage.setItem(DEFAULTS_UPGRADE_KEY, '1');
  } catch {
    /* private mode — the defaults below apply instead, which is the same result */
  }
}

export function landingPath(prefs) {
  return prefs?.landing === 'live' ? '/dashboard/live' : '/dashboard/overview';
}
