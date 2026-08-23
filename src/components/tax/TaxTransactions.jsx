import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchTaxPositions } from '../../api/tradesApi';

/**
 * Position-level detail behind the summary — the audit trail, and the answer to
 * "where does that number come from?".
 *
 * Two decisions shape this screen:
 *
 *  1. It lists POSITIONS, not lot matches. The engine stores FIFO lot matches,
 *     so one close can produce dozens of rows; showing them raw would tell a
 *     trader they took 1,464 trades when they took 303. The lot count is kept
 *     per row so the FIFO detail is still visible, just not mistaken for
 *     trade count.
 *
 *  2. F&O and VDA are separate tabs, never one list with a column. They are
 *     different tax regimes whose figures must not be added together — a
 *     combined total would be a number that means nothing. Each tab carries
 *     its own totals for the same reason.
 *
 * Like the rest of the Tax Centre, this renders what the engine returns and
 * computes no tax of its own.
 */

const GREEN = '#34e2a8';
const AMBER = '#fbbf24';
const RED = '#f87171';
const FAINT = 'var(--dash-text-faint)';
const MUTED = 'var(--dash-text-muted)';
const SECONDARY = 'var(--dash-text-secondary)';
const PRIMARY = 'var(--dash-text-primary)';
const BORDER = 'var(--dash-border)';
const RAISED = 'var(--dash-bg-raised)';

function inr(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const body = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? '−₹' : '₹'}${body}`;
}

function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const CATEGORIES = [
  {
    key: 'FNO',
    label: 'F&O / Business',
    // Stated on the tab itself, because the whole point of separating them is
    // that the treatment differs.
    note: 'Gains and losses net. Fees are part of the trading result.',
  },
  {
    key: 'SPOT',
    label: 'VDA / 115BBH',
    note: 'Each gain taxed on its own. Losses and fees are not deductible.',
  },
];

function Totals({ totals, category }) {
  if (!totals) return null;
  const net = Number(totals.realizedPnl ?? 0);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: 'Positions', value: String(totals.positions ?? 0), color: PRIMARY },
        {
          label: 'Winners / losers',
          value: `${totals.winners ?? 0} / ${totals.losers ?? 0}`,
          color: PRIMARY,
        },
        { label: 'Fees', value: inr(totals.fees), color: RED },
        {
          label: category === 'FNO' ? 'Net result' : 'Gross gains',
          value: inr(net),
          color: net < 0 ? RED : GREEN,
        },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border p-3.5" style={{ borderColor: BORDER, backgroundColor: RAISED }}>
          <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: FAINT }}>
            {s.label}
          </div>
          <div className="mt-1 font-mono text-lg font-bold" style={{ color: s.color }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TaxTransactions({ accessToken, tradingAccountId, fy }) {
  const [category, setCategory] = useState('FNO');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(
    async (signal) => {
      if (!accessToken || !tradingAccountId) return;
      setLoading(true);
      setError('');
      try {
        setData(await fetchTaxPositions({ accessToken, tradingAccountId, fy, signal }));
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError(err?.details?.error?.message || err?.message || 'Could not load your positions.');
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken, tradingAccountId, fy],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const rows = useMemo(() => {
    const all = (data?.positions ?? []).filter((p) => p.instrumentType === category);
    const q = query.trim().toUpperCase();
    return q ? all.filter((p) => (p.symbol ?? '').toUpperCase().includes(q)) : all;
  }, [data, category, query]);

  const totals = data?.totals?.[category];
  const unknown = data?.totals?.UNKNOWN;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
      {/* category tabs — two regimes, never merged */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border p-1" style={{ borderColor: BORDER, backgroundColor: RAISED }}>
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            const count = data?.totals?.[c.key]?.positions ?? 0;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: active ? 'rgba(52,226,168,0.12)' : 'transparent',
                  color: active ? GREEN : SECONDARY,
                }}
              >
                {c.label}
                <span className="font-mono text-[11px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by symbol"
          className="ml-auto rounded-xl border px-3.5 py-2 text-sm outline-none"
          style={{ borderColor: BORDER, backgroundColor: RAISED, color: PRIMARY, minWidth: 190 }}
        />
      </div>

      <p className="text-xs" style={{ color: MUTED }}>
        {CATEGORIES.find((c) => c.key === category)?.note}
      </p>

      <Totals totals={totals} category={category} />

      {/* Anything unclassified is surfaced, never folded into a regime. */}
      {unknown?.positions > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl border p-4"
          style={{ borderColor: `${AMBER}55`, backgroundColor: `${AMBER}12` }}
        >
          <span className="text-sm font-bold" style={{ color: AMBER }}>
            {unknown.positions} positions need review
          </span>
          <span className="text-xs" style={{ color: SECONDARY }}>
            Their instrument type could not be determined, so they are excluded from both categories rather than
            assumed into one.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: `${RED}55`, backgroundColor: `${RED}12`, color: RED }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <p className="text-sm" style={{ color: MUTED }}>
          Loading positions…
        </p>
      )}

      {data && rows.length === 0 && (
        <div
          className="rounded-2xl border border-dashed p-8 text-center"
          style={{ borderColor: BORDER }}
        >
          <p className="text-sm font-bold" style={{ color: PRIMARY }}>
            No {category === 'FNO' ? 'F&O' : 'spot / VDA'} positions in this year
          </p>
          <p className="mt-1.5 text-xs" style={{ color: MUTED }}>
            {category === 'SPOT'
              ? 'Every position on this account is a derivative, so none falls under Section 115BBH.'
              : 'Nothing matched this filter.'}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, backgroundColor: RAISED }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 760 }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  {['Symbol', 'Side', 'Qty', 'Closed', 'Gross P&L', 'Fees', 'Net P&L', 'Lots'].map((h, i) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider"
                      style={{ color: FAINT, textAlign: i >= 4 ? 'right' : 'left', borderBottom: `1px solid ${BORDER}` }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const net = Number(p.realizedPnl);
                  return (
                    <tr key={p.positionKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 text-[12.5px] font-bold" style={{ color: PRIMARY }}>
                        {p.symbol}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider"
                          style={{
                            backgroundColor: p.side === 'long' ? `${GREEN}1e` : `${RED}1e`,
                            color: p.side === 'long' ? GREEN : RED,
                          }}
                        >
                          {p.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px]" style={{ color: SECONDARY }}>
                        {Number(p.quantity).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px]" style={{ color: MUTED }}>
                        {shortDate(p.closedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[12px]" style={{ color: SECONDARY }}>
                        {inr(p.grossPnl)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[12px]" style={{ color: RED }}>
                        {inr(p.fees)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono text-[12.5px] font-bold"
                        style={{ color: net < 0 ? RED : GREEN }}
                      >
                        {inr(net)}
                      </td>
                      {/* One position, many FIFO lot matches — shown so the
                          detail is available without inflating trade count. */}
                      <td className="px-4 py-3 text-right font-mono text-[11.5px]" style={{ color: FAINT }}>
                        {p.lotMatches}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <p className="text-[11px]" style={{ color: FAINT }}>
          {rows.length} position{rows.length === 1 ? '' : 's'} shown. Each row is one open-to-flat position;
          &ldquo;lots&rdquo; is how many FIFO matches it took to close.
        </p>
      )}
    </motion.div>
  );
}
