/**
 * Manual killswitch durations (22 Nov 2026).
 *
 * A session lock (3, 6 or 12 hours) and a break (1, 3 or 7 days): a trader
 * on a losing run asked to be kept out for days, not hours. user-service
 * accepts exactly these hours (LOCKOUT_HOURS); the engine treats every
 * length the same, lifting the lock only when its time has passed.
 */
export const LOCK_SESSION_HOURS = [3, 6, 12];
export const LOCK_BREAK_HOURS = [24, 72, 168];
export const LOCK_HOURS = [...LOCK_SESSION_HOURS, ...LOCK_BREAK_HOURS];

/** True for the day-long options, which get the stronger confirmation. */
export const isBreak = (hours) => Number(hours) >= 24;

/** For a button: "3h", "1 day", "7 days". */
export function durationShort(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return '';
  if (h % 24 === 0) {
    const d = h / 24;
    return `${d} ${d === 1 ? 'day' : 'days'}`;
  }
  return `${h}h`;
}

/** For a sentence: "3 hours", "1 day", "7 days". */
export function durationLong(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return '';
  if (h % 24 === 0) return durationShort(h);
  return `${h} ${h === 1 ? 'hour' : 'hours'}`;
}

/** Before a noun: "3-hour", "1-day", "7-day" ("your 3-day lock"). */
export function durationAdj(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return '';
  return h % 24 === 0 ? `${h / 24}-day` : `${h}-hour`;
}

/** When a lock of this length, starting now, ends (ms). */
export const lockEndsAt = (hours, now = Date.now()) => now + Number(hours) * 3_600_000;
