/**
 * Economic calendar — pure helpers over the GET /calendar contract.
 * Nothing here touches the DOM or the clock except through the `now`
 * argument, so the page can tick a single client-side clock and every
 * countdown derives from event_time_utc (server relative times are hints,
 * never trusted).
 */

const DAY_MS = 86400000;

function pad(n) { return String(n).padStart(2, '0'); }
export function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

/**
 * Sunday of the week containing `d`, local time, at 00:00. Calendar weeks
 * run Sunday→Saturday here because that is how the feed (and Forex Factory's
 * own calendar) cuts them — on a Sunday, "This week" must be the week ahead.
 */
export function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

/**
 * Date range for the toolbar. mode 'week' | 'month'; offset counts periods
 * from the current one (‹ › shift it). Returns { from, to } as YYYY-MM-DD
 * (inclusive) plus a label.
 */
export function rangeFor(mode, offset, now = new Date()) {
  if (mode === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    return { from: isoDate(first), to: isoDate(last), label: first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
  }
  const start = startOfWeek(now);
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const label = offset === 0 ? 'This week' : offset === 1 ? 'Next week' : offset === -1 ? 'Last week'
    : `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  return { from: isoDate(start), to: isoDate(end), label };
}

/** "IST · UTC+5:30" for the browser (or a given) timezone. */
export function timezoneLabel(tz, now = new Date()) {
  const zone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  let abbr = '';
  try {
    abbr = new Intl.DateTimeFormat('en-IN', { timeZone: zone, timeZoneName: 'short' }).formatToParts(now).find((p) => p.type === 'timeZoneName')?.value || '';
  } catch { abbr = ''; }
  let offsetMin = -now.getTimezoneOffset();
  try {
    // Offset of `zone`, not of the browser, when they differ.
    const local = new Date(now.toLocaleString('en-US', { timeZone: zone }));
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    offsetMin = Math.round((local - utc) / 60000);
  } catch { /* keep browser offset */ }
  const sign = offsetMin < 0 ? '−' : '+';
  const abs = Math.abs(offsetMin);
  const off = `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${pad(abs % 60)}` : ''}`;
  // "GMT+5:30" is what Intl gives for zones without a common abbreviation; the offset already says that.
  return abbr && !/^(GMT|UTC)/.test(abbr) ? `${abbr} · ${off}` : off;
}

/** Milliseconds until the event, from its UTC timestamp. Negative when past. */
export function msUntil(event, now) {
  const t = new Date(event.event_time_utc).getTime();
  return Number.isFinite(t) ? t - now : NaN;
}

/** Past is derived from the clock, not the server flag, so a stale payload never shows a passed event as upcoming. */
export function isPast(event, now) {
  const ms = msUntil(event, now);
  return Number.isFinite(ms) ? ms < 0 : Boolean(event.is_past);
}

/** HH:MM:SS countdown. Clamps at 00:00:00. */
export function countdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** "IN 3H 07M" for the ACTUAL cell inside six hours; null otherwise. */
export function inLabel(ms) {
  if (!Number.isFinite(ms) || ms < 0 || ms >= 6 * 3600000) return null;
  const m = Math.floor(ms / 60000);
  return `IN ${Math.floor(m / 60)}H ${pad(m % 60)}M`;
}

/** What the TIME cell says. Never fabricates a clock time for a non-exact event. */
export function timeCell(event) {
  switch (event.time_status) {
    case 'exact': return { text: event.time, exact: true };
    case 'tentative': return { text: 'TENTATIVE', exact: false };
    case 'all_day': return { text: 'ALL DAY', exact: false };
    case 'day_n': return { text: `DAY ${event.day_n ?? event.day ?? 1}`, exact: false };
    default: return { text: event.time || '—', exact: Boolean(event.time) };
  }
}

/** The next future high-impact event across the loaded days (currency-filtered, not impact-filtered). */
export function nextHighImpact(days, now, countries = null) {
  let best = null;
  for (const d of days) for (const e of d.events) {
    if (e.impact !== 3 || e.time_status !== 'exact') continue;
    if (countries && countries.length && !countries.includes(e.country)) continue;
    const ms = msUntil(e, now);
    if (!Number.isFinite(ms) || ms < 0) continue;
    if (!best || ms < best.ms) best = { event: e, day: d, ms };
  }
  return best;
}

/** Impact counts across all loaded events, before the chip filter. */
export function impactCounts(days) {
  const c = { 3: 0, 2: 0, 1: 0 };
  for (const d of days) for (const e of d.events) if (c[e.impact] != null) c[e.impact] += 1;
  return c;
}

export function currenciesOf(days) {
  const s = new Set();
  for (const d of days) for (const e of d.events) if (e.country) s.add(e.country);
  return [...s].sort();
}

/** Apply the impact chips and the currency multiselect. Holidays (impact 0) always pass the impact filter. */
export function filterDays(days, { impacts, countries }) {
  return days.map((d) => ({
    ...d,
    events: d.events.filter((e) => (e.impact === 0 || impacts.has(e.impact)) && (!countries.length || countries.includes(e.country))),
  }));
}

/** ±window around an event, in the user's timezone, for the auto-lock modal. */
export function lockWindow(event, minutes = 15, tz) {
  const t = new Date(event.event_time_utc).getTime();
  const from = new Date(t - minutes * 60000), to = new Date(t + minutes * 60000);
  const fmt = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, ...(tz ? { timeZone: tz } : {}) });
  return { from, to, fromLabel: fmt(from), toLabel: fmt(to) };
}
