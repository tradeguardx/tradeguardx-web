import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/ToastProvider';
import { retryAfterOf, updateUserTimezone } from '../../api/userApi';
import { allZones, browserZone, getProfileZone, zoneLabel, zoneOffsetLabel, zonePlace } from '../../lib/userZone';
import { resetBoundaryFor } from '../../lib/dailyReset';
import { sx } from './shell/sx';

/**
 * Timezone — the one profile setting that changes what is ENFORCED, not just
 * what is shown: the daily limits reset early morning in this zone (05:00;
 * 05:30 in India — see lib/dailyReset resetBoundaryFor).
 *
 * WHY IT SAYS "FROM YOUR NEXT DAILY RESET". The server never moves today's
 * boundary; a change takes over at the next reset. Without that sentence a
 * trader who locks out at 18:00 could reasonably think "switch to a zone
 * where it is already tomorrow" unlocks them. It does not, and the screen
 * says so before they try.
 *
 * WHY ONCE A WEEK. Same reason: a zone you can flip daily is a reset you can
 * pick. The server answers 429 with the date it opens again; we show that
 * date rather than a generic error.
 *
 * A searchable list rather than a native <select>: 400-odd IANA names in a
 * phone's wheel picker is unusable, and nobody knows to scroll to "Asia/"
 * for Dubai.
 */

const MONO = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:9px";
const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const CARD = 'margin-bottom:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden';

/** "GMT+4 · GST" or just "GMT+5:45" when the zone has no common name. */
function offsetText(tz) {
  const off = zoneOffsetLabel(tz);
  const name = zoneLabel(tz);
  return name && name !== off ? `${off} · ${name}` : off;
}

function retryDate(iso, tz) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: tz });
  } catch {
    return null;
  }
}

export default function TimezoneSetting() {
  const { session, timezone, setTimezone, mirroring } = useAuth();
  const toast = useToast();
  /* What the profile holds. Null until the server has one — then the
     dashboard is on the device's zone, and the first save makes it real. */
  const saved = getProfileZone() ?? timezone;
  const device = browserZone();
  const [pick, setPick] = useState(saved);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null); // { tone: 'ok' | 'warn', text }

  const zones = useMemo(() => {
    const list = allZones();
    // Whatever the profile holds is always pickable, even on a runtime whose
    // list leaves it out.
    return list.includes(saved) ? list : [saved, ...list];
  }, [saved]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter((tz) => {
      const hay = `${tz} ${zonePlace(tz)} ${zoneLabel(tz)} ${zoneOffsetLabel(tz)}`.toLowerCase().replace(/_/g, ' ');
      return hay.includes(q);
    });
  }, [zones, query]);

  const save = async (tz) => {
    if (!tz || busy || !session?.access_token) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await updateUserTimezone({ accessToken: session.access_token, timezone: tz });
      const next = res?.timezone || tz;
      setTimezone(next);
      setPick(next);
      setNote({ tone: 'ok', text: `Saved. Times now show in ${zonePlace(next)} time. Your daily limits switch over at your next daily reset.` });
      toast.success('Timezone saved', `${zonePlace(next)} (${offsetText(next)})`);
    } catch (e) {
      if (e?.status === 429) {
        const when = retryDate(retryAfterOf(e), saved);
        setNote({ tone: 'warn', text: `You changed your timezone recently. It can change once every 7 days${when ? ` — next on ${when}` : ''}.` });
      } else if (e?.status === 400) {
        setNote({ tone: 'warn', text: 'That timezone was not recognised. Pick one from the list.' });
      } else {
        setNote({ tone: 'warn', text: 'Could not save your timezone. Check your connection and try again.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const dirty = pick && pick !== saved;

  return (
    <section style={sx(CARD)} aria-labelledby="tz-heading">
      <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}>
        <h3 id="tz-heading" style={sx(H3)}>Timezone</h3>
        <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:78ch')}>Every time on the dashboard shows in this zone, and your daily limits reset at {resetBoundaryFor(saved).time} in it, early morning your time.</p>
      </div>
      <div style={sx('padding:18px 19px;display:grid;gap:12px')}>
        <div>
          <div style={sx(MONO)}>Current</div>
          <div style={sx('display:flex;align-items:baseline;gap:8px;flex-wrap:wrap')}>
            <span style={sx('font-size:14px;font-weight:600;overflow-wrap:anywhere')}>{zonePlace(saved)}</span>
            <span style={sx("font:500 11.5px/1.3 'JetBrains Mono',monospace;color:var(--ink-3);overflow-wrap:anywhere")}>{saved} · {offsetText(saved)}</span>
          </div>
        </div>

        {device !== saved && (
          <button type="button" disabled={busy || mirroring} onClick={() => save(device)} style={sx('justify-self:start;max-width:100%;padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:600;text-align:left;overflow-wrap:anywhere')}>
            Use this device’s timezone ({zonePlace(device)}, {zoneOffsetLabel(device)})
          </button>
        )}

        <div>
          <label htmlFor="tz-search" style={sx(MONO, { display: 'block' })}>Change to</label>
          <input
            id="tz-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a city or zone — Dubai, London, GMT+4"
            autoComplete="off"
            style={sx('width:100%;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font-size:13px')}
          />
          <div role="listbox" aria-label="Timezones" style={sx('margin-top:8px;max-height:232px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)')}>
            {shown.length === 0 && <div style={sx('padding:12px 13px;font-size:12.5px;color:var(--ink-3)')}>No timezone matches “{query}”.</div>}
            {shown.map((tz) => {
              const on = tz === pick;
              return (
                <button
                  key={tz}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => { setPick(tz); setNote(null); }}
                  style={sx('display:flex;width:100%;align-items:baseline;gap:10px;padding:9px 13px;border:0;border-bottom:1px solid var(--line);text-align:left', { background: on ? 'var(--mint-tint)' : 'transparent' })}
                >
                  <span style={sx('flex:1;min-width:0;font-size:13px;overflow-wrap:anywhere', { color: on ? 'var(--mint)' : 'var(--ink)', fontWeight: on ? 600 : 500 })}>{tz.replace(/_/g, ' ')}</span>
                  <span style={sx("flex:none;font:500 11px/1.3 'JetBrains Mono',monospace;color:var(--ink-3)")}>{zoneOffsetLabel(tz)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap')}>
          <button type="button" onClick={() => save(pick)} disabled={!dirty || busy || mirroring} style={sx('flex:none;padding:10px 15px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700', { opacity: !dirty || busy || mirroring ? 0.5 : 1 })}>
            {busy ? 'Saving…' : dirty ? `Save ${zonePlace(pick)}` : 'Save'}
          </button>
          <span style={sx('flex:1;min-width:min(220px,100%);font-size:12px;line-height:1.55;color:var(--ink-3)')}>Applies to your daily limits from your next daily reset. You can change it once every 7 days.</span>
        </div>

        {note && (
          <p role="status" style={sx('margin:0;padding:10px 12px;border-radius:10px;font-size:12.5px;line-height:1.55', note.tone === 'ok'
            ? { border: '1px solid var(--mint-line)', background: 'var(--mint-tint)', color: 'var(--ink)' }
            : { border: '1px solid var(--amber-line)', background: 'var(--amber-tint)', color: 'var(--ink)' })}>
            {note.text}
          </p>
        )}
      </div>
    </section>
  );
}
