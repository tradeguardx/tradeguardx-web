import { useState } from 'react';
import { useNoAutofill } from '../../lib/noAutofill';
import { extraFieldValid } from '../../lib/venues';
import { sx } from './shell/sx';

/**
 * The connect-form inputs a venue asks for beyond "API key + API secret".
 *
 * Every venue before Exness fitted two one-line boxes (plus BloFin's
 * passphrase). Exness needs a multi-line private key and two more values, and
 * the same form is drawn in three places (the connect page, the add-account
 * form, the account settings panel). Rather than special-case Exness in each,
 * the venue describes its fields in lib/venues.js — `secretMultiline`,
 * `extraFields` — and these render them. Venues that declare neither render
 * exactly what they always did, because the callers only reach for these when
 * the venue asks.
 *
 * Two looks, because the three callers have two: `connect` is the connect
 * page's inline-style form, `dash` the Tailwind dashboard forms.
 */

/**
 * A private key box: several lines, monospace, masked until revealed, and
 * kept out of every autofill and spellcheck path (the same opt-outs as
 * SecretInput). Wraps rather than scrolls sideways, so a 64-character PEM line
 * cannot push a 390px phone screen wider than itself.
 *
 * It is never filled from anything we hold — the value lives in the page only
 * while someone is pasting it, and the callers clear it after connecting.
 */
export function SecretTextarea({ value, onChange, placeholder, id, name = 'tgx-val-d', disabled, className = '', style, wrapperClassName = '', wrapperStyle, rows = 5 }) {
  const [reveal, setReveal] = useState(false);
  const noAutofill = useNoAutofill();
  return (
    <div className={`relative ${wrapperClassName}`} style={{ maxWidth: '100%', ...wrapperStyle }}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        {...noAutofill}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          wordBreak: 'break-all',
          ...style,
          paddingRight: 40,
          WebkitTextSecurity: reveal || !value ? 'none' : 'disc',
        }}
      />
      <button
        type="button"
        onClick={() => setReveal((r) => !r)}
        aria-label={reveal ? 'Hide private key' : 'Show private key'}
        title={reveal ? 'Hide' : 'Show'}
        tabIndex={-1}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-200"
      >
        {reveal ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.2A10 10 0 0112 5c4.5 0 8.3 2.9 9.5 7a10 10 0 01-2.4 3.9M6.6 6.6A10 10 0 002.5 12c1.3 4.1 5 7 9.5 7 1.7 0 3.3-.4 4.7-1.2" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

const CONNECT_LABEL = 'display:block;font-size:11.5px;font-weight:600;color:var(--ink-2);margin-bottom:6px';
const CONNECT_INPUT = "width:100%;max-width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;background:var(--surface-2);color:var(--ink);font:400 13px/1.3 'JetBrains Mono',monospace";
const DASH_INPUT_CLASS = 'mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--mint-line)]';
const DASH_INPUT_STYLE = {
  borderColor: 'var(--dash-border)',
  backgroundColor: 'var(--dash-bg-input)',
  color: 'var(--dash-text-primary)',
};

/**
 * The venue's extra inputs (Exness: Account ID, API host), in declaration
 * order. `values` is { [field.name]: string }; `onChange(name, value)`.
 */
export function VenueExtraFields({ fields, values, onChange, disabled, variant = 'dash', idPrefix = 'cx-extra' }) {
  const noAutofill = useNoAutofill();
  if (!fields?.length) return null;
  return fields.map((f) => {
    const val = values?.[f.name] ?? '';
    const bad = val.trim() !== '' && !extraFieldValid(f, val);
    const id = `${idPrefix}-${f.name}`;
    const input = (
      <input
        id={variant === 'connect' ? id : undefined}
        type="text"
        name={`tgx-x-${f.name}`}
        inputMode={f.inputMode}
        {...noAutofill}
        value={val}
        onChange={(e) => onChange(f.name, e.target.value)}
        disabled={disabled}
        placeholder={f.placeholder}
        aria-invalid={bad || undefined}
        className={variant === 'connect' ? 'cx-input' : DASH_INPUT_CLASS}
        style={variant === 'connect' ? sx(CONNECT_INPUT) : DASH_INPUT_STYLE}
      />
    );
    const optional = f.required ? null : ' (optional)';
    if (variant === 'connect') {
      return (
        <div key={f.name} style={sx('margin-bottom:12px')}>
          <label htmlFor={id} style={sx(CONNECT_LABEL)}>
            {f.label}
            {optional && <span style={sx('font-weight:400;color:var(--ink-3)')}>{optional}</span>}
            {f.hint && <span style={sx('font-weight:400;color:var(--ink-3)')}> — {f.hint}</span>}
          </label>
          {input}
          {bad && <p style={sx('margin:5px 0 0;font-size:11.5px;color:var(--amber)')}>{f.invalidHint ?? 'Check this value.'}</p>}
        </div>
      );
    }
    return (
      <label key={f.name} className="block min-w-0">
        <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
          {f.label}
          {optional && <span style={{ color: 'var(--dash-text-muted)' }}>{optional}</span>}
        </span>
        {input}
        {f.hint && (
          <span className="mt-1 block text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>{f.hint}</span>
        )}
        {bad && (
          <span className="mt-1 block text-[11px]" style={{ color: 'var(--amber)' }}>{f.invalidHint ?? 'Check this value.'}</span>
        )}
      </label>
    );
  });
}

/** A venue's platform caveat (Exness: native accounts only, not MT4/MT5). */
export function VenuePlatformNote({ venue, variant = 'dash' }) {
  if (!venue?.platformNote) return null;
  if (variant === 'connect') {
    return (
      <p style={sx('margin:11px 0 0;padding:11px 13px;border:1px solid var(--amber-line);border-radius:10px;background:var(--amber-tint);font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:70ch')}>
        <strong style={sx('font-weight:700', { color: 'var(--amber)' })}>Not for MT4 or MT5.</strong>{' '}
        {venue.platformNote}
      </p>
    );
  }
  return (
    <p className="rounded-lg px-3 py-2 text-[12px] leading-relaxed" style={{ border: '1px solid var(--amber-line)', background: 'var(--amber-tint)', color: 'var(--dash-text-secondary)' }}>
      <strong style={{ color: 'var(--amber)' }}>Not for MT4 or MT5.</strong> {venue.platformNote}
    </p>
  );
}
