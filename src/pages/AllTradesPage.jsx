import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { fetchUnifiedTrades } from '../api/tradesApi';
import { useTradeAnnotationsBulk } from '../hooks/useTradeAnnotations';
import { fmtMoney } from '../lib/session';
import { sx } from '../components/dashboard/shell/sx';

/**
 * All trades — transcribed from the reference (lines 1365–1399). Filters
 * live in the URL (`?view=`) so a filtered view can be shared, as before.
 * Same data source (fetchUnifiedTrades) and annotation hook as the previous
 * page; rows open the existing trade detail.
 */

const FILTERS = [
  { key: 'all', label: 'All trades' },
  { key: 'wins', label: 'Wins' },
  { key: 'losses', label: 'Losses' },
  { key: 'blocked', label: 'With rule breaks' },
  { key: 'review', label: 'Annotated' },
];

function pick(o, ...keys) { for (const k of keys) if (o && o[k] != null) return o[k]; return null; }
function isClosed(t) { return String(t?.status || '').toUpperCase() === 'CLOSED'; }
function ruleBlockCount(t) { return Number(t?.aiShortInsight?.evidence?.eventCounts?.ruleBlocks || 0); }
function hasAnnotation(ann) { return !!(ann && (ann.rating || ann.setupType || ann.emotion || (ann.notes && ann.notes.trim()))); }
function isMeaningful(t) {
  if (!t || typeof t !== 'object') return false;
  const symbol = String(t.symbol || '').trim().toUpperCase();
  if (!symbol || symbol === '-' || symbol === '—' || symbol === '--' || symbol === 'UNKNOWN') return false;
  const side = String(t.side || '').trim().toUpperCase();
  return ['BUY', 'SELL', 'LONG', 'SHORT'].includes(side);
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

export default function AllTradesPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { selectedTradingAccountId, accountsLoading, selectedAccount } = useTradingAccounts();
  const [params, setParams] = useSearchParams();
  const view = FILTERS.some((f) => f.key === params.get('view')) ? params.get('view') : 'all';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const accessToken = session?.access_token;

  useEffect(() => {
    if (!accessToken || !selectedTradingAccountId) return undefined;
    const ctrl = new AbortController();
    // Reset happens inside the async tick so the effect body itself stays free of setState.
    Promise.resolve().then(() => { if (!ctrl.signal.aborted) { setRows(null); setError(''); } });
    fetchUnifiedTrades({ accessToken, tradingAccountId: selectedTradingAccountId, limit: 200, signal: ctrl.signal })
      .then((r) => { if (!ctrl.signal.aborted) setRows((Array.isArray(r) ? r : []).filter(isMeaningful)); })
      .catch((e) => { if (!ctrl.signal.aborted) { setRows([]); setError(e?.message || 'Could not load trades'); } });
    return () => ctrl.abort();
  }, [accessToken, selectedTradingAccountId]);

  const tradeUids = useMemo(() => (rows ?? []).map((t) => t.tradeUid).filter(Boolean), [rows]);
  const annotations = useTradeAnnotationsBulk(tradeUids);

  const visible = useMemo(() => {
    const list = (rows ?? []).slice().sort((a, b) => new Date(pick(b, 'openedAt', 'closedAt')) - new Date(pick(a, 'openedAt', 'closedAt')));
    return list.filter((t) => {
      const pnl = Number(pick(t, 'realizedPnl', 'pnl', 'netPnl'));
      if (view === 'wins') return isClosed(t) && pnl > 0;
      if (view === 'losses') return isClosed(t) && pnl < 0;
      if (view === 'blocked') return ruleBlockCount(t) > 0;
      if (view === 'review') return hasAnnotation(t.tradeUid ? annotations[t.tradeUid] : null);
      return true;
    });
  }, [rows, view, annotations]);

  const cur = selectedAccount?.accountCurrency || 'USD';

  return (
    <div>
      <div style={sx('margin-bottom:16px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>All trades</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Every fill on this account. Filters live in the URL, so a filtered view can be shared or bookmarked.</p>
      </div>
      <div style={sx('display:flex;gap:7px;margin-bottom:14px;flex-wrap:wrap')} role="tablist">
        {FILTERS.map((f) => {
          const on = f.key === view;
          return (
            <button key={f.key} type="button" role="tab" aria-selected={on} onClick={() => { const next = new URLSearchParams(params); if (f.key === 'all') next.delete('view'); else next.set('view', f.key); setParams(next, { replace: true }); }} style={sx('padding:7px 13px;border-radius:999px;font-size:12.5px;font-weight:600', { border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`, background: on ? 'var(--ink)' : 'var(--surface-2)', color: on ? 'var(--surface)' : 'var(--ink-2)' })}>{f.label}</button>
          );
        })}
      </div>
      <section data-tgx-table="" style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div data-tgx-thead="1" style={sx('display:grid;grid-template-columns:1.3fr 1fr .8fr .7fr .8fr 1fr .8fr;gap:12px;padding:11px 18px;border-bottom:1px solid var(--line);background:var(--surface-2);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>
          <span>When</span><span>Symbol</span><span>Side</span><span>Size</span><span>Hold</span><span>Rule breaks</span><span style={{ textAlign: 'right' }}>P&amp;L</span>
        </div>
        {error && <div style={sx('padding:14px 18px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--amber)')}>{error}</div>}
        {rows === null || accountsLoading ? (
          <div style={sx('padding:30px 18px;text-align:center;color:var(--ink-3);font-size:13px')}>Loading…</div>
        ) : visible.length === 0 ? (
          <div style={sx('padding:52px 20px;text-align:center')}>
            <div style={sx('font-size:14px;font-weight:600')}>{rows.length === 0 ? 'No trades yet' : 'Nothing matches this filter'}</div>
            <p style={sx('margin:7px auto 0;font-size:12.5px;line-height:1.55;color:var(--ink-3);max-width:46ch')}>{rows.length === 0 ? 'Every fill on this account lands here automatically, tagged with any rules it broke. Nothing to show until you trade.' : 'Try another filter — every fill on this account is still here.'}</p>
          </div>
        ) : visible.map((t) => {
          const side = String(pick(t, 'side') || '').toUpperCase();
          const long = side === 'BUY' || side === 'LONG';
          const pnl = Number(pick(t, 'realizedPnl', 'pnl', 'netPnl'));
          const blocks = ruleBlockCount(t);
          const closed = isClosed(t);
          return (
            <button key={t.tradeUid || t.id} type="button" className="tr-row" data-tgx-trow="1" onClick={() => t.tradeUid && navigate(`/dashboard/trades/${encodeURIComponent(t.tradeUid)}`)} style={sx('width:100%;display:grid;grid-template-columns:1.3fr 1fr .8fr .7fr .8fr 1fr .8fr;gap:12px;padding:13px 18px;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left;align-items:center;font-size:13px;color:var(--ink);font-variant-numeric:tabular-nums')}>
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
      </section>
    </div>
  );
}
