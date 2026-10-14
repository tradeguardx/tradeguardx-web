import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { keyStateOf } from '../lib/lifecycle';
import { venueFor } from '../lib/venues';
import { fetchRevengeReport } from '../api/tradesApi';
import { triggerHistoryBackfill } from '../api/syncApi';
import { useRevengeUnlock } from '../hooks/useRevengeUnlock';
import { sx } from '../components/dashboard/shell/sx';
import { CARD, PERIODS } from '../components/revenge/revengeFormat';
import { RevengeStyles } from '../components/revenge/RevengeParts';
import RevengeReportView from '../components/revenge/RevengeReportView';
import RevengeBuilding from '../components/revenge/RevengeBuilding';
import RevengeLocked from '../components/revenge/RevengeLocked';
import RevengeShareModal from '../components/revenge/RevengeShareModal';
import { handleFrom } from '../hooks/useShareData';

/**
 * THE REVENGE REPORT — how someone trades after a loss, scored like an SEO
 * audit: one number, then the checks behind it, each with the trades that
 * prove it and the rule that fixes it.
 *
 * LOCKED → BUILDING → REVEAL.
 *   - First visit: the report's shape, blurred, with "Unlock my report" and
 *     a 1 / 2 / 3-month picker.
 *   - Unlock: the server picks the data — the tax import when it already
 *     covers the period, otherwise a one-time read of the exchange — and the
 *     animation follows that read's real progress.
 *   - Then the blur lifts, the score counts up, the sections drop in.
 *   After that it stays unlocked; a longer period reads the extra months
 *   first, with the same animation.
 *
 * Never built from the engine's own trade data. Every figure comes from the
 * server (trade-service services/revengeReport); this page lays it out.
 */
export default function RevengeReportPage() {
  const { session, user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const { selectedAccount, selectedTradingAccountId, accountsLoading } = useTradingAccounts();
  const { selected: guardSel, life } = useGuard();
  const accessToken = session?.access_token;
  // The context starts the selection as '' — never read that as "no account".
  const accountId = selectedTradingAccountId || selectedAccount?.id || null;
  const keyState = guardSel?.loaded ? keyStateOf(guardSel.connection) : 'unknown';
  const venue = selectedAccount?.propFirmSlug ? venueFor(selectedAccount.propFirmSlug) : null;
  const exchangeName = venue?.name ?? null;

  const [months, setMonths] = useState(1);
  const [res, setRes] = useState(null); // the server's answer: a report, or { locked | building | needsUnlock }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(false);
  const unlock = useRevengeUnlock({ accessToken, tradingAccountId: accountId });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async (m, { signal, revealAfter = false } = {}) => {
    if (!accessToken || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetchRevengeReport({ accessToken, tradingAccountId: accountId, months: m, signal });
      if (!alive.current || signal?.aborted) return;
      setRes(r);
      setReveal(Boolean(revealAfter && r && !r.locked && !r.building && !r.needsUnlock));
    } catch (e) {
      if (signal?.aborted) return;
      setError(e?.message || 'Could not open your report.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [accessToken, accountId]);

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => load(months, { signal: ac.signal }), 0);
    return () => { clearTimeout(t); ac.abort(); };
  }, [load, months]);

  /* A read already running (another tab, or setup just now): follow it.
     A longer period than the snapshot holds: read the extra months. */
  const autoStarted = useRef('');
  useEffect(() => {
    if (!res || unlock.phase !== 'idle') return undefined;
    const key = `${accountId}:${months}:${res.building ? 'b' : res.needsUnlock ? 'n' : ''}`;
    if (!(res.building || res.needsUnlock) || autoStarted.current === key) return undefined;
    const t = setTimeout(() => {
      // Inside the timeout: see RevengeSetupStep — a dev double mount cancels the first.
      if (autoStarted.current === key) return;
      autoStarted.current = key;
      const run = res.building ? unlock.resume() : unlock.start(months);
      run.then((out) => { if (out === 'ready') load(months, { revealAfter: true }); });
    }, 0);
    return () => clearTimeout(t);
  }, [res, unlock, months, accountId, load]);

  const startUnlock = async (m = months) => {
    const out = await unlock.start(m);
    if (out === 'ready') await load(m, { revealAfter: true });
  };

  /* Refresh: pull what is new from the exchange into the tax import, then
     unlock again — the server re-picks the source, so a new user's snapshot
     gives way to their tax history as soon as the import has it. */
  const refresh = async () => {
    if (keyState !== 'ok') return;
    await triggerHistoryBackfill({ accessToken, tradingAccountId: accountId }).catch(() => null);
    await startUnlock(months);
  };

  const building = unlock.phase === 'building';
  const report = res && !res.locked && !res.building && !res.needsUnlock ? res : null;
  const period = PERIODS.find((x) => x.months === months);
  const planOff = life?.unprotected || life?.setup;

  if (!accountId && accountsLoading) return <PageShell><Placeholder /></PageShell>;
  // No account yet: the same teaser, asking them to finish setup.
  if (!accountId) {
    return (
      <PageShell>
        <RevengeStyles />
        <RevengeLocked keyState="noAccount" />
      </PageShell>
    );
  }

  return (
    <PageShell
      /* Locked: the card speaks; a subtitle above it would say the same twice. */
      sub={res?.locked ? null : <>How you trade after a loss on <b style={sx('color:var(--ink-2)')}>{selectedAccount?.name ?? 'this account'}</b>, from your closed trades. Times are IST.</>}
      right={report && !building ? (
        <div role="tablist" aria-label="Period" style={sx('display:flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)')}>
          {PERIODS.map((x) => (
            <button
              key={x.months}
              role="tab"
              type="button"
              aria-selected={x.months === months}
              onClick={() => setMonths(x.months)}
              style={sx('padding:7px 12px;border:0;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer', x.months === months ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--ink-3)' })}
            >
              {x.label}
            </button>
          ))}
        </div>
      ) : null}
    >
      <RevengeStyles />

      {building ? (
        <div style={sx('margin-top:20px')}>
          <RevengeBuilding status={unlock.status} accountName={selectedAccount?.name} exchangeName={exchangeName} />
        </div>
      ) : unlock.phase === 'error' ? (
        <div role="alert" style={sx(`margin-top:20px;padding:20px;${CARD};font-size:13.5px;line-height:1.55;color:var(--ink-2)`)}>
          {unlock.error}{' '}
          <button type="button" onClick={() => startUnlock(months)} style={sx('margin-left:6px;padding:0;border:0;background:none;color:var(--mint);font-weight:700;cursor:pointer')}>Try again</button>
        </div>
      ) : loading && !res ? (
        <Placeholder />
      ) : error ? (
        <div role="alert" style={sx(`margin-top:20px;padding:18px;${CARD};font-size:13.5px;color:var(--ink-2)`)}>
          {error} <button type="button" onClick={() => load(months)} style={sx('margin-left:6px;padding:0;border:0;background:none;color:var(--mint);font-weight:700;cursor:pointer')}>Try again</button>
        </div>
      ) : res?.locked ? (
        <RevengeLocked months={months} onMonths={setMonths} onUnlock={() => startUnlock(months)} keyState={keyState} accountName={selectedAccount?.name} exchangeName={exchangeName} />
      ) : report ? (
        <>
          <div style={sx('margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-3)')}>
            <span>{report.source === 'snapshot' ? `Read from ${exchangeName || 'your exchange'} when you unlocked it.` : 'Built from your imported trade history.'}</span>
            {keyState === 'ok' && (
              <button type="button" onClick={refresh} style={sx('padding:6px 11px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;cursor:pointer')}>
                Refresh
              </button>
            )}
          </div>
          <div className={reveal ? 'rv-unblur' : undefined} style={sx('transition:opacity .15s', { opacity: loading ? 0.55 : 1 })}>
            <RevengeReportView
              key={`${months}:${reveal}`}
              report={report}
              periodLabel={period?.label}
              months={months}
              reveal={reveal}
              onShare={() => setSharing(true)}
              cta={planOff
                ? { label: 'Start my 3-day free trial →', to: '/dashboard/account/billing', note: '₹0 today · you set each limit on the Rules page', trial: true }
                : { label: 'Set up these rules →', to: '/dashboard/rules' }}
            />
          </div>
        </>
      ) : (
        <Placeholder />
      )}
      <RevengeShareModal open={sharing} onClose={() => setSharing(false)} report={report} handle={handleFrom(user)} />
    </PageShell>
  );
}

function PageShell({ sub, right, children }) {
  return (
    <div style={sx('max-width:1040px;margin:0 auto;padding-bottom:48px')}>
      <header style={sx('display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap')}>
        <div style={sx('flex:1;min-width:min(320px,100%)')}>
          <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Revenge report</h1>
          {sub && <p style={sx('margin:7px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-3)')}>{sub}</p>}
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

function Placeholder() {
  return (
    <div aria-busy="true" style={sx('margin-top:22px;display:grid;gap:14px')}>
      {[150, 96, 96, 120].map((h, i) => (
        <div key={i} style={sx(`${CARD};height:${h}px;background:var(--surface-2);animation:tgxPulse 1.4s ease-in-out infinite`)} />
      ))}
    </div>
  );
}
