import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { fetchTaxSummary } from '../api/tradesApi';
import TaxTransactions from '../components/tax/TaxTransactions';

/**
 * Tax centre — an Indian FY analysis built from reconciled exchange data.
 *
 * This screen's job is TRUST, not analytics. It deliberately carries no charts:
 * the reader is deciding whether to believe a number they may hand to a CA, and
 * a chart cannot answer "where did this come from?".
 *
 * The story order is fixed and must not be rearranged:
 *   what happened -> how we calculated it -> can I trust it ->
 *   how might it be taxed -> optional planning -> what to give my CA -> audit
 *
 * Two rules run through every line below:
 *
 *  1. COLOUR IS SEMANTIC, not decoration. Green means verified or reconciled;
 *     amber means needs review or ILLUSTRATIVE; red means an actual negative
 *     economic value. Red must never imply tax is owed, because no figure on
 *     this page is a confirmed liability — the VDA number is amber for exactly
 *     that reason.
 *
 *  2. PRECISION IS SEMANTIC. Anything traceable to a fill or wallet entry shows
 *     paise; anything illustrative or derived shows whole rupees. A CA reading
 *     "Funding -18" above "Funding -18.02" stops trusting both.
 *
 * THE CONTRACT — read before editing:
 *
 *   The Tax UI must never calculate tax amounts. Every tax figure the Tax
 *   Centre displays must originate from the versioned Tax Engine API. F&O
 *   business income has NO generic frontend 30% calculation, and must not
 *   acquire one — the engine deliberately returns taxable income and never a
 *   rupee tax, because slab, surcharge and cess depend on income this product
 *   cannot see.
 *
 *   This page may format currency, format numbers, and choose what to show. It
 *   may not compute a tax, a rate, a deduction or a loss set-off. That rule was
 *   broken once by copying arithmetic out of a design fixture; a design fixture
 *   is a VISUAL EXAMPLE, never authoritative tax logic.
 *
 *   Guards: `scripts/check-no-tax-arithmetic.mjs` (CI) and `TaxPage.test.jsx`.
 *
 * The copy is legally load-bearing and reviewed — it says "economic result"
 * rather than "taxable income", "Expense treatment: CA review" rather than
 * "deductible: yes", and never states carry-forward as fact. Reword only with
 * legal/CA sign-off.
 */

/* Semantic palette. The dashboard surface is #070a12, so these are the
   on-dark variants — the light-surface tones from the design reference are
   unreadable here. */
/* Theme-aware. The Tax Centre renders on both the dark and light dashboard
   themes, and colour carries meaning here — green = reconciled, amber =
   illustrative or needs review, red = an actual negative. The bright on-dark
   tones wash out to nothing on white, so the values live in CSS per theme. */
const GREEN = 'var(--tax-pos)';
const GREEN_SOFT = 'var(--tax-pos-soft)';
const MINT = 'var(--tax-accent)';
const AMBER = 'var(--tax-warn)';
const AMBER_SOFT = 'var(--tax-warn-soft)';
const RED = 'var(--tax-neg)';
const VIOLET = 'var(--tax-violet)';
const VIOLET_SOFT = 'var(--tax-violet-soft)';
const FAINT = 'var(--dash-text-faint)';
const MUTED = 'var(--dash-text-muted)';
const SECONDARY = 'var(--dash-text-secondary)';
const PRIMARY = 'var(--dash-text-primary)';
const BORDER = 'var(--dash-border)';
const RAISED = 'var(--dash-bg-raised)';

/**
 * CURRENCY IS NOT ASSUMED.
 *
 * Delta India settles its perpetuals in USD, so these figures are dollars. They
 * were once rendered with a rupee sign — an ~84x understatement of an Indian
 * tax base, on the one page whose purpose is trust. The symbol now comes from
 * the API's `currency`, and INR is only ever shown once a converted figure is
 * actually supplied.
 *
 * Grouping follows the currency too: 1,25,000 is right for rupees and wrong
 * for dollars.
 */
const SYMBOLS = { INR: '₹', USD: '$', USDT: '$' };

function symbolFor(currency) {
  return SYMBOLS[currency] ?? `${currency ?? '?'} `;
}

function localeFor(currency) {
  return currency === 'INR' ? 'en-IN' : 'en-US';
}

/** Traceable to a fill or ledger entry — always minor units. */
function money(n, currency, { sign = false } = {}) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const body = Math.abs(v).toLocaleString(localeFor(currency), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sym = symbolFor(currency);
  return `${v < 0 ? `−${sym}` : sign ? `+${sym}` : sym}${body}`;
}

/** Illustrative or derived — whole units, never minor units. */
function money0(n, currency) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const sym = symbolFor(currency);
  return `${v < 0 ? `−${sym}` : sym}${Math.abs(Math.round(v)).toLocaleString(localeFor(currency))}`;
}

function fyLabelFor(year) {
  return `FY ${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

function currentFyStartYear() {
  // Indian FY starts 1 April on the IST calendar.
  const nowIst = new Date(Date.now() + 5.5 * 3600 * 1000);
  return nowIst.getUTCMonth() + 1 >= 4 ? nowIst.getUTCFullYear() : nowIst.getUTCFullYear() - 1;
}

function Icon({ d, size = 14, color = 'currentColor', width = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      <path d={d} />
    </svg>
  );
}

const P = {
  check: 'M5 12.5l4.5 4.5L19 7',
  alert: 'M12 3.6L21 19.5H3zM12 9.5v4.5M12 17h.01',
  info: 'M12 11v5.5M12 7.8v.01',
  minus: 'M6 12h12',
  eq: 'M5 9.5h14M5 14.5h14',
  chevron: 'M6 9.5l6 6 6-6',
  down: 'M12 5v13M6.5 12.5L12 18l5.5-5.5',
  up: 'M12 19V6M6.5 11.5L12 6l5.5 5.5',
  x: 'M6 6l12 12M18 6L6 18',
  doc: 'M13 3.5H7a1.5 1.5 0 00-1.5 1.5v14A1.5 1.5 0 007 20.5h10a1.5 1.5 0 001.5-1.5V9zM13 3.5V9h5.5',
  lock: 'M6.5 11h11v9h-11zM9 11V8a3 3 0 016 0v3',
  cal: 'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 3.5v3M15.5 3.5v3',
  scale: 'M12 4.5v15M6 8.5h12M4 16a3 3 0 006 0l-3-6zM14 16a3 3 0 006 0l-3-6z',
  layers: 'M12 3.5l8.5 4.5-8.5 4.5L3.5 8zM3.5 12.5L12 17l8.5-4.5',
  user: 'M5 20a7 7 0 0114 0',
};

function Card({ children, style, className = '' }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ borderColor: BORDER, backgroundColor: RAISED, ...style }}
    >
      {children}
    </div>
  );
}

/** A header that toggles a panel. A real button so it works from the keyboard. */
function Disclosure({ open, onToggle, children, style }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-3 px-6 py-4 text-left"
      style={style}
    >
      {children}
      <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }} style={{ color: FAINT }}>
        <Icon d={P.chevron} size={16} />
      </motion.span>
    </button>
  );
}

function Panel({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: { duration: 0.26, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.16 } }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function TaxPage() {
  const { session } = useAuth();
  const { accounts = [], selectedAccount } = useTradingAccounts();
  const accessToken = session?.access_token;
  const tradingAccountId = selectedAccount?.id;

  const thisFy = currentFyStartYear();
  const [fy, setFy] = useState(thisFy);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showWhy, setShowWhy] = useState(false);
  const [showRecon, setShowRecon] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const [showSched, setShowSched] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  /**
   * Three views, because the page answers three different questions and one
   * scroll made the reader hunt for whichever they had. Overview is the
   * argument; Transactions is the evidence; CA report is the handoff.
   */
  const [tab, setTab] = useState('overview');

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

  const gated = data?.calculationStatus === 'INVALID_PENDING_RECONCILIATION';
  // The unit the API says these figures are in. Never defaulted to INR — that
  // assumption is exactly what produced the misstatement.
  const currency = data?.currency ?? 'UNKNOWN';

  const view = useMemo(() => {
    if (!data || gated) return null;
    const b = data.bridge ?? {};
    const c = data.counts ?? {};
    const ex = data.walletAdjustments?.excluded ?? {};
    const v = data.illustrativeVda ?? {};
    const economic = Number(b.completeEconomicPnl ?? 0);
    const losing = economic < 0;
    const costs = Math.abs(Number(b.tradingCommission ?? 0)) + Math.abs(Number(b.funding ?? 0)) + Math.abs(Number(b.liquidationFees ?? 0));
    // NO F&O tax is computed here, deliberately. Business income is taxed at
    // the user's slab after surcharge and cess and depends on income this
    // service cannot see, so the engine returns taxable income and never a
    // rupee figure. Applying 30% to F&O is precisely the error that once
    // billed a trader 4,348 on a losing year — it must not come back through
    // the UI. Invisible on a loss year (max(0, loss) is zero) and confidently
    // wrong on a profitable one, which is the dangerous kind of bug.
    const vdaTax = Number(v.tax ?? 0);
    // Read from the engine, NOT re-derived from the economic result. The two
    // can legitimately differ — taxable income is a tax-engine conclusion, and
    // the moment the UI computes its own it has become a second tax engine.
    const taxableBusinessIncome = Number(data.taxableBusinessIncome ?? 0);
    const lossAvailable = Number(data.lossAvailableForSetOff ?? 0);

    return {
      economic,
      losing,
      costs,
      vdaTax,
      taxableBusinessIncome,
      lossAvailable,
      /**
       * True when there are no spot/VDA positions at all and the VDA figure is
       * merely the F&O activity re-read under s115BBH.
       *
       * When it is hypothetical the scenario is collapsed out of sight: a large
       * amber number beside a real one gets read as a real one no matter what
       * the badge says, and the reserve and advance-tax sections downstream
       * were telling a trader who LOST 7.6 lakh to set aside 3.7 lakh against
       * trades they never made.
       */
      vdaIsHypothetical: (v.basis ?? 'FNO_RECLASSIFIED') === 'FNO_RECLASSIFIED',
      // What the classification decision is worth. The F&O side asserts no
      // rupee tax, so the whole VDA figure is what the reading would add.
      gap: vdaTax,
      b,
      c,
      ex,
      v,
    };
  }, [data, gated]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-16">
      {/* 1 ── header + FY selector. Every accounting number below is FY-scoped. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--tax-pos-soft)', color: MINT }}
            >
              <Icon d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8zM9.5 9h5M9.5 13h5" size={18} width={1.9} />
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: PRIMARY }}>
              Tax centre
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: MUTED }}>
            Your {fyLabelFor(fy)} economic result, rebuilt from exchange fills and reconciled against your
            wallet — then shown under each treatment your CA may apply.
          </p>
          {/* Per account, not per user.
              These figures used to cover every account under the login at once,
              because tax is assessed per PERSON. But we never ask whose account
              an account is — someone running the kill switch on a spouse's or a
              friend's Delta key had two taxpayers' trades added into one figure.
              One account at a time can't do that. The trade-off is real and is
              stated rather than hidden: a user who owns several accounts must
              combine them, since F&O losses do net across accounts on one PAN. */}
          {accounts.length > 1 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: MUTED }}>
              <span>
                Figures below are for{' '}
                <strong style={{ color: PRIMARY }}>{selectedAccount?.name ?? 'this account'}</strong> only. Your
                other {accounts.length - 1 === 1 ? 'account is' : `${accounts.length - 1} accounts are`} reported
                separately — switch accounts to see {accounts.length - 1 === 1 ? 'it' : 'them'}:
              </span>
              {accounts
                .filter((a) => a.id !== selectedAccount?.id)
                .map((a) => (
                  <span
                    key={a.id}
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: RAISED, border: `1px solid ${BORDER}`, color: PRIMARY }}
                  >
                    {a.name}
                  </span>
                ))}
              <span className="basis-full" style={{ color: FAINT }}>
                If every account is yours, they belong on one return — F&amp;O results net across accounts under a
                single PAN, so add the figures together. Accounts held by someone else are taxed on them, not on you.
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-1 rounded-xl border p-1" style={{ borderColor: BORDER, backgroundColor: RAISED }}>
          {fyOptions.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setFy(y)}
              className="rounded-lg px-3.5 py-2 text-xs font-bold transition-colors"
              style={{
                backgroundColor: fy === y ? GREEN_SOFT : 'transparent',
                color: fy === y ? GREEN : SECONDARY,
              }}
            >
              {fyLabelFor(y)}
            </button>
          ))}
        </div>
      </div>


      {/* Segmented control, per the design. Pills rather than an underline:
          the FY selector beside it is already a pill group, and two different
          tab idioms on one header reads as two different controls. */}
      {tradingAccountId && !gated && (
        <div
          className="mt-6 inline-flex gap-1 rounded-xl border p-1"
          style={{ borderColor: BORDER, backgroundColor: RAISED }}
        >
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'transactions', label: 'Tax transactions' },
            { key: 'report', label: 'CA report' },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
                style={{
                  backgroundColor: active ? GREEN_SOFT : 'transparent',
                  color: active ? GREEN : MUTED,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {!tradingAccountId && (
        <p className="mt-8 text-sm" style={{ color: MUTED }}>
          Select a trading account to see its tax position.
        </p>
      )}

      {error && (
        <div
          className="mt-6 rounded-xl border p-4 text-sm"
          style={{ borderColor: 'var(--tax-neg)', backgroundColor: 'var(--tax-neg-soft)', color: RED }}
        >
          {error}
        </div>
      )}

      {loading && !data && (
        <p className="mt-8 text-sm" style={{ color: MUTED }}>
          Loading…
        </p>
      )}

      {gated && (
        <div
          className="mt-6 flex items-start gap-3 rounded-2xl border p-5"
          style={{ borderColor: 'var(--tax-warn)', backgroundColor: AMBER_SOFT }}
        >
          <span style={{ color: AMBER, marginTop: 2 }}>
            <Icon d={P.alert} size={18} />
          </span>
          <div>
            <p className="text-sm font-bold" style={{ color: AMBER }}>
              Tax calculation requires reconciliation
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: SECONDARY }}>
              {data.calculationStatusMessage}
            </p>
          </div>
        </div>
      )}

      {view && (
        <div className="mt-6 flex flex-col gap-4">
      {view && tab === 'overview' && (
        <div className="mt-6 flex flex-col gap-4">
          {/* Currency notice. Delta India settles in USD, so an Indian tax
              figure still needs converting under Rule 115 — and this page must
              not imply it has done so. */}
          {/* 2 ── status strip. The unresolved item is the legal classification,
                 NEVER the accounting — that distinction is the whole point. */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'P&L RECONCILED', ok: data.pnlReconciliationStatus === 'PASSED' },
              { label: 'WALLET RECONCILED', ok: true },
              { label: 'DATA COMPLETE', ok: data.dataCompleteness === 'complete' },
              { label: 'TAX TREATMENT NEEDS CA REVIEW', ok: false },
              {
                label: data?.conversion?.applied
                  ? `FX ₹${data.conversion.rate}/${data.conversion.from} · DISCLOSED ASSUMPTION`
                  : `FIGURES IN ${currency} · INR CONVERSION PENDING`,
                ok: false,
              },
            ].map((p) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                style={{
                  borderColor: p.ok ? 'var(--tax-pos)' : 'var(--tax-warn)',
                  backgroundColor: p.ok ? GREEN_SOFT : AMBER_SOFT,
                }}
              >
                <Icon d={p.ok ? P.check : P.alert} size={13} color={p.ok ? GREEN : AMBER} width={2.4} />
                <span
                  className="text-[10.5px] font-extrabold tracking-wider"
                  style={{ color: p.ok ? GREEN : AMBER }}
                >
                  {p.label}
                </span>
              </span>
            ))}
          </div>

          {/* 3 ── confidence strip */}
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5">
            {[
              'P&L reconciled',
              'Wallet reconciled',
              `${view.c.needsReview ?? 0} positions need review`,
              `${view.c.expiredOptionsRecovered ?? 0} expired options recovered`,
            ].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <Icon d={P.check} size={14} color={GREEN} width={2.4} />
                <span className="text-xs" style={{ color: SECONDARY }}>
                  {t}
                </span>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setShowAudit((v) => !v)}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold"
              style={{ color: MINT }}
            >
              {showAudit ? 'Hide verification details' : 'View verification details'}
              <motion.span animate={{ rotate: showAudit ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <Icon d={P.chevron} size={14} />
              </motion.span>
            </button>
          </Card>

          {/* 4 ── hero. Step 1: what actually happened. */}
          <div
            className="overflow-hidden rounded-[18px]"
            style={{
              background: 'linear-gradient(155deg,#070d18,#0f2033 62%,#0b1a2a)',
              boxShadow: '0 16px 38px -22px rgba(7,13,24,0.8)',
            }}
          >
            <div className="flex flex-wrap gap-8 px-7 pb-6 pt-7">
              <div className="flex min-w-[296px] flex-1 flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: MINT }} />
                  <span className="text-[10.5px] font-extrabold tracking-[0.1em]" style={{ color: '#7d8ea3' }}>
                    STEP 1 · WHAT ACTUALLY HAPPENED
                  </span>
                </div>
                <div className="text-[11px] font-extrabold tracking-wider" style={{ color: '#5c6b81' }}>
                  COMPLETE ECONOMIC P&amp;L · {fyLabelFor(fy)}
                </div>

                <button
                  type="button"
                  onClick={() => setShowWhy((v) => !v)}
                  className="flex w-fit items-center gap-3"
                >
                  <span
                    className="font-mono text-[46px] font-bold leading-none tracking-[-0.05em]"
                    style={{ color: view.losing ? RED : GREEN }}
                  >
                    {money(view.economic, currency)}
                  </span>
                  <span style={{ color: '#5c6b81', paddingTop: 6 }}>
                    <Icon d={P.info} size={17} />
                  </span>
                </button>

                <p className="max-w-[440px] text-[13px] leading-relaxed" style={{ color: '#93a5ba' }}>
                  Your {fyLabelFor(fy)} economic trading result, rebuilt from {view.c.positions} validated
                  positions and reconciled wallet activity.
                </p>

                <button
                  type="button"
                  onClick={() => setShowWhy((v) => !v)}
                  className="inline-flex w-fit items-center gap-1.5 text-xs font-bold"
                  style={{ color: MINT }}
                >
                  {showWhy ? 'Hide the workings' : 'Why this number?'}
                  <motion.span animate={{ rotate: showWhy ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <Icon d={P.chevron} size={14} />
                  </motion.span>
                </button>
              </div>

              {/* the four-line build, always visible */}
              <div
                className="min-w-[250px] rounded-[14px] border p-5"
                style={{ backgroundColor: '#0e1725', borderColor: '#1b2637' }}
              >
                <div className="mb-3 text-[9.5px] font-extrabold tracking-wider" style={{ color: '#5c6b81' }}>
                  HOW IT WAS BUILT
                </div>
                {[
                  { label: 'Net trading P&L', value: view.b.netTradingPnl, strong: false },
                  { label: 'Funding', value: view.b.funding, strong: false },
                  { label: 'Liquidation fees', value: view.b.liquidationFees, strong: false },
                  { label: 'Complete economic P&L', value: view.b.completeEconomicPnl, strong: true },
                ].map((r, i) => (
                  <div
                    key={r.label}
                    className="flex items-center gap-4 py-1.5"
                    style={{ borderTop: i === 0 ? 'none' : `1px solid ${r.strong ? '#2c3a4f' : '#1b2637'}` }}
                  >
                    <span
                      className="flex-1 whitespace-nowrap text-[11.5px]"
                      style={{ color: r.strong ? '#fff' : '#93a5ba', fontWeight: r.strong ? 800 : 600 }}
                    >
                      {r.label}
                    </span>
                    <span
                      className="whitespace-nowrap font-mono text-xs font-bold"
                      style={{ color: Number(r.value) < 0 ? RED : GREEN }}
                    >
                      {money(r.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Panel open={showWhy}>
              <div
                className="flex flex-wrap gap-8 px-7 pb-6 pt-5"
                style={{ borderTop: '1px solid #1b2637', backgroundColor: '#0a121e' }}
              >
                <div className="min-w-[260px] flex-1">
                  <div className="mb-3 text-[9.5px] font-extrabold tracking-wider" style={{ color: '#5c6b81' }}>
                    THE FORMULA
                  </div>
                  {[
                    { op: '', label: 'Net trading P&L', value: view.b.netTradingPnl },
                    { op: '+', label: 'FY-scoped funding', value: view.b.funding },
                    { op: '+', label: 'FY-scoped liquidation fees', value: view.b.liquidationFees },
                    { op: '=', label: 'Complete economic P&L', value: view.b.completeEconomicPnl, strong: true },
                  ].map((f, i) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-3 py-2"
                      style={{ borderTop: i === 0 ? 'none' : `1px solid ${f.strong ? '#2c3a4f' : '#16202f'}` }}
                    >
                      <span className="w-3 shrink-0 font-mono text-xs" style={{ color: '#5c6b81' }}>
                        {f.op}
                      </span>
                      <span
                        className="flex-1 text-xs"
                        style={{ color: f.strong ? '#fff' : '#93a5ba', fontWeight: f.strong ? 800 : 600 }}
                      >
                        {f.label}
                      </span>
                      <span
                        className="whitespace-nowrap font-mono text-xs font-bold"
                        style={{ color: Number(f.value) < 0 ? RED : GREEN }}
                      >
                        {money(f.value, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="min-w-[230px]">
                  <div className="mb-3 text-[9.5px] font-extrabold tracking-wider" style={{ color: '#5c6b81' }}>
                    SOURCE &amp; RECONCILIATION
                  </div>
                  {[
                    { label: 'Validated positions', value: String(view.c.positions ?? 0), ok: true },
                    {
                      label: 'Wallet transactions',
                      value: Number(view.c.walletTransactions ?? 0).toLocaleString('en-IN'),
                      ok: true,
                    },
                    { label: 'P&L reconciliation', value: 'passed', ok: true },
                    { label: 'Wallet reconciliation', value: 'passed', ok: true },
                    {
                      label: 'Unresolved transactions',
                      value: String(view.c.needsReview ?? 0),
                      ok: !view.c.needsReview,
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2.5 py-1.5">
                      <Icon d={s.ok ? P.check : P.alert} size={13} color={s.ok ? GREEN : AMBER} width={2.2} />
                      <span className="flex-1 text-[11.5px]" style={{ color: '#93a5ba' }}>
                        {s.label}
                      </span>
                      <span
                        className="whitespace-nowrap font-mono text-[11px]"
                        style={{ color: s.ok ? GREEN : AMBER }}
                      >
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          {/* 5 ── the accounting bridge */}
          <Card className="overflow-hidden">
            <div
              className="flex flex-wrap items-center gap-3 px-6 py-5"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <span style={{ color: MINT }}>
                <Icon d={P.layers} size={16} />
              </span>
              <div className="min-w-[220px] flex-1">
                <div className="text-[15.5px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                  How your trading result was built
                </div>
                <div className="mt-1 text-xs" style={{ color: MUTED }}>
                  The accounting bridge from gross fills to the number above.
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9.5px] font-extrabold tracking-wider" style={{ color: FAINT }}>
                  TRADING &amp; ACCOUNTING COSTS
                </div>
                <div className="mt-1 whitespace-nowrap font-mono text-[15px] font-bold" style={{ color: RED }}>
                  {money(view.costs, currency)}
                </div>
              </div>
            </div>

            <div className="px-6 pb-5 pt-1">
              {(() => {
                const rows = [
                  { label: 'Gross trading P&L', value: view.b.grossTradingPnl, note: 'Before any cost', kind: 'base' },
                  { label: 'Trading commission', value: view.b.tradingCommission, note: 'Maker and taker fees', kind: 'cost' },
                  { label: 'Net trading P&L', value: view.b.netTradingPnl, note: 'After commission', kind: 'sub' },
                  { label: 'Funding', value: view.b.funding, note: 'Perpetual funding paid', kind: 'cost' },
                  {
                    label: 'Liquidation fees',
                    value: view.b.liquidationFees,
                    note: Number(view.b.liquidationFees) ? 'Forced closes' : 'None this year',
                    kind: 'cost',
                  },
                  {
                    label: 'Complete economic P&L',
                    value: view.b.completeEconomicPnl,
                    note: 'Your economic trading result for the year',
                    kind: 'total',
                  },
                ];
                const peak = Math.max(...rows.map((r) => Math.abs(Number(r.value) || 0)), 1);
                return rows.map((r, i) => {
                  const isTotal = r.kind === 'total';
                  const isCost = r.kind === 'cost';
                  const neg = Number(r.value) < 0;
                  const tone = isCost ? RED : neg ? RED : GREEN;
                  return (
                    <div
                      key={r.label}
                      className="flex items-center gap-3 py-3"
                      style={{
                        borderTop: i === 0 ? 'none' : `1px solid ${isTotal ? BORDER : 'rgba(255,255,255,0.04)'}`,
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
                      >
                        <Icon d={isTotal ? P.eq : isCost ? P.minus : neg ? P.down : P.up} size={13} width={2.2} />
                      </span>
                      <div className="min-w-[110px] flex-1">
                        <div
                          style={{
                            color: isTotal ? PRIMARY : isCost ? SECONDARY : PRIMARY,
                            fontSize: isTotal ? 13.5 : 12.5,
                            fontWeight: isTotal || r.kind === 'sub' ? 800 : 600,
                          }}
                        >
                          {r.label}
                        </div>
                        <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>
                          {r.note}
                        </div>
                      </div>
                      <div
                        className="hidden h-[7px] max-w-[280px] flex-1 overflow-hidden rounded sm:block"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${(Math.abs(Number(r.value) || 0) / peak) * 100}%`,
                            backgroundColor: isTotal ? SECONDARY : tone,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                      <div
                        className="min-w-[96px] whitespace-nowrap text-right font-mono font-bold"
                        style={{ color: tone, fontSize: isTotal ? 15 : 12.5 }}
                      >
                        {money(r.value, currency)}
                      </div>
                    </div>
                  );
                });
              })()}

              <div
                className="mt-4 flex items-start gap-3 rounded-xl border p-3.5"
                style={{ borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <span style={{ color: MINT, marginTop: 1 }}>
                  <Icon d={P.info} size={15} />
                </span>
                {/* "1.9x your gross trading result" reads as nonsense when that
                    result is itself a loss. Say which is bigger, and name both. */}
                <span className="text-xs leading-relaxed" style={{ color: SECONDARY }}>
                  {(() => {
                    const commission = Math.abs(Number(view.b.tradingCommission));
                    const gross = Number(view.b.grossTradingPnl);
                    const ratio = commission / Math.max(1, Math.abs(gross));
                    if (gross < 0) {
                      return (
                        <>
                          You paid {money(commission, currency)} in commission — {ratio.toFixed(1)}× the{' '}
                          {money(Math.abs(gross), currency)} your trading lost before costs. Costs, not market
                          moves, are the larger part of this year&apos;s result.
                        </>
                      );
                    }
                    const share = (commission / Math.max(1, gross)) * 100;
                    return (
                      <>
                        You paid {money(commission, currency)} in commission, which absorbed{' '}
                        {share.toFixed(0)}% of the {money(gross, currency)} your trading made before costs.
                      </>
                    );
                  })()}
                </span>
              </div>
            </div>

            {/* reconciliation-only items — shown for audit, never added */}
            <Disclosure
              open={showRecon}
              onToggle={() => setShowRecon((v) => !v)}
              style={{ borderTop: `1px solid ${BORDER}` }}
            >
              <span style={{ color: MUTED }}>
                <Icon d={P.info} size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-[13px] font-bold" style={{ color: PRIMARY }}>
                  Exchange reconciliation details
                </span>
                <span className="ml-2 text-[11.5px]" style={{ color: FAINT }}>
                  {[view.ex.cashflow, view.ex.settlement, view.ex.commission, view.ex.capitalMovement].filter(
                    (n) => n != null,
                  ).length}{' '}
                  items shown for audit, none added to P&amp;L
                </span>
              </span>
            </Disclosure>

            <Panel open={showRecon}>
              <div className="px-6 pb-5">
                {[
                  {
                    label: 'Cashflow',
                    value: view.ex.cashflow,
                    treatment: 'RECONCILIATION ONLY',
                    why: 'Wallet-side view of fills already counted above. Used to prove the ledger ties out, never added.',
                  },
                  {
                    label: 'Settlement',
                    value: view.ex.settlement,
                    treatment: 'RECONCILIATION ONLY',
                    why: "Expiry settlement already inside each position's realised result.",
                  },
                  {
                    label: 'Wallet commission',
                    value: view.ex.commission,
                    treatment: 'ALREADY REPRESENTED',
                    why: `Wallet-side entry for the same ${money(Math.abs(Number(view.b.tradingCommission)), currency)} commission deducted in the bridge above.`,
                  },
                  {
                    label: 'Capital movements',
                    value: view.ex.capitalMovement,
                    treatment: 'EXCLUDED FROM TRADING P&L',
                    why: 'Your own deposits and withdrawals. Not income, not a cost.',
                  },
                ].map((x) => (
                  <div
                    key={x.label}
                    className="flex flex-wrap items-center gap-3 py-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="min-w-[180px] flex-1">
                      <div className="text-[12.5px] font-semibold" style={{ color: PRIMARY }}>
                        {x.label}
                      </div>
                      <div className="mt-1 text-[11px] leading-snug" style={{ color: FAINT }}>
                        {x.why}
                      </div>
                    </div>
                    <span
                      className="whitespace-nowrap rounded px-2 py-1 text-[9px] font-extrabold tracking-wider"
                      style={{
                        backgroundColor:
                          x.treatment === 'EXCLUDED FROM TRADING P&L' ? VIOLET_SOFT : 'rgba(255,255,255,0.06)',
                        color: x.treatment === 'EXCLUDED FROM TRADING P&L' ? VIOLET : MUTED,
                      }}
                    >
                      {x.treatment}
                    </span>
                    <span
                      className="min-w-[96px] whitespace-nowrap text-right font-mono text-[12.5px] font-bold"
                      style={{ color: MUTED }}
                    >
                      {money(x.value, currency)}
                    </span>
                  </div>
                ))}

                <div
                  className="mt-3 flex items-start gap-3 rounded-xl border p-3.5"
                  style={{ borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <span style={{ color: GREEN, marginTop: 1 }}>
                    <Icon d={P.check} size={15} width={2.2} />
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: SECONDARY }}>
                    These values are shown for auditability but are not added again to your economic P&amp;L.
                    Capital movements — your own deposits and withdrawals — are excluded from trading P&amp;L
                    entirely.
                  </span>
                </div>
              </div>
            </Panel>
          </Card>

          {/* 6 ── Step 2: the two readings, side by side */}
          <Card className="overflow-hidden">
            <div
              className="flex flex-wrap items-center gap-3 px-6 py-5"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <span style={{ color: VIOLET }}>
                <Icon d={P.scale} size={16} />
              </span>
              <div className="min-w-[240px] flex-1">
                <div className="text-[15.5px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                  Step 2 · tax treatment scenarios
                </div>
                <div className="mt-1 max-w-[640px] text-xs leading-relaxed" style={{ color: MUTED }}>
                  TradeGuardX calculates your economic result from exchange fills and wallet activity. The tax
                  outcome depends on how the activity is classified.
                </div>
              </div>
              {/* A "difference" only means something when both readings apply.
                  With no VDA activity there is one treatment, not two. */}
              {!view.vdaIsHypothetical && (
                <div className="shrink-0 text-right">
                  <div className="text-[9.5px] font-extrabold tracking-wider" style={{ color: FAINT }}>
                    DIFFERENCE
                  </div>
                  <div
                    className="mt-1 whitespace-nowrap font-mono text-xl font-bold tracking-tight"
                    style={{ color: VIOLET }}
                  >
                    {money0(view.gap, currency)}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* F&O reading */}
              <div className="p-6" style={{ borderRight: `1px solid ${BORDER}` }}>
                <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
                  <span className="text-[14.5px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                    F&amp;O / trading business
                  </span>
                  <span
                    className="whitespace-nowrap rounded px-2 py-1 text-[8.5px] font-extrabold tracking-wider"
                    style={{
                      backgroundColor: view.losing ? GREEN_SOFT : AMBER_SOFT,
                      color: view.losing ? GREEN : AMBER,
                    }}
                  >
                    {view.losing ? 'POTENTIAL LOSS · CA REVIEW' : 'SLAB RATE · CA REVIEW'}
                  </span>
                </div>
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span
                    className="whitespace-nowrap font-mono text-[29px] font-bold tracking-tight"
                    style={{ color: view.losing ? GREEN : PRIMARY }}
                  >
                    {money(view.taxableBusinessIncome, currency)}
                  </span>
                  <span className="text-[11.5px]" style={{ color: FAINT }}>
                    potential taxable trading income
                  </span>
                </div>
                <p className="mb-4 text-[12.5px] leading-relaxed" style={{ color: SECONDARY }}>
                  {view.losing
                    ? 'Potential business/trading loss. Carry-forward and set-off depend on the applicable tax treatment and filing requirements.'
                    : 'If treated as business income, the profit is taxed at your slab rate with every trading cost deductible against it.'}
                </p>
                {[
                  { label: 'Applicable rate', value: 'your slab · CA review', tone: AMBER, icon: P.alert, iconColor: AMBER },
                  {
                    label: view.losing ? 'Potential business loss' : 'Costs deducted',
                    value: money(view.losing ? view.lossAvailable : view.costs, currency),
                    tone: GREEN,
                    icon: P.check,
                    iconColor: GREEN,
                  },
                  { label: 'Expense treatment', value: 'CA review', tone: AMBER, icon: P.alert, iconColor: AMBER },
                ].map((l) => (
                  <div
                    key={l.label}
                    className="flex items-center gap-2.5 py-2"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <Icon d={l.icon} size={13} color={l.iconColor} width={2.2} />
                    <span className="flex-1 text-xs" style={{ color: MUTED }}>
                      {l.label}
                    </span>
                    <span className="whitespace-nowrap font-mono text-xs font-bold" style={{ color: l.tone }}>
                      {l.value}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setTab('transactions');
                    window.scrollTo(0, 0);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold"
                  style={{ color: MINT }}
                >
                  See transactions
                  <Icon d="M5 12h13M13 7l5 5-5 5" size={14} />
                </button>
              </div>

              {/* VDA reading. The card always renders so the two treatments can
                  be compared, but it states NO AMOUNT when there are no spot
                  positions: a large figure beside a real one gets read as real,
                  whatever the badge says. */}
              <div className="p-6">
                <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
                  <span className="text-[14.5px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                    VDA / 115BBH
                  </span>
                  <span
                    className="whitespace-nowrap rounded px-2 py-1 text-[8.5px] font-extrabold tracking-wider"
                    style={{ backgroundColor: AMBER_SOFT, color: AMBER }}
                  >
                    {view.vdaIsHypothetical ? 'NOT APPLICABLE THIS YEAR' : 'ILLUSTRATIVE 30% TREATMENT'}
                  </span>
                </div>
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span
                    className="whitespace-nowrap font-mono text-[29px] font-bold tracking-tight"
                    style={{ color: view.vdaIsHypothetical ? FAINT : AMBER }}
                  >
                    {view.vdaIsHypothetical ? '—' : money0(view.vdaTax, currency)}
                  </span>
                  <span className="text-[11.5px]" style={{ color: FAINT }}>
                    {view.vdaIsHypothetical ? 'not applicable' : 'illustrative tax'}
                  </span>
                </div>
                {/* Without this the card reads as a real VDA bill. The figure
                    is the SAME F&O activity re-read under s115BBH, and on this
                    account there are no spot transactions at all. */}
                {view.v.basis === 'FNO_RECLASSIFIED' && (
                  <div
                    className="mb-3 rounded-xl border p-3"
                    style={{ borderColor: 'var(--tax-warn)', backgroundColor: AMBER_SOFT }}
                  >
                    <p className="text-[12px] leading-relaxed" style={{ color: SECONDARY }}>
                      <span className="font-bold" style={{ color: AMBER }}>
                        No spot / VDA transactions this year.
                      </span>{' '}
                      Section 115BBH applies to transfers of virtual digital assets. Every position you held
                      was a derivative, so nothing here falls under it — which is why no amount is shown.
                    </p>
                  </div>
                )}
                <p className="mb-4 text-[12.5px] leading-relaxed" style={{ color: SECONDARY }}>
                  {view.vdaIsHypothetical
                    ? 'Under this regime each winning trade would be taxed at 30% on its own, with losses, fees and funding not deductible. Shown for comparison so the difference between the two treatments is visible.'
                    : 'This is an illustrative scenario, not a confirmed tax liability. If treated as virtual digital assets, each winning trade is taxed at 30% on its own, with losses, fees and funding not deductible.'}
                </p>
                {(view.vdaIsHypothetical
                  ? [
                      // No amounts: there is nothing to quantify. What the
                      // regime WOULD do is still worth stating, because that is
                      // what makes the classification decision legible.
                      { label: 'Spot / VDA positions this year', value: '0', tone: PRIMARY, icon: P.eq, iconColor: FAINT },
                      { label: 'Losses offsettable', value: 'no', tone: AMBER, icon: P.x, iconColor: AMBER },
                      { label: 'Expense treatment', value: 'not deductible', tone: AMBER, icon: P.x, iconColor: AMBER },
                    ]
                  : [
                      { label: 'Illustrative taxable gains', value: money(view.v.gains, currency), tone: PRIMARY, icon: P.eq, iconColor: FAINT },
                      { label: 'Losses not offsettable', value: money(view.v.losses, currency), tone: AMBER, icon: P.x, iconColor: AMBER },
                      { label: 'Expense treatment', value: 'not deductible', tone: AMBER, icon: P.x, iconColor: AMBER },
                    ]
                ).map((l) => (
                  <div
                    key={l.label}
                    className="flex items-center gap-2.5 py-2"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <Icon d={l.icon} size={13} color={l.iconColor} width={2.2} />
                    <span className="flex-1 text-xs" style={{ color: MUTED }}>
                      {l.label}
                    </span>
                    <span className="whitespace-nowrap font-mono text-xs font-bold" style={{ color: l.tone }}>
                      {l.value}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setTab('transactions');
                    window.scrollTo(0, 0);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold"
                  style={{ color: MINT }}
                >
                  See transactions
                  <Icon d="M5 12h13M13 7l5 5-5 5" size={14} />
                </button>
              </div>
            </div>

            {/* Only meaningful when two treatments are actually on screen. */}
            {!view.vdaIsHypothetical && (
            <div className="flex items-start gap-3 px-6 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <span style={{ color: VIOLET, marginTop: 1 }}>
                <Icon d={P.info} size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 text-[13px] font-bold" style={{ color: PRIMARY }}>
                  Why are these different?
                </div>
                <div className="max-w-[700px] text-[12.5px] leading-relaxed" style={{ color: SECONDARY }}>
                  The same trading activity can produce different tax outcomes depending on whether it is treated
                  as business/F&amp;O income or under VDA rules. Your CA should confirm the appropriate
                  classification.
                </div>
              </div>
            </div>

            )}
            {/* Always available: this panel carries the engine and tax-rule
                versions, which a CA needs whichever treatment applies. It used
                to sit inside the comparison block and vanished with it. */}
            <div className="px-6 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
  <button
  type="button"
  onClick={() => setShowMethod((v) => !v)}
  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold"
  style={{ color: VIOLET }}
  >
  {showMethod ? 'Hide methodology' : 'View methodology'}
  <motion.span animate={{ rotate: showMethod ? 180 : 0 }} transition={{ duration: 0.2 }}>
  <Icon d={P.chevron} size={14} />
  </motion.span>
  </button>
            </div>

            <Panel open={showMethod}>
              <div className="flex flex-col gap-3 px-6 pb-5">
                <p className="max-w-[720px] text-[12.5px] leading-relaxed" style={{ color: SECONDARY }}>
                  Crypto derivative classification may affect how gains, losses, fees and funding are treated.
                  TradeGuardX shows the alternative treatment so your CA can review the appropriate
                  classification for your circumstances.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px]" style={{ color: FAINT }}>
                  <span>tax rules {data.versions?.taxRules ?? '—'}</span>
                  <span>P&amp;L engine {data.versions?.pnlEngine ?? '—'}</span>
                  <span>calc engine {data.versions?.calcEngine ?? '—'}</span>
                </div>
                {[
                  { item: 'Trading fees & funding', fno: 'F&O: potentially deductible', vda: 'VDA: not deductible' },
                  { item: 'Losing trades', fno: 'F&O: may offset gains', vda: 'VDA: taxed separately' },
                  { item: 'Year-end loss', fno: 'F&O: carry-forward may be available', vda: 'VDA: cannot be carried' },
                ].map((d) => (
                  <div
                    key={d.item}
                    className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
                    style={{ borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="min-w-[150px] flex-1 text-xs font-bold" style={{ color: PRIMARY }}>
                      {d.item}
                    </span>
                    <span className="min-w-[130px] text-[11.5px]" style={{ color: GREEN }}>
                      {d.fno}
                    </span>
                    <span className="min-w-[130px] text-[11.5px]" style={{ color: AMBER }}>
                      {d.vda}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <div
              className="flex items-start gap-3 px-6 py-4"
              style={{ borderTop: `1px solid ${AMBER}33`, backgroundColor: AMBER_SOFT }}
            >
              <span style={{ color: AMBER, marginTop: 1 }}>
                <Icon d={P.alert} size={15} />
              </span>
              <span className="text-xs leading-relaxed" style={{ color: SECONDARY }}>
                {view.vdaIsHypothetical
                  ? `Set-off and carry-forward of the ${money(Math.abs(view.economic), currency)} loss depend on the treatment your CA adopts and on your filing position — neither is automatic.`
                  : view.losing
                  ? `Under the VDA reading, tax of ${money0(view.vdaTax, currency)} could arise on a year you lost money, and the ${money(Math.abs(view.economic), currency)} loss would not carry forward. Your CA should confirm which classification applies before you act on either figure.`
                  : `Under the VDA reading, ${money(view.costs, currency)} of fees would stop being deductible — most of the difference between the two figures above.`}
              </span>
            </div>
          </Card>

          {/* 7 ── optional planning */}
          {/* OPTIONAL PLANNING — reserve + advance-tax schedule.
              Both are built on the VDA figure, so with no spot/VDA activity
              there is nothing to reserve against: under the F&O reading a loss
              year carries no advance-tax liability. Shown only when real VDA
              positions exist, because this section was otherwise telling a
              trader who lost money to set aside tax on trades they never made. */}
          {!view.vdaIsHypothetical && (
          <>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-[10.5px] font-extrabold tracking-[0.1em]" style={{ color: FAINT }}>
              OPTIONAL PLANNING
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: BORDER }} />
            <span className="text-[11.5px]" style={{ color: FAINT }}>
              Nothing here is confirmed as payable
            </span>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <Card className="flex flex-col gap-3.5 p-6">
              <div className="flex items-center gap-2.5">
                <span style={{ color: MINT }}>
                  <Icon d={P.lock} size={15} />
                </span>
                <span className="text-[15px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                  Tax reserve
                </span>
                <span
                  className="ml-auto whitespace-nowrap rounded px-2 py-1 text-[10px] font-extrabold tracking-wider"
                  style={{ backgroundColor: AMBER_SOFT, color: AMBER }}
                >
                  ILLUSTRATIVE BASIS
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[29px] font-bold tracking-tight" style={{ color: PRIMARY }}>
                  {money(view.v.tds ?? 0, currency)}
                </span>
                <span className="text-xs" style={{ color: MUTED }}>
                  reserved
                </span>
              </div>
              <div className="h-[7px] overflow-hidden rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${view.vdaTax > 0 ? Math.min(100, ((view.v.tds ?? 0) / view.vdaTax) * 100) : 100}%`,
                    background: `linear-gradient(90deg,${AMBER},${AMBER})`,
                  }}
                />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: SECONDARY }}>
                Based on the illustrative VDA treatment of {money0(view.vdaTax, currency)}. {money(view.v.tds ?? 0, currency)} of this is
                TDS the exchange already withheld.{' '}
                {view.vdaTax - (view.v.tds ?? 0) > 0 && (
                  <>{money0(view.vdaTax - (view.v.tds ?? 0), currency)} is not yet reserved.</>
                )}
              </p>
              <p className="mt-auto text-[11px] leading-relaxed" style={{ color: FAINT }}>
                Nothing is confirmed as payable until tax treatment is confirmed.
              </p>
            </Card>

            <Card className="overflow-hidden">
              <Disclosure open={showSched} onToggle={() => setShowSched((v) => !v)}>
                <span style={{ color: MUTED }}>
                  <Icon d={P.cal} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                    Potential advance-tax schedule
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug" style={{ color: MUTED }}>
                    Based on the illustrative VDA scenario — not a confirmed liability.
                  </span>
                </span>
              </Disclosure>

              <Panel open={showSched}>
                <div className="px-6 pb-5">
                  {[
                    { date: `15 Jun ${fy}`, note: "15% of the year's estimate", f: 0.15 },
                    { date: `15 Sep ${fy}`, note: '45% cumulative', f: 0.45 },
                    { date: `15 Dec ${fy}`, note: '75% cumulative', f: 0.75 },
                    { date: `15 Mar ${fy + 1}`, note: '100% cumulative', f: 1 },
                  ].map((d) => (
                    <div
                      key={d.date}
                      className="flex items-center gap-3 py-2.5"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold" style={{ color: SECONDARY }}>
                          {d.date}
                        </div>
                        <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>
                          {d.note}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="whitespace-nowrap font-mono text-[12.5px] font-bold" style={{ color: MUTED }}>
                          {money0(view.vdaTax * d.f, currency)}
                        </div>
                        <div className="mt-0.5 text-[8.5px] font-extrabold tracking-wider" style={{ color: AMBER }}>
                          ILLUSTRATIVE ONLY
                        </div>
                      </div>
                    </div>
                  ))}
                  <p
                    className="mt-3 pt-3 text-[11px] leading-relaxed"
                    style={{ color: FAINT, borderTop: `1px solid ${BORDER}` }}
                  >
                    These dates apply only if the VDA treatment is the one your CA adopts. Under the F&amp;O
                    reading with a loss year, no advance tax arises.
                  </p>
                </div>
              </Panel>
            </Card>
          </div>

          </>
          )}

          {/* With no VDA activity there is nothing to plan against, so say why
              rather than leaving a silent gap where a section used to be. */}
          {view.vdaIsHypothetical && (
            <div
              className="flex items-start gap-3 rounded-2xl border p-5"
              style={{ borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <span style={{ color: GREEN, marginTop: 1 }}>
                <Icon d={P.check} size={15} width={2.2} />
              </span>
              <div>
                <p className="text-sm font-bold" style={{ color: PRIMARY }}>
                  Nothing to set aside for this year
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: MUTED }}>
                  You hold no spot or VDA positions, so no Section 115BBH liability arises. Under the
                  F&amp;O treatment the year is a loss, which carries no advance-tax obligation. Your CA
                  should confirm before you rely on this.
                </p>
              </div>
            </div>
          )}

          {/* 9 ── verification details */}
          <Card className="overflow-hidden">
            <Disclosure open={showAudit} onToggle={() => setShowAudit((v) => !v)}>
              <span style={{ color: MUTED }}>
                <Icon d={P.check} size={16} width={2.2} />
              </span>
              <span className="min-w-[220px] flex-1">
                <span className="block text-[15.5px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                  Verification details
                </span>
                <span className="mt-1 block text-xs" style={{ color: MUTED }}>
                  Every check behind the number at the top — passed, or explained.
                </span>
              </span>
              <span className="text-[11.5px]" style={{ color: FAINT }}>
                {view.c.positions} positions reconciled
              </span>
            </Disclosure>

            <Panel open={showAudit}>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                {[
                  {
                    ok: true,
                    title: 'P&L reconciliation passed',
                    note: 'Our position-level P&L reconciles to independent raw-fill economics.',
                  },
                  {
                    ok: true,
                    title: 'Wallet reconciliation passed',
                    note: 'Exchange wallet transactions were imported and reconciled without unresolved accounting events.',
                  },
                  {
                    ok: true,
                    title: `${view.c.expiredOptionsRecovered} expired options recovered`,
                    note: 'Delta drops expired contracts from history. We rebuilt them from your fills.',
                  },
                  {
                    ok: false,
                    title: 'Delta realised P&L is diagnostic only',
                    note: "Delta's realised P&L is retained as a diagnostic reference only because its reporting semantics are not fully reproducible.",
                  },
                  {
                    ok: false,
                    title: 'GST not available from the API',
                    note: 'GST charged on fees is not exposed by the exchange API.',
                  },
                  // Conversion provenance lives here rather than in a banner
                  // above the result: it is audit material, not a headline.
                  ...(data?.conversion?.applied
                    ? [
                        {
                          ok: false,
                          title: `Converted from ${data.conversion.from} at ${data.conversion.rate}`,
                          note:
                            `${data.conversion.method} Matched ${data.conversion.evidence.matched}/` +
                            `${data.conversion.evidence.sampleSize} transfers against ` +
                            `${data.conversion.evidence.expectedByChance} expected by chance. ` +
                            'A disclosed assumption, not the rate prescribed under Rule 115.',
                        },
                      ]
                    : []),
                  {
                    ok: !view.c.needsReview,
                    title: `${view.c.needsReview} positions need review`,
                    note: view.c.needsReview
                      ? 'Ambiguous fills that could not be matched automatically.'
                      : 'Nothing ambiguous — every position matched automatically.',
                  },
                ].map((a) => (
                  <div
                    key={a.title}
                    className="flex items-start gap-3 px-6 py-4"
                    style={{ borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: a.ok ? GREEN_SOFT : AMBER_SOFT,
                        color: a.ok ? GREEN : AMBER,
                      }}
                    >
                      <Icon d={a.ok ? P.check : P.alert} size={13} width={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-bold leading-snug" style={{ color: PRIMARY }}>
                        {a.title}
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed" style={{ color: MUTED }}>
                        {a.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </Card>

          {/* 10 ── disclaimer */}
          <div
            className="flex items-start gap-3 rounded-2xl border p-5"
            style={{ borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <span style={{ color: FAINT, marginTop: 1 }}>
              <Icon d={P.info} size={15} />
            </span>
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
              <span className="font-bold" style={{ color: SECONDARY }}>
                Important:
              </span>{' '}
              this is an estimated trading-tax analysis, not your final personal income-tax liability or tax
              advice. Salary, other income, deductions, tax regime, cess, surcharge and other personal tax
              information are not included. Exchange GST data is unavailable. The appropriate tax classification
              should be confirmed with your CA.
            </p>
          </div>
        </div>
      )}

      {view && tab === 'transactions' && (
        <div className="mt-6">
          <TaxTransactions accessToken={accessToken} tradingAccountId={tradingAccountId} fy={fy} />
        </div>
      )}

      {view && tab === 'report' && (
        <div className="mt-6 flex flex-col gap-4">
          {/* 8 ── Step 3: hand it to a CA */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: MINT }}>
                <Icon d={P.user} size={16} />
              </span>
              <div className="min-w-[220px] flex-1">
                <div className="text-[15.5px] font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                  Step 3 · hand it to your CA
                </div>
                <div className="mt-1 text-xs" style={{ color: MUTED }}>
                  Everything they need to pick a treatment and file it.
                </div>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center gap-5 px-6 py-5"
              style={{ borderBottom: `1px solid ${BORDER}`, background: 'linear-gradient(150deg,rgba(45,212,191,0.06),transparent)' }}
            >
              <div className="min-w-[260px] flex-1">
                <div className="mb-1.5 text-base font-extrabold tracking-tight" style={{ color: PRIMARY }}>
                  Generate CA pack
                </div>
                <div className="max-w-[520px] text-[12.5px] leading-relaxed" style={{ color: SECONDARY }}>
                  One archive with every document below, plus the calculation assumptions and the engine versions
                  used to produce these numbers.
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5">
                  {[
                    'CA tax report PDF',
                    'Transaction schedule XLSX',
                    'Raw exchange data CSV',
                    'Reconciliation report',
                    'Calculation assumptions',
                    'Tax rule version',
                    'P&L engine version',
                    'Calculation engine version',
                  ].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: MUTED }}>
                      <Icon d={P.check} size={12} color={MINT} width={2.4} />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {/* Export is not built yet. Disabled and labelled rather than
                  wired to a route that would 404 — a download button that
                  silently fails costs more trust than an honest "not yet". */}
              <div className="flex shrink-0 flex-col items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl px-5 py-3.5 text-[13.5px] font-extrabold opacity-50"
                  style={{ backgroundColor: MINT, color: '#04241d' }}
                >
                  <Icon d="M12 5v13M6.5 12.5L12 18l5.5-5.5" size={16} width={2.2} />
                  Generate CA pack
                </button>
                <span className="text-[10.5px]" style={{ color: FAINT }}>
                  Export ships in the next release
                </span>
              </div>
            </div>

            <div className="px-6 py-3 text-[10px] font-extrabold tracking-wider" style={{ color: FAINT }}>
              OR DOWNLOAD INDIVIDUALLY
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {[
                { name: 'CA report', fmt: 'PDF', what: 'Complete tax summary, workings, assumptions and both treatment scenarios.', c: RED },
                { name: 'Transaction schedule', fmt: 'XLSX', what: 'Positions, FIFO lots, fees, funding and tax classification.', c: GREEN },
                { name: 'Raw exchange data', fmt: 'CSV', what: 'Original fills and wallet transactions.', c: '#60a5fa' },
                { name: 'Reconciliation pack', fmt: 'ZIP', what: 'Fill → position → wallet → tax reconciliation.', c: VIOLET },
              ].map((e) => (
                <div
                  key={e.name}
                  className="flex items-start gap-3 px-6 py-4 opacity-60"
                  style={{ borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${e.c} 14%, transparent)`, color: e.c }}
                  >
                    <Icon d={P.doc} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-bold" style={{ color: PRIMARY }}>
                        {e.name}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                        style={{ backgroundColor: `color-mix(in srgb, ${e.c} 14%, transparent)`, color: e.c }}
                      >
                        {e.fmt}
                      </span>
                    </div>
                    <div className="mt-1 text-[11.5px] leading-snug" style={{ color: MUTED }}>
                      {e.what}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 10 ── disclaimer */}
          <div
            className="flex items-start gap-3 rounded-2xl border p-5"
            style={{ borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <span style={{ color: FAINT, marginTop: 1 }}>
              <Icon d={P.info} size={15} />
            </span>
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
              <span className="font-bold" style={{ color: SECONDARY }}>
                Important:
              </span>{' '}
              this is an estimated trading-tax analysis, not your final personal income-tax liability or tax
              advice. Salary, other income, deductions, tax regime, cess, surcharge and other personal tax
              information are not included. Exchange GST data is unavailable. The appropriate tax classification
              should be confirmed with your CA.
            </p>
          </div>
        </div>
      )}
        </div>
      )}
    </motion.div>
  );
}
