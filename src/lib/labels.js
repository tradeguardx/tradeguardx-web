/**
 * Turning storage values into copy.
 *
 * Slugs, enums and UUIDs are how the database talks to itself; users kept
 * seeing them verbatim ("pro_plus", "delta_india", a 36-char trade id). One
 * place to map them means a new exchange or plan doesn't leak raw the next time.
 */

const PLAN_LABELS = { free: 'Free', pro: 'Pro', pro_plus: 'Pro+', proplus: 'Pro+' };

const BROKER_LABELS = {
  delta_india: 'Delta Exchange',
  delta_global: 'Delta Exchange (Global)',
  coindcx: 'CoinDCX Futures',
  shark: 'Shark Exchange',
  blofin: 'BloFin',
  exness: 'Exness',
};

const EQUITY_MODE_LABELS = { funded: 'Funded', live: 'Live', demo: 'Demo' };

const SOURCE_LABELS = { delta: 'Delta Exchange', coindcx: 'CoinDCX', shark: 'Shark', blofin: 'BloFin', exness: 'Exness', extension: 'Extension', manual: 'Manual' };

/** Fallback: snake/kebab → Title Case, so an unmapped value still reads like English. */
function titleize(value) {
  return String(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function lookup(map, value, dash = '—') {
  if (value == null || value === '') return dash;
  const key = String(value).toLowerCase().replace(/[\s-]/g, '_');
  return map[key] ?? titleize(value);
}

export const planLabel = (slug) => lookup(PLAN_LABELS, slug);
export const brokerLabel = (slug) => lookup(BROKER_LABELS, slug);
export const equityModeLabel = (mode) => lookup(EQUITY_MODE_LABELS, mode);
export const sourceLabel = (source) => lookup(SOURCE_LABELS, source);

/** Behaviour tags etc. — "sl_widen_after_entry" → "SL widen after entry". */
export function tagLabel(value) {
  if (!value) return '';
  const text = String(value).replace(/[_-]+/g, ' ').trim();
  const first = text.charAt(0).toUpperCase() + text.slice(1);
  // Keep trading acronyms uppercase rather than "Sl"/"Pnl".
  return first.replace(/\b(sl|tp|pnl|rr|roi)\b/gi, (m) => m.toUpperCase());
}

/**
 * Identifiers are for support tickets, not for reading. Show enough to match
 * against a log line and no more.
 */
export function shortId(id, chars = 8) {
  if (!id) return '';
  const s = String(id);
  return s.length <= chars ? s : `${s.slice(0, chars)}…`;
}

/*
 * Exness positions are tickets: a hedging account can hold several on one
 * instrument, so the engine names each one `INSTRUMENT#side~ticketId`
 * ("BTCUSD#long~43195554") and the journal and alerts store that name. It is
 * an engine key, not copy: show "BTCUSD · Long" and keep the raw value for
 * matching, dedupe and every API call.
 */
const TICKET_RE = /^(.+?)#(long|short)~\S*$/i;
const TICKET_IN_TEXT_RE = /([A-Za-z0-9._/-]+)#(long|short)~[A-Za-z0-9]+/gi;

const sideWord = (side) => (side.toLowerCase() === 'short' ? 'Short' : 'Long');

/** "BTCUSD#long~43195554" → "BTCUSD · Long"; any other symbol unchanged. */
export function symbolLabel(symbol) {
  if (symbol == null) return symbol;
  const m = TICKET_RE.exec(String(symbol));
  return m ? `${m[1]} · ${sideWord(m[2])}` : symbol;
}

/** The instrument alone ("BTCUSD"), for grouping by symbol and price lookups. */
export function instrumentOf(symbol) {
  if (symbol == null) return symbol;
  const m = TICKET_RE.exec(String(symbol));
  return m ? m[1] : symbol;
}

/** Engine-written sentences ("Trade on ETHUSD#short~43392093 blocked") → "Trade on ETHUSD short blocked". */
export function symbolsInText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(TICKET_IN_TEXT_RE, (_, inst, side) => `${inst} ${side.toLowerCase()}`);
}
