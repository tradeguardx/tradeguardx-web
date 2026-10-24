import ZONE_COUNTRIES from './zoneCountries';
/**
 * The ONE zone every dashboard date and time is shown in.
 *
 * WHY THIS EXISTS. Until the product went global, every screen formatted
 * with a hard-coded `timeZone: 'Asia/Kolkata'` and a literal " IST" suffix.
 * For an Indian trader that was right by accident; for a trader in Dubai it
 * put every trade, every lock and every "today" five and a half hours off
 * their own clock, and labelled the result IST so nothing looked wrong.
 *
 * WHICH ZONE WINS, and why in this order:
 *   1. The profile's timezone. It is also the zone the engine resets the
 *      daily limits on (early morning, the user's time), so showing anything else
 *      would make "today" on screen disagree with "today" for the rules.
 *   2. The browser's zone. Before the profile answers — and for a profile
 *      that has none yet — the device clock is the best guess, and it is the
 *      value we send to fill the profile in the first place.
 *   3. 'UTC'. Only when Intl itself is broken. Never India: guessing India
 *      for everyone is exactly the bug this file removes.
 *
 * It is a module-level value rather than React state because it is read
 * from plain formatting helpers (shareData, revengeFormat, lifecycle…) that
 * have no hooks. AuthContext calls `setUserZone` when the profile loads and
 * mirrors the value into context so screens re-render on a change.
 */

const STORE_KEY = 'tgx.userZone';

let profileZone = readStored();
const listeners = new Set();

/** True when `tz` is an IANA name this runtime can format in. */
export function isValidZone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/*
 * Asia/Calcutta is the old spelling of Asia/Kolkata. ICU still hands it out
 * as canonical on some runtimes (Node 20 does), so one Indian user could be
 * stored under either name. Always use the modern one, for the picker and
 * for what we send the server.
 */
const ALIASES = { 'Asia/Calcutta': 'Asia/Kolkata', 'Etc/UTC': 'UTC', 'Etc/GMT': 'UTC', GMT: 'UTC' };
export function normalizeZone(tz) {
  return ALIASES[tz] ?? tz;
}

/** The device's zone, or 'UTC' when Intl cannot say. */
export function browserZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidZone(tz) ? normalizeZone(tz) : 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The zone to display in right now. See the order at the top of the file. */
export function getUserZone() {
  return profileZone || browserZone();
}

/** The profile's own zone, or null when the profile has none (yet). */
export function getProfileZone() {
  return profileZone;
}

/**
 * Called by AuthContext with the profile's timezone (or null on sign-out).
 *
 * Remembered in localStorage so a reload renders in the right zone on the
 * first paint, before the profile call answers — otherwise a Dubai user
 * travelling with a laptop set to London would see every time jump once.
 */
export function setUserZone(tz, { persist = true } = {}) {
  const next = isValidZone(tz) ? normalizeZone(tz) : null;
  if (next === profileZone) return;
  profileZone = next;
  // A read-only mirror passes persist:false — it must leave no trace in the
  // operator's own browser (see lib/mirror.js).
  if (persist) {
    try {
      if (next) localStorage.setItem(STORE_KEY, next);
      else localStorage.removeItem(STORE_KEY);
    } catch { /* private mode — the in-memory value still works */ }
  }
  for (const fn of listeners) {
    try { fn(getUserZone()); } catch { /* one bad listener must not stop the rest */ }
  }
}

/** Subscribe to zone changes; returns the unsubscribe function. */
export function subscribeUserZone(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readStored() {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return isValidZone(v) ? normalizeZone(v) : null;
  } catch {
    return null;
  }
}

/** Spread into a toLocale*String options object: `{ ...inUserZone(), day: 'numeric' }`. */
export function inUserZone() {
  return { timeZone: getUserZone() };
}

// ── Offsets and labels ────────────────────────────────────────────────────

function partsIn(tz, at) {
  const out = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at)) out[p.type] = p.value;
  return out;
}

/** Minutes east of UTC for `tz` at the instant `at` (DST-aware). */
export function zoneOffsetMinutes(tz = getUserZone(), at = new Date()) {
  try {
    const d = at instanceof Date ? at : new Date(at);
    const p = partsIn(tz, d);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  } catch {
    return 0;
  }
}

/** "GMT+4", "GMT+5:30", "GMT−3:30", "GMT" — the offset, spelled the way Intl spells it. */
export function zoneOffsetLabel(tz = getUserZone(), at = new Date()) {
  const m = zoneOffsetMinutes(tz, at);
  if (m === 0) return 'GMT';
  const abs = Math.abs(m);
  const mm = abs % 60;
  return `GMT${m < 0 ? '-' : '+'}${Math.floor(abs / 60)}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;
}

/*
 * Intl returns "GMT+5:30" for Asia/Kolkata and "GMT+4" for Dubai in en-US,
 * which is correct and which nobody there would ever write. The common
 * abbreviations are worth naming; past these, en-US knows the American ones
 * (EDT, PST) and en-GB the European ones (BST, CEST), and anything else
 * falls back to the honest offset.
 */
const ZONE_NAMES = {
  'Asia/Kolkata': 'IST', 'Asia/Calcutta': 'IST', UTC: 'UTC', 'Etc/UTC': 'UTC',
  'Asia/Dubai': 'GST', 'Asia/Muscat': 'GST', 'Asia/Singapore': 'SGT', 'Asia/Hong_Kong': 'HKT', 'Asia/Tokyo': 'JST',
};

function intlAbbr(locale, tz, at) {
  try {
    const v = new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: 'short' }).formatToParts(at).find((x) => x.type === 'timeZoneName')?.value;
    return v && !/^(GMT|UTC)[+\-−]/.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** Short zone label: "IST", "GST", "EDT", "BST", or "GMT+5:45" when there is no common name. */
export function zoneLabel(tz = getUserZone(), at = new Date()) {
  if (!tz) return '';
  if (ZONE_NAMES[tz]) return ZONE_NAMES[tz];
  if (!isValidZone(tz)) return '';
  return intlAbbr('en-US', tz, at) || intlAbbr('en-GB', tz, at) || zoneOffsetLabel(tz, at);
}

const PLACE_NAMES = { 'Asia/Kolkata': 'India', 'Asia/Calcutta': 'India', UTC: 'UTC' };

/** "Dubai", "New York", "India" — the place half of "Dubai time (GMT+4)". */
let regionNames;
/** "Nepal" for Asia/Kathmandu; null for zones with no country (UTC, Etc/…). */
export function zoneCountryName(tz) {
  const code = ZONE_COUNTRIES[tz];
  if (!code) return null;
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(code) ?? null;
  } catch {
    return null;
  }
}

export function zonePlace(tz = getUserZone()) {
  if (PLACE_NAMES[tz]) return PLACE_NAMES[tz];
  const last = String(tz).split('/').pop() || String(tz);
  return last.replace(/_/g, ' ');
}

// ── Day and month keys ────────────────────────────────────────────────────

/**
 * 'YYYY-MM-DD' for the calendar day `date` falls on in the user's zone.
 *
 * Built from parts rather than `toLocaleDateString('en-CA')`, whose ISO
 * ordering is a locale convention, not a promise. Sortable as a string.
 */
export function dayKey(date, tz = getUserZone()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const p = partsIn(tz, d);
    return `${p.year}-${p.month}-${p.day}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** 'YYYY-MM' for the month `date` falls in, in the user's zone. */
export function monthKey(date, tz = getUserZone()) {
  return dayKey(date, tz).slice(0, 7);
}

/**
 * Epoch ms of the last millisecond of the user-zone day `ms` falls in.
 *
 * The offset is read at the guessed midnight itself, then re-read once, so a
 * DST change on that night lands on the right side.
 */
export function dayEnd(ms, tz = getUserZone()) {
  const key = dayKey(new Date(ms), tz);
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  const nextMidnightUtc = Date.UTC(y, m - 1, d + 1);
  let guess = nextMidnightUtc - zoneOffsetMinutes(tz, new Date(nextMidnightUtc)) * 60000;
  guess = nextMidnightUtc - zoneOffsetMinutes(tz, new Date(guess)) * 60000;
  return Number.isFinite(guess) ? guess - 1 : null;
}

/**
 * A server-side 'YYYY-MM-DD' (a date with no time) rendered as a label.
 *
 * Read at UTC noon and formatted in UTC, so the day printed is the day the
 * key names whatever zone the viewer is in. Formatting it in the user's
 * zone would show 2 Oct for '2026-10-03' in New York.
 */
export function formatDateKey(key, opts = { day: 'numeric', month: 'short' }) {
  if (!key) return '';
  const d = new Date(`${String(key).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
}

// ── The picker's list ─────────────────────────────────────────────────────

/*
 * For a runtime without Intl.supportedValuesOf (Safari < 15.4). Not every
 * zone — enough to cover where traders actually are; whatever the profile
 * already holds is added on top by the picker.
 */
const FALLBACK_ZONES = [
  'UTC', 'Europe/London', 'Europe/Lisbon', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Zurich', 'Europe/Istanbul', 'Europe/Moscow', 'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi',
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kathmandu', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta',
  'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Seoul', 'Asia/Tokyo',
  'Australia/Perth', 'Australia/Sydney', 'Pacific/Auckland', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
  'America/Mexico_City', 'America/Bogota', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Anchorage', 'Pacific/Honolulu',
];

/** Every zone the picker offers: IANA names, aliases folded, UTC included, sorted. */
export function allZones() {
  let list = FALLBACK_ZONES;
  try {
    if (typeof Intl.supportedValuesOf === 'function') list = Intl.supportedValuesOf('timeZone');
  } catch { /* fallback list */ }
  // supportedValuesOf leaves UTC out on some runtimes; it is the one zone
  // every trader recognises, so it always goes in.
  const set = new Set(['UTC', ...list.map(normalizeZone)]);
  return [...set].filter(isValidZone).sort();
}
