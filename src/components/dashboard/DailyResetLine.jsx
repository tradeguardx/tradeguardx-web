import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserZone, zoneLabel, zonePlace } from '../../lib/userZone';
import { followsUserZone, nextResetAt, zoneSwitchPending } from '../../lib/dailyReset';
import { sx } from './shell/sx';

/** "3h 12m" / "42m" — a countdown to read at a glance, not a ticking clock. */
function untilLabel(ms) {
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/**
 * "Your day resets at 00:00 GST · in 3h 12m · Change timezone"
 *
 * Daily limits only mean something if you know when the day ends, and with
 * users everywhere that is no longer "midnight IST" for everyone. Shown where
 * limits are set (Rules) and watched (Live guard). The time is the account's
 * real next reset, printed in the user's own zone — and while a timezone
 * change is waiting for that reset, it says so instead of pretending the new
 * zone already applies.
 */
export default function DailyResetLine({ account, style }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!account) return null;
  const at = nextResetAt(account, now);
  if (!at) return null;

  const zone = getUserZone();
  const clock = new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone });
  const funded = !followsUserZone(account);
  const pending = zoneSwitchPending(account, zone, now);

  return (
    <p data-daily-reset="1" style={sx('margin:8px 0 0;font-size:12.5px;line-height:1.5;color:var(--ink-3)', style)}>
      {funded ? 'Your firm’s day resets at ' : 'Your day resets at '}
      <strong style={sx('color:var(--ink-2);font-weight:700;font-variant-numeric:tabular-nums')}>{clock} {zoneLabel(zone)}</strong>
      {` · in ${untilLabel(at - now)}`}
      {pending && ` · then midnight ${zonePlace(zone)} time from the next day`}
      {!funded && (
        <>
          {' · '}
          <Link to="/dashboard/preferences" style={sx('color:var(--mint);font-weight:600;text-decoration:none')}>Change timezone</Link>
        </>
      )}
    </p>
  );
}
