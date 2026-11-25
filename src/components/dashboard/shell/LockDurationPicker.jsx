import { useEffect, useState } from 'react';
import { sx } from './sx';
import { formatResumes } from './format';
import { LOCK_BREAK_HOURS, LOCK_SESSION_HOURS, durationLong, durationShort, isBreak, lockEndsAt } from '../../../lib/lockDuration';

/**
 * The one lock-duration picker (22 Nov 2026), used by Live guard, the
 * top-bar kill switch and the open-trade choice, so the three can never
 * offer different lengths or look different.
 *
 *   SHORT LOCK      [ 3h ] [ 6h ] [ 12h ]
 *   TAKE A BREAK    [ 1 day ] [ 3 days ] [ 7 days ]
 *   Trading resumes Sat 29 Nov at 09:30 IST
 *
 * Each group is a three-column grid, so the buttons line up on a phone as
 * well as on a desktop. `startsNow` false (a trade is open and the lock waits
 * for it) says how long it lasts instead of a clock time nobody can know yet.
 */

const GROUP_LABEL = "font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:7px";

function chip(on, big) {
  return sx(
    `width:100%;min-height:${big ? 44 : 40}px;padding:0 8px;border-radius:11px;font:600 ${big ? 14 : 13}px/1 'Space Grotesk',sans-serif;white-space:nowrap;cursor:pointer;transition:background .12s,border-color .12s,color .12s`,
    on
      ? { border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--surface)' }
      : { border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink-2)' },
  );
}

export default function LockDurationPicker({ hours, setHours, disabled = false, firstRef, big = false, startsNow = true }) {
  // The end time moves with the clock; a minute is fine-grained enough.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const group = (label, list, first) => (
    <div>
      <div style={sx(GROUP_LABEL)}>{label}</div>
      <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px')}>
        {list.map((h, i) => (
          <button
            key={h}
            ref={first && i === 0 ? firstRef : undefined}
            type="button"
            role="radio"
            aria-checked={hours === h}
            aria-label={durationLong(h)}
            disabled={disabled}
            onClick={() => setHours(h)}
            style={chip(hours === h, big)}
          >
            {durationShort(h)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div role="radiogroup" aria-label="Lock duration">
      <div style={sx('display:grid;gap:12px')}>
        {group('Short lock', LOCK_SESSION_HOURS, true)}
        {group('Take a break', LOCK_BREAK_HOURS, false)}
      </div>
      <p data-lock-ends style={sx('margin:11px 0 0;font-size:12px;line-height:1.5;color:var(--ink-3)')}>
        {startsNow ? (
          <>Trading resumes <strong style={sx('color:var(--ink);font-weight:700')}>{formatResumes(lockEndsAt(hours, now))}</strong></>
        ) : (
          <>Lasts <strong style={sx('color:var(--ink);font-weight:700')}>{durationLong(hours)}</strong> from the moment the lock starts</>
        )}
        {isBreak(hours) && <span style={sx('display:block;margin-top:3px')}>No new trades on this account for {durationLong(hours)}. Only support can end a break early.</span>}
      </p>
    </div>
  );
}
