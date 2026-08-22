import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { fetchTaxSummary } from '../api/tradesApi';

/**
 * Indian financial-year tax summary.
 *
 * The single most important thing this page exists to say: under Section
 * 115BBH you can owe tax on a LOSING year, because gains are taxed at 30% flat
 * and losses cannot be offset against them. A trader who finished the year down
 * still has a bill. That case gets the loudest treatment on the page rather
 * than being left for the reader to infer from four numbers.
 *
 * Every figure is reconstructed by FIFO from raw exchange fills — Delta exposes
 * no realized-P&L field at all — so the page is careful to show its own
 * coverage (`dataCompleteness`) and never to present an estimate as a filing.
 */

const ACCENT = '#00d4aa';
const LOSS = '#f87171';
const WARN = '#f59e0b';

/** FY start year → "FY2026-27". */
function fyLabelFor(year) {
  return `FY${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

function currentFyStartYear() {
  // Indian FY starts 1 April, on the IST calendar.
  const nowIst = new Date(Date.now() + 5.5 * 3600 * 1000);
  const m = nowIst.getUTCMonth() + 1;
  return m >= 4 ? nowIst.getUTCFullYear() : nowIst.getUTCFullYear() - 1;
}

function money(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, color, hint }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--dash-text-faint)' }}>
        {label}
      </p>
      <p className="mt-1.5 font-mono text-2xl font-bold" style={{ color: color || 'var(--dash-text-primary)' }}>
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--dash-text-faint)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default function TaxPage() {
  const { session } = useAuth();
  const { selectedAccount } = useTradingAccounts();
  const accessToken = session?.access_token;
  const tradingAccountId = selectedAccount?.id;

  const thisFy = currentFyStartYear();
  const [fy, setFy] = useState(thisFy);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only offer years the product could plausibly have data for — the backfill
  // anchor is FY2025, so listing older years would promise coverage we don't
  // have.
  const fyOptions = useMemo(() => {
    const years = [];
    for (let y = thisFy; y >= 2025; y--) years.push(y);
    return years;
  }, [thisFy]);

  const load = useCallback(
    async (signal) => {
      if (!accessToken || !tradingAccountId) return;
      setLoading(true);
      setError('');
      try {
        setData(await fetchTaxSummary({ accessToken, tradingAccountId, fy, signal }));
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError(err?.details?.error?.message || err?.message || 'Could not load your tax summary.');
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

  const net = Number(data?.netTradingPnl ?? 0);
  const tax = Number(data?.estimatedTax ?? 0);
  // The case worth shouting about: a losing year that still owes tax.
  const taxedOnALoss = Boolean(data) && net < 0 && tax > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--dash-text-primary)' }}>
            Tax
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
            Estimated Indian financial-year position, rebuilt from your exchange fills.
          </p>
        </div>

        <div className="flex gap-1.5">
          {fyOptions.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setFy(y)}
              className="rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors"
              style={{
                borderColor: fy === y ? ACCENT : 'var(--dash-border)',
                backgroundColor: fy === y ? 'rgba(0,212,170,0.14)' : 'transparent',
                color: fy === y ? ACCENT : 'var(--dash-text-secondary)',
              }}
            >
              {fyLabelFor(y)}
            </button>
          ))}
        </div>
      </div>

      {!tradingAccountId && (
        <p className="mt-6 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
          Select a trading account to see its tax position.
        </p>
      )}

      {error && (
        <div
          className="mt-6 rounded-xl border p-4 text-sm"
          style={{ borderColor: `${LOSS}55`, backgroundColor: `${LOSS}12`, color: LOSS }}
        >
          {error}
        </div>
      )}

      {loading && !data && (
        <p className="mt-6 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
          Loading…
        </p>
      )}

      {data && (
        <>
          {taxedOnALoss && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-start gap-3 rounded-2xl border p-5"
              style={{ borderColor: `${WARN}66`, backgroundColor: `${WARN}12` }}
            >
              <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke={WARN} strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
              <div>
                <p className="text-sm font-bold" style={{ color: WARN }}>
                  You owe tax even though this year is down ₹{money(Math.abs(net))}
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                  Section 115BBH taxes each gain at 30% and lets you offset nothing against it — your
                  losing trades don&apos;t reduce the bill on your winning ones. Set aside roughly{' '}
                  <span className="font-mono font-bold">₹{money(tax)}</span>.
                </p>
              </div>
            </motion.div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Gross winnings" value={`₹${money(data.grossWinnings)}`} color={ACCENT} hint="Sum of profitable trades — what's taxed" />
            <StatCard label="Gross losses" value={`₹${money(data.grossLosses)}`} color={LOSS} hint="Not deductible under 115BBH" />
            <StatCard label="Net P&L" value={`₹${money(data.netTradingPnl)}`} color={net >= 0 ? ACCENT : LOSS} hint="What you actually made or lost" />
            <StatCard label="Estimated tax" value={`₹${money(data.estimatedTax)}`} color={WARN} hint={`${Math.round((data.taxRate ?? 0.3) * 100)}% of gross winnings`} />
          </div>

          <p className="mt-3 text-xs" style={{ color: 'var(--dash-text-faint)' }}>
            {data.tradeCount} closed trades in {data.fyLabel}.
          </p>

          {data.dataCompleteness === 'partial' && (
            <div
              className="mt-4 rounded-xl border p-4 text-sm"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}
            >
              <span className="font-bold" style={{ color: 'var(--dash-text-secondary)' }}>
                Partial history.
              </span>{' '}
              We haven&apos;t synced all the way back to the start of {data.fyLabel}, so trades before
              our coverage begins are missing from these totals. Treat this as a floor, not a final number.
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
            {data.disclaimer}
          </p>
        </>
      )}
    </motion.div>
  );
}
