import { dayKey, getUserZone, isValidZone, zoneOffsetMinutes } from './userZone';

/**
 * WHEN AN ACCOUNT'S DAY ENDS, AS THE ENGINE SEES IT.
 *
 * The risk engine resets daily limits at the account's own `timezone` +
 * `dailyResetTimeLocal` (trading_accounts). For a retail exchange account
 * that is the user's local midnight — but a timezone change in Preferences
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

/** Prop-firm accounts keep their firm's cutoff; everything else follows the user. */
export const followsUserZone = (account) => (account?.equityMode ?? 'live') !== 'funded';

/**
 * True while a retail account is still on a different clock from the user's
 * zone — i.e. a timezone change is waiting for the next reset.
 */
export function zoneSwitchPending(account, userZone = getUserZone(), now = Date.now()) {
  if (!account || !followsUserZone(account)) return false;
  const { tz, time } = accountDayBoundary(account);
  if (time !== '00:00') return true;
  return zoneOffsetMinutes(tz, new Date(now)) !== zoneOffsetMinutes(userZone, new Date(now));
}
