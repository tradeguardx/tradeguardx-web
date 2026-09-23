import { useState } from 'react';
import { isBetaVenue } from '../../lib/venues';
import { sx } from './shell/sx';

/**
 * The square mark that stands for a venue.
 *
 * Uses the venue's own logo when we hold the file, and a branded monogram
 * otherwise — never a broken image and never a blank tile. Adding a venue's
 * logo is therefore just dropping `public/brokers/<file>.svg` in and naming
 * it here; nothing else changes.
 *
 * `accent` is only used by the monogram, and is a colour taken from the
 * venue's own branding so the fallback still reads as that venue rather than
 * as a generic grey box.
 */
const VENUES = {
  delta: { logo: '/brokers/delta-exchange.svg', accent: '#FD7D02', short: 'DX' },
  coindcx: { logo: null, accent: '#EF7A18', short: 'CD' },
  bitget: { logo: '/brokers/bitget.svg', accent: '#00F0FF', short: 'BG' },
  bybit: { logo: null, accent: '#F7A600', short: 'BY' },
};

function familyOf(slug) {
  const s = String(slug ?? '');
  if (s.startsWith('delta')) return 'delta';
  if (s.startsWith('coindcx')) return 'coindcx';
  if (s.startsWith('bybit')) return 'bybit';
  if (s.startsWith('bitget')) return 'bitget';
  return null;
}

/**
 * "BETA" beside a venue's name. Small, but it is the difference between a
 * user choosing CoinDCX knowing no real key has run through it end to end,
 * and finding that out during a breach.
 */
export function VenueBetaBadge({ slug }) {
  if (!isBetaVenue(slug)) return null;
  return (
    <span
      title="Live, but newly added — tell us straight away if anything looks wrong."
      style={sx("font:700 8.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:3px 6px;border-radius:5px;background:var(--amber-tint);color:var(--amber);border:1px solid var(--amber-line);white-space:nowrap")}
    >
      Beta
    </span>
  );
}

export default function VenueMark({ slug, name, size = 38, radius = 11 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const venue = VENUES[familyOf(slug)] ?? null;
  const logo = venue?.logo && !imgFailed ? venue.logo : null;
  const accent = venue?.accent ?? 'var(--ink-3)';
  const initials = String(name || '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
  const short = venue?.short ?? (initials || '·');

  return (
    <span
      aria-hidden
      style={sx('flex:none;display:grid;place-items:center;overflow:hidden', {
        width: size,
        height: size,
        borderRadius: radius,
        background: logo ? 'var(--surface-2)' : `color-mix(in srgb, ${accent} 12%, var(--surface-2))`,
        border: `1px solid ${logo ? 'var(--line)' : `color-mix(in srgb, ${accent} 34%, transparent)`}`,
      })}
    >
      {logo ? (
        <img src={logo} alt="" onError={() => setImgFailed(true)} style={{ width: size * 0.56, height: size * 0.56, objectFit: 'contain' }} />
      ) : (
        <span style={sx("font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.04em", { color: accent })}>{short}</span>
      )}
    </span>
  );
}
