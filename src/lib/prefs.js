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
  accent: 'mint', // 'mint' | 'signal' | 'ion'
  chrome: 'depth', // 'depth' | 'flat' | 'print'
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

export function landingPath(prefs) {
  return prefs?.landing === 'live' ? '/dashboard/live' : '/dashboard/overview';
}
