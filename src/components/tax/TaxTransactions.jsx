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

/* Theme-aware — see index.css. The Tax Centre renders on both dashboard
   themes and colour is semantic here, so the values live in CSS per theme. */
const GREEN = 'var(--tax-pos)';
const GREEN_SOFT = 'var(--tax-pos-soft)';
const AMBER = 'var(--tax-warn)';
const AMBER_SOFT = 'var(--tax-warn-soft)';
const RED = 'var(--tax-neg)';
const RED_SOFT = 'var(--tax-neg-soft)';
const FAINT = 'var(--dash-text-faint)';
const MUTED = 'var(--dash-text-muted)';
const SECONDARY = 'var(--dash-text-secondary)';
const PRIMARY = 'var(--dash-text-primary)';
const BORDER = 'var(--dash-border)';
const RAISED = 'var(--dash-bg-raised)';

/**
 * The symbol comes from the API. Delta India settles in USD, and rendering
 * those figures with a rupee sign understated an Indian tax base ~84x.
 */
const SYMBOLS = { INR: '₹', USD: '$', USDT: '$' };

function money(n, currency, signed = false) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const sym = SYMBOLS[currency] ?? `${currency ?? '?'} `;
  const body = Math.abs(v).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (v < 0) return `−${sym}${body}`;
  return `${signed ? '+' : ''}${sym}${body}`;
}

/** Full date in the table — a tax row is read against a financial year. */
function longDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Outcome filters. Kept separate from the category tabs: category is the tax
 * REGIME (F&O vs VDA), outcome is what happened within it. Collapsing them into
 * one control would invite comparing a VDA gain against an F&O loss.
 */
const OUTCOMES = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'loss', label: 'Loss' },
  { key: 'excluded', label: 'Excluded' },
];

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

function Totals({ totals, category, currency }) {
  if (!totals) return null;
  const net = Number(totals.realizedPnl ?? 0);
  const gross = Number(totals.grossPnl ?? 0);
  const cards = [
    { label: 'Closed positions', value: String(totals.positions ?? 0), color: PRIMARY },
    { label: 'Gross trading P&L', value: money(gross, currency), color: gross < 0 ? RED : GREEN },
    // Negated on display: the Overview bridge shows this same money as a
    // deduction, and one figure with two signs across two tabs of a single
    // feature is how a reader stops trusting both.
    { label: 'Trading fees', value: money(-Math.abs(Number(totals.fees ?? 0)), currency), color: RED },
    { label: 'Net trading P&L', value: money(net, currency), color: net < 0 ? RED : GREEN },
    // The tax-relevant conclusion, highlighted — it is what a CA reads first.
    {
      label: net < 0 ? 'Potential business loss' : 'Potential business income',
      value: money(Math.abs(net), currency),
      color: net < 0 ? AMBER : GREEN,
      highlight: true,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border p-3.5"
          style={{
            borderColor: c.highlight ? 'var(--tax-warn)' : BORDER,
            backgroundColor: c.highlight ? AMBER_SOFT : RAISED,
          }}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: FAINT }}>
            {c.label}
          </div>
          <div className="mt-1.5 font-mono text-lg font-bold tracking-tight" style={{ color: c.color }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** How a position is treated, shown per row so the table is self-explaining. */
function treatmentOf(p) {
  if (p.instrumentType === 'UNKNOWN') return { label: 'EXCLUDED', fg: FAINT, bg: 'var(--dash-bg-input)' };
  if (p.instrumentType === 'SPOT') {
    return Number(p.realizedPnl) >= 0
      ? { label: 'VDA GAIN', fg: AMBER, bg: AMBER_SOFT }
      : { label: 'VDA LOSS', fg: AMBER, bg: AMBER_SOFT };
  }
  return Number(p.realizedPnl) >= 0
    ? { label: 'BUSINESS INCOME', fg: GREEN, bg: GREEN_SOFT }
    : { label: 'BUSINESS LOSS', fg: RED, bg: RED_SOFT };
}

/** Short, stable display id so a row can be quoted to a CA. */
function shortId(positionKey) {
  if (!positionKey) return '—';
  let h = 0;
  for (let i = 0; i < positionKey.length; i += 1) h = (h * 31 + positionKey.charCodeAt(i)) % 100000;
  return `#TGX-${String(h).padStart(4, '0')}`;
}

export default function TaxTransactions({ accessToken, tradingAccountId, fy }) {
  const [category, setCategory] = useState('FNO');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [outcome, setOutcome] = useState('all');

  /**
   * Client-side, because the endpoint already returns the year in one call and
   * a few hundred positions is nothing to hold. If accounts appear with tens of
   * thousands, this moves to limit/offset on the API rather than growing the
   * payload — the page size here is the natural place to notice that.
   */
  const PAGE_SIZE = 50;

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

  const inCategory = useMemo(
    () => (data?.positions ?? []).filter((p) => p.instrumentType === category),
    [data, category],
  );

  const counts = useMemo(
    () => ({
      all: inCategory.length,
      income: inCategory.filter((p) => Number(p.realizedPnl) > 0).length,
      loss: inCategory.filter((p) => Number(p.realizedPnl) < 0).length,
      excluded: (data?.totals?.UNKNOWN?.positions ?? 0),
    }),
    [inCategory, data],
  );

  const rows = useMemo(() => {
    let all = inCategory;
    if (outcome === 'income') all = all.filter((p) => Number(p.realizedPnl) > 0);
    if (outcome === 'loss') all = all.filter((p) => Number(p.realizedPnl) < 0);
    if (outcome === 'excluded') all = (data?.positions ?? []).filter((p) => p.instrumentType === 'UNKNOWN');
    const q = query.trim().toUpperCase();
    return q
      ? all.filter(
          (p) =>
            (p.symbol ?? '').toUpperCase().includes(q) || shortId(p.positionKey).toUpperCase().includes(q),
        )
      : all;
  }, [inCategory, data, outcome, query]);

  // Any change to what is being listed returns to the first page — otherwise
  // filtering to three rows while on page 4 shows an empty table.
  useEffect(() => {
    setPage(0);
  }, [category, query, outcome, data]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const firstShown = rows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const lastShown = safePage * PAGE_SIZE + pageRows.length;

  const totals = data?.totals?.[category];
  const currency = data?.currency ?? 'UNKNOWN';
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
                  backgroundColor: active ? GREEN_SOFT : 'transparent',
                  color: active ? GREEN : SECONDARY,
                }}
              >
                {c.label}
                <span className="font-mono text-[11px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Section header. The engine version sits here because this table is
          the audit surface — a CA quoting a row needs to know which ruleset
          produced it. */}
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-[15px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
          {CATEGORIES.find((c) => c.key === category)?.label}
        </span>
        {data?.versions?.taxRules && (
          <span className="ml-auto font-mono text-[11px]" style={{ color: FAINT }}>
            from tax engine · {data.versions.taxRules}
          </span>
        )}
      </div>
      <p className="-mt-2 text-xs" style={{ color: MUTED }}>
        {CATEGORIES.find((c) => c.key === category)?.note}
      </p>

      {/* Every figure here is converted. Saying so on this tab too, because a
          CA may open the position list without ever seeing the Overview. */}
      {data?.conversion?.applied && (
        <div
          className="flex items-start gap-2.5 rounded-xl border px-4 py-3"
          style={{ borderColor: 'var(--tax-warn)', backgroundColor: AMBER_SOFT }}
        >
          <span className="text-[11px] font-bold" style={{ color: AMBER }}>
            Converted at ₹{data.conversion.rate}/{data.conversion.from}
          </span>
          <span className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
            Delta settles in {data.conversion.from}; a disclosed assumption, not a statutory rate.
          </span>
        </div>
      )}

      <Totals totals={totals} category={category} currency={currency} />

      {/* Search + outcome filters. "Excluded" is its own filter rather than a
          hidden default: a position left out of the tax base is exactly what a
          reader needs to be able to find. */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbol or position ID"
          className="rounded-xl border px-3.5 py-2 text-sm outline-none"
          style={{ borderColor: BORDER, backgroundColor: RAISED, color: PRIMARY, minWidth: 230 }}
        />
        {OUTCOMES.map((o) => {
          const active = outcome === o.key;
          const n = counts[o.key] ?? 0;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setOutcome(o.key)}
              className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors"
              style={{
                borderColor: active ? 'transparent' : BORDER,
                backgroundColor: active ? 'var(--dash-text-primary)' : RAISED,
                color: active ? 'var(--dash-bg-raised)' : SECONDARY,
              }}
            >
              {o.label}
              <span className="font-mono text-[11px] opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {/* Anything unclassified is surfaced, never folded into a regime. */}
      {unknown?.positions > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl border p-4"
          style={{ borderColor: 'var(--tax-warn)', backgroundColor: AMBER_SOFT }}
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
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--tax-neg)', backgroundColor: RED_SOFT, color: RED }}>
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
                <tr style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                  {[
                    { h: 'Date', align: 'left' },
                    { h: 'Symbol', align: 'left' },
                    { h: 'Side', align: 'left' },
                    { h: 'Gross · Fees', align: 'right' },
                    { h: 'Net P&L', align: 'right' },
                    { h: 'Tax treatment', align: 'right' },
                  ].map((c) => (
                    <th
                      key={c.h}
                      className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider"
                      style={{ color: FAINT, textAlign: c.align, borderBottom: `1px solid ${BORDER}` }}
                    >
                      {c.h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => {
                  const net = Number(p.realizedPnl);
                  const t = treatmentOf(p);
                  const isLong = String(p.side).toLowerCase() === 'long';
                  return (
                    <tr key={p.positionKey} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px]" style={{ color: MUTED }}>
                        {longDate(p.closedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[12.5px] font-bold" style={{ color: PRIMARY }}>
                          {p.symbol}
                        </div>
                        {/* A quotable handle for the row, so a CA can point at
                            one position without reciting a symbol and a date. */}
                        <div className="mt-0.5 font-mono text-[10.5px]" style={{ color: FAINT }}>
                          {shortId(p.positionKey)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded px-2 py-0.5 font-mono text-[9.5px] font-extrabold tracking-wider"
                          style={{
                            backgroundColor: isLong ? GREEN_SOFT : RED_SOFT,
                            color: isLong ? GREEN : RED,
                          }}
                        >
                          {isLong ? 'LNG' : 'SHT'}
                        </span>
                      </td>
                      {/* Gross above, fees beneath — the two numbers that make
                          the net, stacked so the subtraction is visible. */}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div
                          className="font-mono text-[12px]"
                          style={{ color: Number(p.grossPnl) < 0 ? RED : GREEN }}
                        >
                          {money(p.grossPnl, currency, true)}
                        </div>
                        <div className="mt-0.5 font-mono text-[10.5px]" style={{ color: FAINT }}>
                          {money(-Math.abs(Number(p.fees ?? 0)), currency)}
                        </div>
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-3 text-right font-mono text-[12.5px] font-bold"
                        style={{ color: net < 0 ? RED : GREEN }}
                      >
                        {money(net, currency, true)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="whitespace-nowrap rounded px-2 py-1 text-[9px] font-extrabold tracking-wider"
                          style={{ backgroundColor: t.bg, color: t.fg }}
                        >
                          {t.label}
                        </span>
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
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[11px]" style={{ color: FAINT }}>
            Showing{' '}
            <span className="font-mono font-bold" style={{ color: SECONDARY }}>
              {firstShown}–{lastShown}
            </span>{' '}
            of{' '}
            <span className="font-mono font-bold" style={{ color: SECONDARY }}>
              {rows.length}
            </span>{' '}
            position{rows.length === 1 ? '' : 's'}. Each row is one open-to-flat position, not a single
            fill — one close can match several FIFO lots.
          </p>

          {pageCount > 1 && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((v) => Math.max(0, v - 1))}
                disabled={safePage === 0}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-35"
                style={{
                  borderColor: BORDER,
                  color: safePage === 0 ? FAINT : SECONDARY,
                  cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span className="px-2 font-mono text-[11.5px]" style={{ color: MUTED }}>
                {safePage + 1} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((v) => Math.min(pageCount - 1, v + 1))}
                disabled={safePage >= pageCount - 1}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-35"
                style={{
                  borderColor: BORDER,
                  color: safePage >= pageCount - 1 ? FAINT : SECONDARY,
                  cursor: safePage >= pageCount - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
