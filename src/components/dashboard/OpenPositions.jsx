import { useCallback, useEffect, useState } from 'react';
import { fetchJournalTrades } from '../../api/tradesApi';

const POLL_MS = 15000;

function pick(o, ...keys) {
  for (const k of keys) if (o && o[k] != null) return o[k];
  return null;
}
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function tsMs(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}
function fmtHeld(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x) => String(x).padStart(2, '0');
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m ${pad(sec)}s`;
}

/**
 * "Now running" — the account's currently open positions (status OPEN journal
 * trades). Shows symbol, side, size, entry, and live held-time so the trader can
 * see what's live at a glance on the Live tab. Polls so it reflects opens/closes.
 */
export default function OpenPositions({ accessToken, tradingAccountId }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (signal) => {
      if (!accessToken || !tradingAccountId) return;
      try {
        const t = await fetchJournalTrades({ accessToken, tradingAccountId, limit: 50, signal });
        setTrades(Array.isArray(t) ? t : []);
      } catch {
        /* keep last known */
      } finally {
        setLoading(false);
      }
    },
    [accessToken, tradingAccountId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    load(ctrl.signal);
    const id = setInterval(() => load(ctrl.signal), POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [load]);

  const open = trades.filter((t) => String(pick(t, 'status') || '').toUpperCase() === 'OPEN');

  // Tick the held-time only while something is open.
  useEffect(() => {
    if (!open.length) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open.length]);

  return (
    <div className="mb-4 rounded-2xl border" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: open.length ? '1px solid var(--dash-border)' : 'none' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--dash-text-muted)' }}>Now running</p>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: open.length ? 'rgba(56,189,248,0.15)' : 'rgba(148,163,184,0.12)', color: open.length ? '#38bdf8' : 'var(--dash-text-faint)' }}>
          {open.length} open
        </span>
      </div>

      {loading && !trades.length ? (
        <p className="px-4 py-4 text-xs" style={{ color: 'var(--dash-text-muted)' }}>Loading positions…</p>
      ) : open.length === 0 ? (
        <p className="px-4 py-4 text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
          <span style={{ color: '#34d399' }}>●</span> Flat — no open positions right now.
        </p>
      ) : (
        <ul>
          {open.map((t) => {
            const symbol = pick(t, 'symbol') || '—';
            const side = (pick(t, 'side') || '').toUpperCase();
            const sideBuy = side === 'BUY';
            const qty = n(pick(t, 'quantity', 'volume'));
            const entry = n(pick(t, 'entryPrice', 'entry_price'));
            const openedAt = pick(t, 'openedAt', 'opened_at');
            const held = openedAt ? fmtHeld(now - tsMs(openedAt)) : null;
            return (
              <li key={pick(t, 'tradeUid', 'trade_uid') || t.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--dash-border)' }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: sideBuy ? '#34d399' : '#ef4444' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>{symbol}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: sideBuy ? '#34d399' : '#ef4444' }}>{side || '—'}</span>
                    {qty != null && (
                      <span className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>× {qty}</span>
                    )}
                    {entry != null && (
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--dash-text-secondary)' }}>@ {entry}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>Live</p>
                </div>
                {held && (
                  <span className="shrink-0 font-mono text-xs tabular-nums" style={{ color: 'var(--dash-text-secondary)' }}>{held}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
