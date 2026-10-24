/**
 * Phone-number helpers shared by every place we ask for a number (first-time
 * prompt, Alerts settings, support handoff).
 *
 * Built on libphonenumber-js's `/min` metadata: it validates numbers per
 * country (length + leading digits) without the full per-type patterns, which
 * is all we need to say "this can be a real number" and is roughly half the
 * size of the max build.
 *
 * Everything we STORE is E.164 ("+971501234567"). Everything we SHOW is a
 * country plus a national number formatted the way people there write it.
 */
import {
  AsYouType,
  Metadata,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/min';
// One sample mobile number per country (~4 kB) — the placeholder shows the
// shape of a number where the visitor is, not an Indian one everywhere.
import mobileExamples from 'libphonenumber-js/mobile/examples';
import { guessCountrySync } from './geo';
import ALIASES from './countryAliases';

/** India was the only market until now, so it stays the last-resort default. */
export const FALLBACK_COUNTRY = 'IN';

/**
 * No real national number is longer than 15 digits (E.164's ceiling); a
 * couple of spare digits lets someone type a trunk "0" without the field
 * silently eating their last digit.
 */
const MAX_DIGITS = 17;

const COUNTRY_SET = new Set(getCountries());

export function isSupportedCountry(code) {
  return typeof code === 'string' && COUNTRY_SET.has(code);
}

/** "AE" → 🇦🇪, built from regional-indicator symbols so no flag images ship. */
export function flagOf(code) {
  if (!/^[A-Z]{2}$/.test(code ?? '')) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function dialCodeOf(code) {
  try {
    return `+${getCountryCallingCode(code)}`;
  } catch {
    return '';
  }
}

let optionsCache;

/**
 * Every country libphonenumber knows, as { code, name, dial, flag }, sorted by
 * name. Names come from Intl.DisplayNames so we don't ship a 245-row table;
 * the handful of codes a browser can't name (Ascension "AC", Tristan "TA")
 * fall back to the code itself rather than disappearing from the list.
 */
export function countryOptions() {
  if (optionsCache) return optionsCache;
  let names = null;
  try {
    names = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    /* very old browser — codes only */
  }
  optionsCache = getCountries()
    .map((code) => {
      let name = code;
      try {
        name = names?.of(code) || code;
      } catch {
        /* unnameable code — keep the code */
      }
      return { code, name, dial: dialCodeOf(code), flag: flagOf(code) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return optionsCache;
}

/**
 * Filter the country list by what someone typed into the picker's search box:
 * a name ("emir"), an ISO code ("ae") or a dial code ("971" / "+971").
 * Name prefix matches rank above matches in the middle of a name, so "in"
 * puts India above Argentina.
 */

/**
 * "aue" for "uae", "usa" typed "uas": a three- or four-letter short name with
 * its letters in the wrong order. Only for short names — on anything longer a
 * shuffle is a different word, not a typo.
 */
const sortLetters = (w) => [...w].sort().join('');
function isShortAnagram(q, aliases) {
  if (q.length < 3 || q.length > 4 || !/^[a-z]+$/.test(q)) return false;
  const key = sortLetters(q);
  return aliases.some((a) => a.length === q.length && sortLetters(a) === key);
}

export function searchCountries(query, options = countryOptions()) {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return options;
  const digits = q.replace(/^\+/, '');
  if (/^\d+$/.test(digits)) return options.filter((o) => o.dial.slice(1).startsWith(digits));
  // Exact first ("uk" is the UK, not the start of Ukraine), then prefix, then
  // anywhere in the name.
  const exact = [];
  const starts = [];
  const contains = [];
  for (const o of options) {
    const name = o.name.toLowerCase();
    const aliases = ALIASES[o.code] ?? [];
    if (o.code.toLowerCase() === q || name === q || aliases.includes(q)) exact.push(o);
    else if (isShortAnagram(q, aliases)) starts.push(o);
    else if (name.startsWith(q) || aliases.some((a) => a.startsWith(q))) starts.push(o);
    else if (name.includes(q) || aliases.some((a) => a.includes(q))) contains.push(o);
  }
  return [...exact, ...starts, ...contains];
}

/** Parse anything to a phone object, or null. Never throws. */
function parse(text, country) {
  try {
    return parsePhoneNumberFromString(text ?? '', isSupportedCountry(country) ? country : undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * The national part of a parsed number, formatted for display.
 *
 * As-you-type formatting of the bare national number gives what people in
 * India actually write ("98765 43210", no trunk 0). Some countries only have a
 * format WITH the trunk prefix, and there as-you-type leaves the digits
 * unspaced ("7911123456"); for those, the national format ("07911 123456") is
 * the familiar one.
 */
function nationalDisplay(phone) {
  const plain = new AsYouType(phone.country).input(phone.nationalNumber);
  return /\D/.test(plain) ? plain : phone.formatNational();
}

/**
 * Split a stored E.164 value into what the input shows: { country, national }.
 * Null when there is nothing parseable — the caller then picks a default.
 */
export function splitE164(e164) {
  if (typeof e164 !== 'string' || !e164.startsWith('+')) return null;
  const phone = parse(e164);
  if (!phone) return null;
  // Non-geographic numbers (+800 freephone) have no country: show them whole.
  if (!phone.country) return { country: null, national: new AsYouType().input(e164) };
  return { country: phone.country, national: nationalDisplay(phone) };
}

/**
 * The country the picker starts on: the stored number's, else where the
 * visitor seems to be, else India.
 */
export function defaultPhoneCountry(storedE164) {
  const fromStored = splitE164(storedE164)?.country;
  if (fromStored) return fromStored;
  const guessed = guessCountrySync();
  return isSupportedCountry(guessed) ? guessed : FALLBACK_COUNTRY;
}

/** A sample national mobile number for the placeholder ("98765 43210" in IN). */
export function examplePlaceholder(country) {
  try {
    const phone = isSupportedCountry(country) ? getExampleNumber(country, mobileExamples) : null;
    return phone ? nationalDisplay(phone) : '';
  } catch {
    return '';
  }
}

/** Digits only. */
export function digitsOf(text) {
  return (text ?? '').replace(/\D/g, '');
}

/**
 * Format what someone typed into the number field.
 *
 * Returns { text, country } where `country` is set only when the text was a
 * complete, valid international number ("+44 7400 123456", pasted or
 * autofilled) — the input then switches its picker to that country and shows
 * just the national part.
 *
 * Only a VALID number switches. A half-typed "+1 4…" can resolve to the wrong
 * one of the 25 countries sharing +1, and once the picker had flipped the
 * remaining digits would be read against it. Until then the text stays
 * international and still produces the right E.164.
 */
let metadata;
/**
 * The country a "+…" text belongs to, as soon as its calling code is known:
 * "+971" is the UAE before a single local digit. A code shared by several
 * countries gives its main one (+1 the US, +44 the UK, +7 Russia) until the
 * digits after it say otherwise — AsYouType refines it as they arrive.
 */
export function countryOfInternational(text) {
  const digits = digitsOf(text);
  if (!digits) return null;
  try {
    const typer = new AsYouType();
    typer.input(`+${digits.slice(0, 15)}`);
    const exact = typer.getCountry();
    if (exact) return exact;
    const code = typer.getCallingCode();
    if (!code) return null;
    metadata ??= new Metadata();
    return metadata.getCountryCodesForCallingCode(code)?.[0] ?? null;
  } catch {
    return null;
  }
}

export function formatTyped(raw, country) {
  let text = raw ?? '';
  // "00971…" is how many people dial abroad — the same thing as "+971…".
  if (/^\s*00\d/.test(text)) text = `+${text.trim().slice(2)}`;
  if (text.trim().startsWith('+')) {
    const capped = `+${digitsOf(text).slice(0, 15)}`;
    const phone = parse(capped);
    if (phone?.country && phone.isValid()) return { text: nationalDisplay(phone), country: phone.country };
    // Not a whole number yet, but the code already says where: the picker
    // shows that flag while the text stays international (see PhoneInput).
    return { text: new AsYouType().input(capped), country: null, shownCountry: countryOfInternational(capped) };
  }
  const digits = digitsOf(text).slice(0, MAX_DIGITS);
  if (!digits) return { text: '', country: null };
  return { text: new AsYouType(isSupportedCountry(country) ? country : undefined).input(digits), country: null };
}

/**
 * E.164 for a national number in a country ("07911 123456", "GB" →
 * "+447911123456"). An international "+…" text is read as-is. A half-typed
 * number gives a partial E.164 (or '' when there is too little to parse) —
 * gate on isValidE164, never on this being non-empty.
 */
export function toE164(national, country) {
  if (!digitsOf(national)) return '';
  return parse(national, country)?.number ?? '';
}

/** True only for a number that is valid in its country. */
export function isValidE164(e164) {
  if (typeof e164 !== 'string' || !e164.startsWith('+')) return false;
  try {
    return isValidPhoneNumber(e164);
  } catch {
    return false;
  }
}
