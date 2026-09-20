/** Shared formatting for the shell — one place so countdowns never disagree. */

/** "2h 05m" far out; "05:42" inside the last hour; "0:00" at zero. Fixed width so nothing shifts as it ticks. */
export function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "today at 14:30 IST" / "tomorrow at 05:30 IST" in the account's zone (default IST). */
export function formatResumes(ts, tz = 'Asia/Kolkata') {
  if (!ts) return '';
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  const dayNow = new Date().toLocaleDateString('en-IN', { timeZone: tz });
  const dayThen = d.toLocaleDateString('en-IN', { timeZone: tz });
  const zone = tz === 'Asia/Kolkata' ? 'IST' : '';
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
