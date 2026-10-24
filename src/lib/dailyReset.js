import { dayKey, getUserZone, isValidZone, zoneOffsetMinutes } from './userZone';

/**
 * WHEN AN ACCOUNT'S DAY ENDS, AS THE ENGINE SEES IT.
 *
 * The risk engine resets daily limits at the account's own `timezone` +
 * `dailyResetTimeLocal` (trading_accounts). For a retail exchange account
 * that is early morning in the user's zone (resetBoundaryFor) — but a
 * timezone change in Preferences
 * only reaches the account at its NEXT reset (the engine never moves the
 * boundary mid-day, so a change can't end a day or a lock early). Until then
 * the account still runs on its old zone, and that is the time we must show:
 * the real one, not the one the profile says.
 */

/** Epoch ms of `HH:MM` on calendar day `key` (YYYY-MM-DD) in `tz`. DST-safe. */
function wallClockMs(key, hhmm, tz) {
  const [y, m, d] = key.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = naive - zoneOffsetMinutes(tz, new Date(naive)) * 60000;
  guess = naive - zoneOffsetMinutes(tz, new Date(guess)) * 60000;
  return guess;
}

const shiftKey = (key, days) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** The account's reset zone and time, with the engine's own defaults. */
export function accountDayBoundary(account) {
  const tz = isValidZone(account?.timezone) ? account.timezone : 'UTC';
  const time = /^\d{2}:\d{2}$/.test(account?.dailyResetTimeLocal ?? '') ? account.dailyResetTimeLocal : '00:00';
  return { tz, time };
}

/** Epoch ms of the account's next daily reset after `now`. */
export function nextResetAt(account, now = Date.now()) {
  const { tz, time } = accountDayBoundary(account);
  const today = dayKey(new Date(now), tz);
  if (!today) return null;
  for (const k of [today, shiftKey(today, 1), shiftKey(today, 2)]) {
    const at = wallClockMs(k, time, tz);
    if (at > now) return at;
  }
  return null;
}

/**
 * The reset a retail account is moved to for a user in `zone` — a mirror of
 * the server's rule, so the screen and the engine agree.
 *
 * WHY EARLY MORNING, NOT MIDNIGHT. A midnight reset hands a trader a fresh
 * daily loss allowance in the middle of the night session — exactly when
 * the revenge trade happens. Resetting at 05:00 means a lock hit at 23:00
 * holds until morning: a real break, with sleep in it.
 *
 * WHY INDIA IS 05:30. 05:30 IST is 00:00 UTC, the boundary every Indian
 * account has always reset on. Keeping it means no Indian user's day moves
 * an inch; it is deliberate, not a rounding of 05:00.
 */
export function resetBoundaryFor(zone) {
  const tz = isValidZone(zone) ? zone : 'UTC';
  return { tz, time: tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta' ? '05:30' : '05:00' };
}

/** Prop-firm accounts keep their firm's cutoff; everything else follows the user. */
export const followsUserZone = (account) => (account?.equityMode ?? 'live') !== 'funded';

/**
 * True while a retail account still resets at a different moment from the
 * one the user's zone calls for — i.e. a timezone change is waiting for the
 * next reset.
 *
 * Compared by INSTANT, not by zone name: an Indian account still stored as
 * UTC 00:00 resets at exactly the same moment as Asia/Kolkata 05:30, so
 * nothing is pending and saying otherwise would be noise.
 */
export function zoneSwitchPending(account, userZone = getUserZone(), now = Date.now()) {
  if (!account || !followsUserZone(account)) return false;
  const target = resetBoundaryFor(userZone);
  const want = nextResetAt({ timezone: target.tz, dailyResetTimeLocal: target.time }, now);
  const have = nextResetAt(account, now);
  return want != null && have != null && want !== have;
}
