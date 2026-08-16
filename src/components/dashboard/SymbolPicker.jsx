import { useEffect, useRef, useState } from 'react';
import { fetchAnalyserSymbols, ANALYSER_SYMBOLS } from '../../api/analyserApi';

/**
 * Searchable symbol combobox — crypto, Indian equities (NSE/BSE) and forex.
 *
 * Searching runs server-side. The catalogue is ~9,200 symbols once NSE/BSE is
 * included, so downloading it to filter in the browser (what the crypto-only
 * version did) stops being reasonable; each keystroke returns a few KB instead.
 */

const MARKET_LABEL = { crypto: 'CRYPTO', india: 'NSE/BSE', forex: 'FX' };
const MARKET_COLOR = { crypto: '#f59e0b', india: '#22c55e', forex: '#38bdf8' };

export default function SymbolPicker({ value, onChange, accessToken }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Debounced server search. Also runs with an empty query on open, which is how
  // the default cross-market picks get loaded.
  useEffect(() => {
    if (!open || !accessToken) return undefined;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetchAnalyserSymbols({ accessToken, q: query, limit: 50, signal: ctrl.signal })
        .then((list) => setResults(Array.isArray(list) ? list : []))
        // Silent: the fallback picks still render and free-text entry still works.
        .catch(() => {})
        .finally(() => setLoading(false));
    }, query ? 180 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, query, accessToken]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  // Keep the highlighted row in view during arrow-key navigation.
  useEffect(() => {
    listRef.current?.children?.[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const rows = results.length > 0 ? results : (query ? [] : ANALYSER_SYMBOLS);

  const commit = (sym) => {
    // Keep ':' and '/' — they namespace Indian (NSE:TCS) and forex (EUR/USD).
    const clean = (sym || '').trim().toUpperCase().replace(/[^A-Z0-9:/ ]/g, '');
    if (clean) onChange(clean);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Fall back to the raw query so a valid symbol works even if unlisted.
      commit(rows[cursor]?.symbol || query);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const barStyle = {
    backgroundColor: 'var(--dash-bg-input)',
    border: '1px solid var(--dash-border)',
    color: 'var(--dash-text-primary)',
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-bold"
        style={barStyle}
      >
        <svg className="h-3.5 w-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
        </svg>
        {value}
      </button>

      {open && (
        <div
          className="absolute left-0 top-9 z-40 w-80 overflow-hidden rounded-xl border shadow-xl"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search BTC, NIFTY, RELIANCE, EUR/USD…"
            className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
            style={{ color: 'var(--dash-text-primary)', borderBottom: '1px solid var(--dash-border)' }}
          />

          <div className="max-h-80 overflow-y-auto py-1" ref={listRef}>
            {rows.map((r, i) => (
              <button
                key={r.symbol}
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => commit(r.symbol)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
                style={{ backgroundColor: i === cursor ? 'var(--dash-bg-card-hover)' : 'transparent' }}
              >
                <span
                  className="w-14 shrink-0 rounded px-1 py-0.5 text-center text-[9px] font-bold"
                  style={{ color: MARKET_COLOR[r.market] || 'var(--dash-text-faint)', border: `1px solid ${MARKET_COLOR[r.market] || 'var(--dash-border)'}33` }}
                >
                  {MARKET_LABEL[r.market] || '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold"
                    style={{ color: r.symbol === value ? 'var(--accent)' : 'var(--dash-text-secondary)' }}>
                    {r.symbol}
                  </span>
                  {r.name && (
                    <span className="block truncate text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>
                      {r.name}
                    </span>
                  )}
                </span>
              </button>
            ))}

            {rows.length === 0 && (
              <button
                type="button"
                onClick={() => commit(query)}
                className="w-full px-3 py-2.5 text-left text-xs font-semibold"
                style={{ color: 'var(--dash-text-secondary)' }}
              >
                {loading ? 'Searching…' : `Use "${query.toUpperCase()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
