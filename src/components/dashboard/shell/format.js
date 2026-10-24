/** Shared formatting for the shell — one place so countdowns never disagree. */
import { getUserZone, zoneLabel } from '../../../lib/userZone';

/** "2h 05m" far out; "05:42" inside the last hour; "0:00" at zero. Fixed width so nothing shifts as it ticks. */
/**
 * Units that match how the window was set.
 *
 * The rule lock is chosen in DAYS — 3, 7 or 30 — so rendering it as
 * "149h 55m" makes the reader divide by 24 to find out whether their
 * seven days is nearly up. Past a day, say days.
 */
export function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * The user's own clock, not the account's reset zone.
 *
 * These used to render in `trading_accounts.timezone`, which is the boundary
 * the ENGINE resets on — an internal detail. With that set to UTC, an Indian
 * trader saw "resumes tomorrow at 00:00" for a lock that actually lifts at
 * 05:30 their time, and the zone suffix was blank because it only ever
 * printed "IST" for Asia/Kolkata. Wrong hour, no label to catch it.
 *
 * A release time answers "when can I trade again", so it belongs in the
 * clock on the wall in front of the person reading it — which is the
 * profile's timezone (lib/userZone), falling back to the device's.
 * zoneLabel lives there too, re-exported so existing imports keep working.
 */
export { zoneLabel };

/** "today at 14:30 IST" / "tomorrow at 00:00 GST", in the USER's zone. */
export function formatResumes(ts) {
  if (!ts) return '';
  const tz = getUserZone();
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  const dayNow = new Date().toLocaleDateString('en-GB', { timeZone: tz });
  const dayThen = d.toLocaleDateString('en-GB', { timeZone: tz });
  const zone = zoneLabel(tz);
  return `${dayNow === dayThen ? 'today' : 'tomorrow'} at ${time}${zone ? ` ${zone}` : ''}`;
}

export function initialsOf(name, email) {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}

const LOCK_REASON = {
  daily_loss: 'Daily loss limit',
  daily_target: 'Daily profit target',
  consecutive_losses: 'Close after N losses',
  max_trades_day: 'Max trades per day',
  manual: 'Kill switch',
};

export function lockReasonLabel(reason) {
  return LOCK_REASON[reason] ?? 'Rule';
}
