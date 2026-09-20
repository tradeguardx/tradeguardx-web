import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGuard } from '../context/GuardContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { fetchUnifiedTrades } from '../api/tradesApi';
import { useTradeAnnotationsBulk } from '../hooks/useTradeAnnotations';
import { fmtMoney } from '../lib/session';
import { sx } from '../components/dashboard/shell/sx';

/**
 * All trades — the reference table (lines 1365–1399) with the full filter
 * set the previous page had: view, range, side, sort and search, plus a
 * summary strip for the filtered set and pagination. Everything lives in the
 * URL (?view=&range=&side=&sort=&q=&page=) so a filtered page can be shared.
 * Same data source (fetchUnifiedTrades) and annotation hook as before; rows
 * open the existing trade detail.
 */

const VIEWS = [
  { key: 'all', label: 'All trades' },
  { key: 'wins', label: 'Wins' },
  { key: 'losses', label: 'Losses' },
  { key: 'open', label: 'Open' },
  { key: 'blocked', label: 'With rule breaks' },
  { key: 'review', label: 'Needs review' },
  { key: 'annotated', label: 'Annotated' },
];
const RANGES = [{ key: '24h', label: '24h', days: 1 }, { key: '7d', label: '7d', days: 7 }, { key: '30d', label: '30d', days: 30 }, { key: 'all', label: 'All time', days: null }];
const SIDES = [{ key: 'any', label: 'Any side' }, { key: 'buy', label: 'Long' }, { key: 'sell', label: 'Short' }];
const SORTS = [{ key: 'newest', label: 'Newest' }, { key: 'oldest', label: 'Oldest' }, { key: 'best', label: 'Best P&L' }, { key: 'worst', label: 'Worst P&L' }];
const PAGE_SIZES = [25, 50, 100];
const DEFAULTS = { view: 'all', range: 'all', side: 'any', sort: 'newest', q: '', page: '1', size: '25' };
const GRID = 'display:grid;grid-template-columns:1.3fr 1fr .8fr .7fr .8fr 1fr .8fr;gap:12px';
const SEL = 'padding:7px 30px 7px 11px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:600;appearance:none;-webkit-appearance:none';

function pick(o, ...keys) { for (const k of keys) if (o && o[k] != null) return o[k]; return null; }
function isClosed(t) { return String(t?.status || '').toUpperCase() === 'CLOSED'; }
function pnlOf(t) { return Number(pick(t, 'realizedPnl', 'pnl', 'netPnl')); }
function isLong(t) { const s = String(pick(t, 'side') || '').toUpperCase(); return s === 'BUY' || s === 'LONG'; }
function ruleBlockCount(t) { return Number(t?.aiShortInsight?.evidence?.eventCounts?.ruleBlocks || 0); }
function hasAnnotation(ann) { return !!(ann && (ann.rating || ann.setupType || ann.emotion || (ann.notes && ann.notes.trim()))); }
function isMeaningful(t) {
  if (!t || typeof t !== 'object') return false;
  const symbol = String(t.symbol || '').trim().toUpperCase();
  if (!symbol || symbol === '-' || symbol === '—' || symbol === '--' || symbol === 'UNKNOWN') return false;
  return ['BUY', 'SELL', 'LONG', 'SHORT'].includes(String(t.side || '').trim().toUpperCase());
}
function fmtWhen(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }); } catch { return '—'; }
}
function fmtHold(open, close) {
  if (!open) return '—';
  const ms = (close ? new Date(close) : new Date()) - new Date(open);
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function Select({ label, value, options, onChange }) {
  return (
    <label style={sx('display:inline-flex;align-items:center;gap:6px')}>
      <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)")}>{label}</span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} style={sx(SEL)}>
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', right: 10, top: '50%', marginTop: -6, pointerEvents: 'none', color: 'var(--ink-3)' }}><path d="M7 10l5 5 5-5" /></svg>
      </span>
    </label>
  );
}

export default function AllTradesPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { selectedTradingAccountId, accountsLoading, selectedAccount } = useTradingAccounts();
  const { now } = useGuard();
  const [params, setParams] = useSearchParams();
  const get = (k, valid) => { const v = params.get(k) ?? DEFAULTS[k]; return valid && !valid.includes(v) ? DEFAULTS[k] : v; };
  const view = get('view', VIEWS.map((v) => v.key));
  const range = get('range', RANGES.map((r) => r.key));
  const side = get('side', SIDES.map((s) => s.key));
  const sort = get('sort', SORTS.map((s) => s.key));
  const q = params.get('q') ?? '';
  const size = Number(get('size', PAGE_SIZES.map(String)));
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const [draft, setDraft] = useState(q);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const accessToken = session?.access_token;
  const cur = selectedAccount?.accountCurrency || 'USD';

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === '' || v === DEFAULTS[k]) next.delete(k); else next.set(k, String(v)); }
    // any filter change goes back to page 1 unless the change *is* the page
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Search applies on a short pause, not per keystroke, so the URL does not churn.
  useEffect(() => {
    if (draft === q) return undefined;
    const t = setTimeout(() => setParam({ q: draft.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    if (!accessToken || !selectedTradingAccountId) return undefined;
    const ctrl = new AbortController();
    Promise.resolve().then(() => { if (!ctrl.signal.aborted) { setRows(null); setError(''); } });
    fetchUnifiedTrades({ accessToken, tradingAccountId: selectedTradingAccountId, limit: 500, signal: ctrl.signal })
      .then((r) => { if (!ctrl.signal.aborted) setRows((Array.isArray(r) ? r : []).filter(isMeaningful)); })
      .catch((e) => { if (!ctrl.signal.aborted) { setRows([]); setError(e?.message || 'Could not load trades'); } });
    return () => ctrl.abort();
  }, [accessToken, selectedTradingAccountId]);

  const tradeUids = useMemo(() => (rows ?? []).map((t) => t.tradeUid).filter(Boolean), [rows]);
  const annotations = useTradeAnnotationsBulk(tradeUids);

  const filtered = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? null;
    const needle = q.trim().toLowerCase();
    const list = (rows ?? []).filter((t) => {
      const when = new Date(pick(t, 'openedAt', 'closedAt')).getTime();
      if (days != null && (!Number.isFinite(when) || now - when > days * 86400000)) return false;
      if (side === 'buy' && !isLong(t)) return false;
      if (side === 'sell' && isLong(t)) return false;
      if (needle && !String(t.symbol || '').toLowerCase().includes(needle) && !String(t.tradeUid || '').toLowerCase().includes(needle)) return false;
      const pnl = pnlOf(t); const closed = isClosed(t);
      const ann = t.tradeUid ? annotations[t.tradeUid] : null;
      switch (view) {
        case 'wins': return closed && pnl > 0;
        case 'losses': return closed && pnl < 0;
        case 'open': return !closed;
        case 'blocked': return ruleBlockCount(t) > 0;
        case 'review': return closed && !hasAnnotation(ann);
        case 'annotated': return hasAnnotation(ann);
        default: return true;
      }
    });
    const at = (t) => new Date(pick(t, 'openedAt', 'closedAt')).getTime() || 0;
    const p = (t) => (Number.isFinite(pnlOf(t)) ? pnlOf(t) : 0);
    if (sort === 'oldest') list.sort((a, b) => at(a) - at(b));
    else if (sort === 'best') list.sort((a, b) => p(b) - p(a));
    else if (sort === 'worst') list.sort((a, b) => p(a) - p(b));
    else list.sort((a, b) => at(b) - at(a));
    return list;
  }, [rows, view, range, side, sort, q, annotations, now]);

  const stats = useMemo(() => {
    const closed = filtered.filter((t) => isClosed(t) && Number.isFinite(pnlOf(t)));
    const wins = closed.filter((t) => pnlOf(t) > 0).length;
    const net = closed.reduce((s, t) => s + pnlOf(t), 0);
    const breaks = filtered.reduce((s, t) => s + ruleBlockCount(t), 0);
    return { total: filtered.length, open: filtered.length - closed.length, net, winRate: closed.length ? Math.round((wins / closed.length) * 100) : null, breaks };
  }, [filtered]);

  const counts = useMemo(() => {
    const all = rows ?? [];
    const ann = (t) => hasAnnotation(t.tradeUid ? annotations[t.tradeUid] : null);
    return { all: all.length, wins: all.filter((t) => isClosed(t) && pnlOf(t) > 0).length, losses: all.filter((t) => isClosed(t) && pnlOf(t) < 0).length, open: all.filter((t) => !isClosed(t)).length, blocked: all.filter((t) => ruleBlockCount(t) > 0).length, review: all.filter((t) => isClosed(t) && !ann(t)).length, annotated: all.filter(ann).length };
  }, [rows, annotations]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * size, current * size);
  const active = view !== 'all' || range !== 'all' || side !== 'any' || q !== '';

  const pageBtn = (label, target, disabled, aria) => (
    <button type="button" disabled={disabled} aria-label={aria} onClick={() => setParam({ page: target })} style={sx('padding:7px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink-2);font-size:12px;font-weight:700', disabled ? { opacity: 0.45, cursor: 'default' } : {})}>{label}</button>
  );

  return (
    <div style={sx('animation:tgxSlide .22s ease-out')}>
      <div style={sx('margin-bottom:16px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>All trades</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Every fill on this account. Filters live in the URL, so a filtered view can be shared or bookmarked.</p>
      </div>

      {/* view pills */}
      <div style={sx('display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap')} role="tablist">
        {VIEWS.map((f) => {
          const on = f.key === view;
          return (
            <button key={f.key} type="button" role="tab" aria-selected={on} onClick={() => setParam({ view: f.key })} style={sx('display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;font-size:12.5px;font-weight:600', { border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`, background: on ? 'var(--ink)' : 'var(--surface-2)', color: on ? 'var(--surface)' : 'var(--ink-2)' })}>
              {f.label}
              {rows && <span style={sx("font:500 10.5px/1 'JetBrains Mono',monospace", { color: on ? 'var(--surface)' : 'var(--ink-faint)', opacity: on ? 0.75 : 1 })}>{counts[f.key]}</span>}
            </button>
          );
        })}
      </div>

      {/* search · range · side · sort */}
      <div data-tgx-stack="1" style={sx('display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap')}>
        <span style={sx('position:relative;flex:1;min-width:min(220px,100%)')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" style={{ position: 'absolute', left: 11, top: '50%', marginTop: -7, color: 'var(--ink-faint)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search symbol or trade id" aria-label="Search trades" style={sx('width:100%;padding:8px 12px 8px 32px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px')} />
        </span>
        <Select label="Range" value={range} options={RANGES} onChange={(v) => setParam({ range: v })} />
        <Select label="Side" value={side} options={SIDES} onChange={(v) => setParam({ side: v })} />
        <Select label="Sort" value={sort} options={SORTS} onChange={(v) => setParam({ sort: v })} />
        {active && <button type="button" onClick={() => { setDraft(''); setParam({ view: 'all', range: 'all', side: 'any', sort: 'newest', q: '' }); }} style={sx('padding:7px 11px;border:0;background:none;color:var(--ink-3);font-size:12px;font-weight:600;text-decoration:underline')}>Clear filters</button>}
      </div>

      {/* summary strip for the filtered set */}
      {rows && rows.length > 0 && (
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px;margin-bottom:14px')}>
          {[
            { k: 'Trades', v: String(stats.total), note: stats.open ? `${stats.open} open` : 'all closed', fg: 'var(--ink)' },
            { k: 'Net P&L', v: fmtMoney(stats.net, cur, { sign: true, decimals: 2 }), note: 'closed trades in view', fg: stats.net < 0 ? 'var(--red)' : stats.net > 0 ? 'var(--mint)' : 'var(--ink)' },
            { k: 'Win rate', v: stats.winRate == null ? '—' : `${stats.winRate}%`, note: 'closed trades in view', fg: 'var(--ink)' },
            { k: 'Rule breaks', v: String(stats.breaks), note: stats.breaks ? 'across the trades in view' : 'clean', fg: stats.breaks ? 'var(--red)' : 'var(--ink)' },
          ].map((c) => (
            <div key={c.k} style={sx('padding:12px 14px;border:1px solid var(--line);border-radius:13px;background:var(--surface);box-shadow:var(--shadow-card)')}>
              <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint)")}>{c.k}</div>
              <div style={sx("margin-top:8px;font:700 19px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.03em", { color: c.fg })}>{c.v}</div>
              <div style={sx('margin-top:5px;font-size:11px;color:var(--ink-3)')}>{c.note}</div>
            </div>
          ))}
        </div>
      )}

      <section style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div data-tgx-thead="1" style={sx(GRID, sx('padding:11px 18px;border-bottom:1px solid var(--line);background:var(--surface-2);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600'))}>
          <span>When</span><span>Symbol</span><span>Side</span><span>Size</span><span>Hold</span><span>Rule breaks</span><span style={{ textAlign: 'right' }}>P&amp;L</span>
        </div>
        {error && <div style={sx('padding:14px 18px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--amber)')}>{error}</div>}
        {rows === null || accountsLoading ? (
          [0, 1, 2, 3, 4].map((i) => <div key={i} style={sx('height:46px;border-bottom:1px solid var(--line);background:var(--surface-2);animation:tgxPulse 1.4s ease-in-out infinite')} />)
        ) : slice.length === 0 ? (
          <div style={sx('padding:52px 20px;text-align:center')}>
            <div style={sx('font-size:14px;font-weight:600')}>{rows.length === 0 ? 'No trades yet' : 'Nothing matches these filters'}</div>
            <p style={sx('margin:7px auto 0;font-size:12.5px;line-height:1.55;color:var(--ink-3);max-width:46ch')}>{rows.length === 0 ? 'Every fill on this account lands here automatically, tagged with any rules it broke. Nothing to show until you trade.' : 'Widen the range or clear a filter — every fill on this account is still here.'}</p>
          </div>
        ) : slice.map((t) => {
          const long = isLong(t); const pnl = pnlOf(t); const blocks = ruleBlockCount(t); const closed = isClosed(t);
          return (
            <button key={t.tradeUid || t.id} type="button" className="tr-row" data-tgx-trow="1" onClick={() => t.tradeUid && navigate(`/dashboard/trades/${encodeURIComponent(t.tradeUid)}`)} style={sx(GRID, sx('width:100%;padding:13px 18px;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left;align-items:center;font-size:13px;color:var(--ink);font-variant-numeric:tabular-nums'))}>
              <span data-c="when" style={sx('color:var(--ink-3)')}>{fmtWhen(pick(t, 'openedAt', 'closedAt'))}</span>
              <span data-c="sym" style={sx('font-weight:600')}>{pick(t, 'symbol')}</span>
              <span data-c="side" style={sx('font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase', { color: long ? 'var(--mint)' : 'var(--red)' })}>{long ? 'Long' : 'Short'}</span>
              <span data-c="size">{pick(t, 'quantity', 'volume') ?? '—'}</span>
              <span data-c="hold" style={sx('color:var(--ink-3)')}>{fmtHold(pick(t, 'openedAt'), pick(t, 'closedAt'))}</span>
              <span data-c="blocks"><span style={sx('font-size:11.5px;font-weight:600;padding:3px 8px;border-radius:999px', blocks > 0 ? { background: 'var(--red-tint)', color: 'var(--red)' } : { background: 'var(--surface-3)', color: 'var(--ink-3)' })}>{blocks > 0 ? `${blocks} ${blocks === 1 ? 'break' : 'breaks'}` : 'clean'}</span></span>
              <span data-c="pnl" style={sx('text-align:right;font-weight:600', { color: !closed ? 'var(--ink-3)' : pnl < 0 ? 'var(--red)' : pnl > 0 ? 'var(--mint)' : 'var(--ink)' })}>{closed && Number.isFinite(pnl) ? fmtMoney(pnl, cur, { sign: true }) : 'open'}</span>
            </button>
          );
        })}

        {filtered.length > 0 && (
          <div data-tgx-stack="1" style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:var(--surface-2);flex-wrap:wrap')}>
            <span style={sx('font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums')}>
              Showing <strong style={sx('color:var(--ink);font-weight:700')}>{(current - 1) * size + 1}–{Math.min(current * size, filtered.length)}</strong> of {filtered.length}
              {rows.length !== filtered.length ? ` (${rows.length} total)` : ''}
            </span>
            <span style={sx('display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap')}>
              <Select label="Per page" value={String(size)} options={PAGE_SIZES.map((n) => ({ key: String(n), label: String(n) }))} onChange={(v) => setParam({ size: v })} />
              {pageBtn('‹', current - 1, current <= 1, 'Previous page')}
              <span style={sx("font:500 11.5px/1 'JetBrains Mono',monospace;color:var(--ink-2);padding:0 4px")}>{current} / {pages}</span>
              {pageBtn('›', current + 1, current >= pages, 'Next page')}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
