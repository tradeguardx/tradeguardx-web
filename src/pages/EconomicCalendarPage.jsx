import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useSecondTick } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { fetchCalendar, scheduleCalendarLock } from '../api/calendarApi';
import { calendarSample } from '../fixtures/calendarSample';
import { useUpcomingCalendar } from '../hooks/useUpcomingCalendar';
import { sx } from '../components/dashboard/shell/sx';
import {
  rangeFor, timezoneLabel, msUntil, isPast, countdown, inLabel, timeCell,
  nextHighImpact, impactCounts, currenciesOf, filterDays, lockWindow,
} from '../lib/calendar';

/**
 * Economic calendar — the exact-build spec for /calendar. A list that ends
 * in a commitment: the next high-impact release is the hero and the only
 * primary action is arming a lock around it.
 *
 * Every countdown ticks from event_time_utc on the app's one shared
 * 1-second clock (useSecondTick). A clock time is never invented for a
 * tentative / all-day / day-n event. Filters live in the URL.
 */

const RANGES = ['this', 'next', 'month'];
const RANGE_LABEL = { this: 'This week', next: 'Next week', month: 'Month' };
const DEFAULT_CCY = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'NZD', 'CNY'];
const LOCK_MINUTES = 15;
const IMPACT = {
  3: { label: 'High', text: 'var(--red)', solid: 'var(--red-solid)', tint: 'var(--red-tint)', line: 'var(--red-line)' },
  2: { label: 'Medium', text: 'var(--amber)', solid: 'var(--amber-solid)', tint: 'var(--amber-tint)', line: 'var(--amber-line)' },
  1: { label: 'Low', text: 'var(--ink-3)', solid: 'var(--ink-faint)', tint: 'var(--surface-3)', line: 'var(--line)' },
};
const GRID = 'display:grid;grid-template-columns:72px 54px 40px minmax(120px,1fr) 74px 74px 74px;gap:10px';
const MONO_TAG = "font:500 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)";
const VAL = "text-align:right;font:400 12.5px/1.3 'JetBrains Mono',monospace;font-variant-numeric:tabular-nums";
const VLABEL = "display:none;font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px";
const CARD = 'margin-bottom:14px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden';

function rangeSpec(key) { return key === 'next' ? rangeFor('week', 1) : key === 'month' ? rangeFor('month', 0) : rangeFor('week', 0); }
function lockKey(acct) { return `tgx_calendar_locks_${acct || 'none'}`; }
function readLocks(acct) { try { return JSON.parse(localStorage.getItem(lockKey(acct)) || '[]'); } catch { return []; } }

function ImpactBars({ level }) {
  if (!level) return null;
  return (
    <span style={sx('display:flex;align-items:flex-end;gap:2px;height:13px')} aria-label={`${IMPACT[level].label} impact`} title={`${IMPACT[level].label} impact`}>
      {[1, 2, 3].map((i) => <span key={i} style={sx('width:3px;border-radius:1px', { height: `${5 + i * 4}px`, background: i <= level ? IMPACT[level].solid : 'var(--surface-3)' })} />)}
    </span>
  );
}

function TimeCell({ event, isNext }) {
  const t = timeCell(event);
  return (
    <span style={sx('display:inline-flex;align-items:center;gap:7px')}>
      {isNext && <span style={sx('width:6px;height:6px;border-radius:50%;background:var(--red-solid);animation:tgxPulse 1.6s ease-in-out infinite;flex:none')} aria-hidden />}
      {t.exact ? <span style={sx("font:500 12.5px/1 'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;color:var(--ink)")}>{t.text}</span> : <span style={sx(MONO_TAG)}>{t.text}</span>}
    </span>
  );
}

function Actual({ event, ms }) {
  if (event.actual != null && event.actual !== '') {
    const color = event.surprise === 'beat' ? 'var(--mint)' : event.surprise === 'miss' ? 'var(--red)' : 'var(--ink)';
    return <span style={sx(VAL, { color, fontWeight: 600 })}>{event.actual}</span>;
  }
  const soon = event.time_status === 'exact' ? inLabel(ms) : null;
  if (soon) return <span style={sx(VAL, { color: 'var(--ink-3)' })}>{soon}</span>;
  return <span style={sx(VAL, { color: 'var(--ink-faint)' })}>—</span>;
}
function Value({ v, color }) { return v == null || v === '' ? <span style={sx(VAL, { color: 'var(--ink-faint)' })}>—</span> : <span style={sx(VAL, { color })}>{v}</span>; }

function InfoGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ flex: 'none', marginTop: 2, color: 'var(--ink-faint)' }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
}

function LockModal({ event, tz, onArmed, onClose }) {
  const { session } = useAuth();
  const { selectedAccount, selectedTradingAccountId } = useTradingAccounts();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const win = lockWindow(event, LOCK_MINUTES, tz);
  useEffect(() => { const onKey = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [onClose]);

  const arm = async () => {
    if (!selectedTradingAccountId) { toast.error('No account selected', 'Pick the account to lock first.'); return; }
    setBusy(true);
    try {
      await scheduleCalendarLock({ accessToken: session?.access_token, tradingAccountId: selectedTradingAccountId, eventId: event.id, lockFrom: win.from.toISOString(), lockUntil: win.to.toISOString() });
      onArmed(event.id);
      toast.success('Auto-lock armed', `${selectedAccount?.name || 'This account'} blocks new orders ${win.fromLabel}–${win.toLabel} around ${event.title}. No cancel.`);
      onClose();
    } catch (err) {
      const status = err?.status ?? err?.details?.status;
      toast.error(status === 404 ? 'Auto-lock is not live on the engine yet' : 'Could not arm the lock', status === 404 ? 'Nothing was armed — the calendar lock endpoint is not deployed.' : err?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div data-tgx-modal="1" onClick={onClose} role="presentation" style={sx('position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,5,10,.62);backdrop-filter:blur(3px)')}>
      <div role="dialog" aria-modal="true" aria-labelledby="ecal-lock-title" onClick={(e) => e.stopPropagation()} style={sx('width:100%;max-width:440px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxDrawer .2s ease-out')}>
        <div style={sx('padding:20px 22px 16px;border-bottom:1px solid var(--line)')}>
          <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--red)")}>Auto-lock · no cancel</div>
          <h3 id="ecal-lock-title" style={sx("margin:10px 0 0;font:600 18px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>Lock new orders around {event.title}</h3>
          <p style={sx('margin:7px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>From fifteen minutes before the release until fifteen after, this account refuses new orders. Open positions are left alone. Like the kill switch, there is no early cancel.</p>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:16px 22px')}>
          {[['Account', selectedAccount?.name || '—', false], ['Locks', win.fromLabel, true], ['Unlocks', win.toLabel, true]].map(([k, v, mono]) => (
            <div key={k} style={sx('padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);min-width:0')}>
              <div style={sx('font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>{k}</div>
              <div style={sx("margin-top:5px;font:600 14px/1.2 'Space Grotesk',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis", mono ? { fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: 'tabular-nums' } : {})}>{v}</div>
            </div>
          ))}
        </div>
        <div style={sx('display:flex;gap:9px;padding:0 22px 20px;flex-wrap:wrap')}>
          <button type="button" disabled={busy} onClick={arm} style={sx('padding:10px 15px;border:0;border-radius:9px;background:var(--red-btn);color:#fff;font-size:12.5px;font-weight:700')}>{busy ? 'Arming…' : `Arm ±${LOCK_MINUTES} min lock`}</button>
          <button type="button" onClick={onClose} style={sx('padding:10px 15px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600')}>Not now</button>
        </div>
      </div>
    </div>
  );
}

export default function EconomicCalendarPage() {
  const { session } = useAuth();
  const { selectedTradingAccountId } = useTradingAccounts();
  const now = useSecondTick();
  const accessToken = session?.access_token;
  const [params, setParams] = useSearchParams();

  // ── URL-backed filters ─────────────────────────────────────────────
  const rangeKey = RANGES.includes(params.get('range')) ? params.get('range') : 'this';
  const impacts = useMemo(() => new Set((params.get('impact') ?? '3,2').split(',').map(Number).filter((n) => n >= 1 && n <= 3)), [params]);
  const ccyParam = params.get('ccy');
  const demo = import.meta.env.DEV && params.get('demo') === '1';
  const setParam = useCallback((k, v) => { const next = new URLSearchParams(params); if (v == null || v === '') next.delete(k); else next.set(k, v); setParams(next, { replace: true }); }, [params, setParams]);

  const [data, setData] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState('');
  const [sample, setSample] = useState(false);
  const [ccyOpen, setCcyOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [lockFor, setLockFor] = useState(null);
  const [locksByAcct, setLocksByAcct] = useState({});
  const locks = locksByAcct[selectedTradingAccountId ?? 'none'] ?? readLocks(selectedTradingAccountId);
  const todayRef = useRef(null);
  const scrolled = useRef(false);
  const ccyRef = useRef(null);
  const upcoming = useUpcomingCalendar();

  const range = useMemo(() => rangeSpec(rangeKey), [rangeKey]);
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tz = data?.timezone || browserTz;
  const fetchKey = `${range.from}:${range.to}:${selectedTradingAccountId ?? ''}:${demo ? 'demo' : 'live'}`;

  useEffect(() => {
    if (!ccyOpen) return undefined;
    const onDoc = (e) => { if (ccyRef.current && !ccyRef.current.contains(e.target)) setCcyOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [ccyOpen]);

  useEffect(() => {
    if (!accessToken) return undefined;
    const ctrl = new AbortController();
    const done = (r, isSample) => { if (ctrl.signal.aborted) return; setData(r); setSample(isSample); setError(''); setLoadedKey(fetchKey); };
    if (demo) { const t = setTimeout(() => done(calendarSample(new Date(), rangeKey), true), 0); return () => { clearTimeout(t); ctrl.abort(); }; }
    fetchCalendar({ accessToken, from: range.from, to: range.to, tz: browserTz, tradingAccountId: selectedTradingAccountId, signal: ctrl.signal })
      .then((r) => done(r, false))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        if (import.meta.env.DEV) { done(calendarSample(new Date(), rangeKey), true); return; }
        setData({ timezone: null, days: [] }); setError(e?.message || 'Could not load the calendar'); setLoadedKey(fetchKey);
      });
    return () => ctrl.abort();
  }, [accessToken, fetchKey, range.from, range.to, rangeKey, browserTz, selectedTradingAccountId, demo]);

  const loading = loadedKey !== fetchKey;
  const days = useMemo(() => data?.days ?? [], [data]);
  const allCodes = useMemo(() => { const s = new Set(DEFAULT_CCY); for (const c of currenciesOf(days)) s.add(c); return [...s]; }, [days]);
  const countries = useMemo(() => (ccyParam == null ? allCodes : ccyParam.split(',').filter(Boolean)), [ccyParam, allCodes]);
  const allOn = countries.length === allCodes.length;
  const ccyScoped = useMemo(() => filterDays(days, { impacts: new Set([1, 2, 3]), countries: allOn ? [] : countries }), [days, countries, allOn]);
  const counts = useMemo(() => impactCounts(ccyScoped), [ccyScoped]);
  const visible = useMemo(() => filterDays(ccyScoped, { impacts, countries: [] }), [ccyScoped, impacts]);

  // Hero + next-row marker come from the global dataset, not the browsed range.
  const globalDays = useMemo(() => (demo ? calendarSample(new Date(), 'month').days : (upcoming.data?.days ?? days)), [demo, upcoming.data, days]);
  const next = useMemo(() => nextHighImpact(globalDays, now, allOn ? null : countries), [globalDays, now, countries, allOn]);
  const nextId = next?.event.id;
  const armed = next ? locks.includes(next.event.id) : false;

  useEffect(() => {
    if (loading || scrolled.current || !todayRef.current) return;
    scrolled.current = true;
    todayRef.current.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [loading]);

  const idx = RANGES.indexOf(rangeKey);
  const stepRange = (d) => { const n = Math.min(RANGES.length - 1, Math.max(0, idx + d)); if (n !== idx) setParam('range', RANGES[n] === 'this' ? null : RANGES[n]); };
  const toggleImpact = (lvl) => { const n = new Set(impacts); if (n.has(lvl)) n.delete(lvl); else n.add(lvl); setParam('impact', [...n].sort((a, b) => b - a).join(',')); };
  const toggleCcy = (c) => { const n = countries.includes(c) ? countries.filter((x) => x !== c) : [...countries, c]; setParam('ccy', n.length === allCodes.length ? null : n.join(',')); };
  const toggleDay = (date) => setCollapsed((s) => { const n = new Set(s); if (n.has(date)) n.delete(date); else n.add(date); return n; });
  const onArmed = useCallback((id) => {
    const acct = selectedTradingAccountId ?? 'none';
    const cur = readLocks(selectedTradingAccountId);
    const n = cur.includes(id) ? cur : [...cur, id];
    try { localStorage.setItem(lockKey(selectedTradingAccountId), JSON.stringify(n)); } catch { /* storage unavailable */ }
    setLocksByAcct((m) => ({ ...m, [acct]: n }));
  }, [selectedTradingAccountId]);
  const closeLock = useCallback(() => setLockFor(null), []);

  const arrow = (dir) => {
    const atLimit = dir < 0 ? idx === 0 : idx === RANGES.length - 1;
    return (
      <button type="button" aria-label={dir < 0 ? 'Previous range' : 'Next range'} aria-disabled={atLimit} onClick={() => stepRange(dir)} style={sx('width:28px;height:28px;border:0;border-radius:999px;background:transparent;display:grid;place-items:center', { color: atLimit ? 'var(--ink-faint)' : 'var(--ink-2)', cursor: atLimit ? 'default' : 'pointer' })}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={dir < 0 ? 'M14 7l-5 5 5 5' : 'M10 7l5 5-5 5'} /></svg>
      </button>
    );
  };

  return (
    <div style={sx('animation:tgxSlide .22s ease-out')}>
      {/* 4. Header */}
      <div data-tgx-stack="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px')}>
        <div style={sx('max-width:76ch')}>
          <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Economic calendar</h1>
          <p style={sx('margin:6px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-3)')}>What is about to move your pairs, and the option to lock yourself out around it. Times are yours, not the exchange&rsquo;s.</p>
        </div>
        <span style={sx("flex:none;display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface-2);font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.06em;color:var(--ink-2)")} title={tz}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          {timezoneLabel(tz, new Date(now))}
        </span>
      </div>

      {sample && (
        <div style={sx('margin-bottom:16px;padding:11px 14px;border:1px solid var(--amber-line);border-radius:12px;background:var(--amber-tint);font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
          <strong style={sx('color:var(--amber);font-weight:700')}>Sample data.</strong> {demo ? 'Seeded to show every state of this screen — nothing here is real.' : 'The calendar feed is not reachable from this build, so this is a labelled fixture — nothing here is real.'}
        </div>
      )}
      {data?.source?.stale && !sample && (
        <div style={sx('margin-bottom:16px;padding:11px 14px;border:1px solid var(--amber-line);border-radius:12px;background:var(--amber-tint);font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
          <strong style={sx('color:var(--amber);font-weight:700')}>Feed is behind.</strong> Last successful update {data.source.last_success_at ? new Date(data.source.last_success_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'unknown'} — showing the last stored copy.
        </div>
      )}

      {/* 5. Toolbar */}
      <div data-tgx-stack="1" style={sx('display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap')}>
        <div style={sx('display:inline-flex;align-items:center;gap:3px;padding:4px;border:1px solid var(--line);border-radius:999px;background:var(--surface-2);box-shadow:inset 0 1px 2px rgba(0,0,0,.35)')} role="tablist" aria-label="Range">
          {arrow(-1)}
          {RANGES.map((k) => {
            const on = k === rangeKey;
            return <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setParam('range', k === 'this' ? null : k)} style={sx('padding:7px 14px;border:0;border-radius:999px;font-size:12.5px;font-weight:600;letter-spacing:-.005em;transition:background .16s ease,color .16s ease', { background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--bg-deep)' : 'var(--ink-2)' })}>{RANGE_LABEL[k]}</button>;
          })}
          {arrow(1)}
        </div>

        <div style={sx('display:flex;gap:7px;flex-wrap:wrap')}>
          {[3, 2, 1].map((lvl) => {
            const on = impacts.has(lvl); const t = IMPACT[lvl];
            return (
              <button key={lvl} type="button" aria-pressed={on} onClick={() => toggleImpact(lvl)} style={sx('display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;font-size:12.5px;font-weight:600', { border: `1px solid ${on ? t.line : 'var(--line)'}`, background: on ? t.tint : 'transparent', color: on ? t.text : 'var(--ink-3)' })}>
                <span style={sx('width:7px;height:7px;border-radius:50%', { background: t.solid, opacity: on ? 1 : 0.45 })} />
                {t.label}
                <span style={sx("font:500 10.5px/1 'JetBrains Mono',monospace;color:var(--ink-faint)")}>{counts[lvl]}</span>
              </button>
            );
          })}
        </div>

        <div ref={ccyRef} style={sx('position:relative;margin-left:auto')}>
          <button type="button" aria-haspopup="listbox" aria-expanded={ccyOpen} onClick={() => setCcyOpen((o) => !o)} style={sx('display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink-2);font-size:12.5px;font-weight:600')}>
            {allOn ? 'All currencies' : `${countries.length} ${countries.length === 1 ? 'currency' : 'currencies'}`}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 10l5 5 5-5" /></svg>
          </button>
          {ccyOpen && (
            <div role="listbox" aria-multiselectable="true" style={sx('position:absolute;top:calc(100% + 7px);right:0;z-index:40;width:186px;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:var(--shadow-pop);animation:tgxSlide .16s ease-out')}>
              {allCodes.map((c) => {
                const on = countries.includes(c);
                return (
                  <button key={c} type="button" role="option" aria-selected={on} onClick={() => toggleCcy(c)} className="ecal-opt" style={sx('display:flex;align-items:center;gap:10px;width:100%;padding:8px 9px;border:0;border-radius:8px;background:transparent;text-align:left;font-size:13px;color:var(--ink)')}>
                    <span style={sx('flex:none;width:15px;height:15px;border-radius:4px;display:grid;place-items:center', on ? { background: 'var(--mint-solid)' } : { border: '1px solid var(--line-strong)' })}>
                      {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#02241d" strokeWidth="3.4" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>}
                    </span>
                    <span style={sx("font:500 12px/1 'JetBrains Mono',monospace;letter-spacing:.06em")}>{c}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. Hero */}
      {next && (
        <section style={sx('position:relative;margin-bottom:26px;border:1px solid var(--red-line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-lift);overflow:hidden')}>
          <div style={sx('position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,var(--red-tint),transparent 62%)')} aria-hidden />
          <div data-tgx-stack="1" style={sx('position:relative;display:flex;align-items:center;gap:24px;padding:22px 24px;flex-wrap:wrap')}>
            <div style={sx('flex:1;min-width:min(280px,100%)')}>
              <span style={sx('display:inline-flex;align-items:center;gap:8px;padding:5px 11px 5px 9px;border:1px solid var(--red-line);border-radius:999px;background:var(--red-tint)')}>
                <span style={sx('width:6px;height:6px;border-radius:50%;background:var(--red-solid);animation:tgxPulse 1.6s ease-in-out infinite')} />
                <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--red)")}>Next high impact</span>
              </span>
              <div style={sx('display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap')}>
                <span style={sx("font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.07em;padding:4px 7px;border:1px solid var(--line);border-radius:5px;background:var(--surface-2);color:var(--ink-2)")}>{next.event.country}</span>
                <h2 style={sx("margin:0;font:600 22px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.025em")}>{next.event.title}</h2>
              </div>
              <p style={sx('margin:7px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>
                {next.day.label} · {next.event.time} {timezoneLabel(tz, new Date(now)).split(' · ')[0]} · {next.event.forecast ? <>Forecast <span style={sx("font-family:'JetBrains Mono',monospace;color:var(--ink)")}>{next.event.forecast}</span> vs <span style={sx("font-family:'JetBrains Mono',monospace;color:var(--ink)")}>{next.event.previous ?? '—'}</span> previous</> : 'No forecast published'}
              </p>
            </div>
            <div style={sx('flex:none;text-align:right')}>
              <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint)")}>Releases in</div>
              <div style={sx("margin-top:8px;font:700 38px/1 'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em;color:var(--ink)")}>{countdown(next.ms)}</div>
              {armed ? (
                <div style={sx('margin-top:12px')}>
                  <span style={sx('display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid var(--mint-line);border-radius:9px;background:var(--mint-tint);color:var(--mint);font-size:12.5px;font-weight:600')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 11V8.4a5 5 0 0110 0V11" /><path d="M6 11h12v8H6z" /></svg>
                    Auto-lock armed
                  </span>
                  <div style={sx('margin-top:6px;font-size:11.5px;color:var(--ink-3)')}>No cancel — like the kill switch</div>
                </div>
              ) : (
                <button type="button" onClick={() => setLockFor(next.event)} style={sx('margin-top:12px;padding:10px 15px;border:0;border-radius:9px;background:var(--red-btn);color:#fff;font-size:12.5px;font-weight:700')}>Auto-lock ±{LOCK_MINUTES} min</button>
              )}
            </div>
          </div>
          <div style={sx('position:relative;display:flex;align-items:flex-start;gap:9px;padding:14px 24px;border-top:1px solid var(--line);background:var(--surface-2);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>
            <InfoGlyph />
            <span>Auto-lock blocks new orders on this account from fifteen minutes before the release until fifteen after. Open positions are left alone — a release is a reason not to enter, not a reason to be flattened at the worst tick.</span>
          </div>
        </section>
      )}

      {error && !loading && (
        <div style={sx('margin-bottom:16px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--surface);font-size:12.5px;color:var(--ink-2)')}>
          <strong style={sx('color:var(--ink);font-weight:700')}>Couldn&rsquo;t load the calendar.</strong> {error}
        </div>
      )}

      {/* 7. Day cards */}
      {loading ? (
        <section style={sx(CARD)}>
          <div style={sx('height:46px;background:var(--surface-2);border-bottom:1px solid var(--line)')} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} data-tgx-ecorow="1" style={sx(GRID, { padding: '12px 20px', borderBottom: '1px solid var(--line)' })}>
              {[72, 54, 40, 160, 60, 60, 60].map((w, j) => <span key={j} style={sx('display:block;height:12px;border-radius:4px;background:var(--surface-3);animation:tgxPulse 1.4s ease-in-out infinite', { width: j === 3 ? '60%' : `${Math.min(w, 60)}px`, justifySelf: j > 3 ? 'end' : 'start' })} />)}
            </div>
          ))}
        </section>
      ) : visible.map((day) => {
        const open = !collapsed.has(day.date);
        const high = day.events.filter((e) => e.impact === 3).length;
        return (
          <section key={day.date} ref={day.is_today ? todayRef : undefined} style={sx(CARD, { scrollMarginTop: 16 })}>
            <button type="button" onClick={() => toggleDay(day.date)} aria-expanded={open} style={sx('width:100%;display:flex;align-items:center;gap:11px;padding:14px 20px;border:0;text-align:left;color:var(--ink)', { background: day.is_today ? 'var(--mint-tint)' : 'var(--surface-2)' })}>
              <span style={sx('font-size:13.5px;font-weight:700;letter-spacing:-.01em')}>{day.label}</span>
              {day.is_today && <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:4px 8px;border-radius:999px;background:var(--mint-solid);color:#02241d")}>Today</span>}
              <span style={{ flex: 1 }} />
              <span style={sx('font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums')}>{high > 0 ? `${high} high impact · ` : ''}{day.events.length} {day.events.length === 1 ? 'event' : 'events'}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flex: 'none', color: 'var(--ink-3)' }}><path d={open ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'} /></svg>
            </button>
            {open && (day.events.length === 0 ? (
              <div style={sx('padding:22px 20px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-faint)')}>No events</div>
            ) : (
              <>
                <div data-tgx-ecohead="1" style={sx(GRID, sx("padding:10px 20px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface-2);font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint)"))}>
                  <span>Time</span><span>Ccy</span><span>Imp</span><span>Event</span><span style={{ textAlign: 'right' }}>Actual</span><span style={{ textAlign: 'right' }}>Forecast</span><span style={{ textAlign: 'right' }}>Previous</span>
                </div>
                {day.events.map((e) => {
                  const ms = msUntil(e, now); const past = isPast(e, now); const isNext = e.id === nextId; const holiday = e.impact === 0;
                  return (
                    <div key={e.id} data-tgx-ecorow="1" style={sx(GRID, { alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--line)', background: isNext ? 'var(--red-tint)' : 'transparent', opacity: past ? 0.52 : 1 })}>
                      <span data-tgx-ecoline="1" style={{ display: 'contents' }}>
                        <TimeCell event={e} isNext={isNext} />
                        <span style={sx("font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.07em;padding:4px 7px;border:1px solid var(--line);border-radius:5px;background:var(--surface-2);color:var(--ink-2);justify-self:start")}>{e.country}</span>
                        <span><ImpactBars level={e.impact} /></span>
                      </span>
                      <span data-tgx-ecotitle="1" style={sx('min-width:0;text-wrap:pretty', holiday ? { fontSize: 13, fontStyle: 'italic', color: 'var(--ink-3)' } : { fontSize: 13, fontWeight: 500, color: 'var(--ink)' })}>{holiday ? '🏦 ' : ''}{e.title}</span>
                      {!holiday && (
                        <span data-tgx-ecovals="1" style={{ display: 'contents' }}>
                          <span><span data-tgx-vlabel="1" style={sx(VLABEL)}>Act</span><Actual event={e} ms={ms} /></span>
                          <span><span data-tgx-vlabel="1" style={sx(VLABEL)}>Fcst</span><Value v={e.forecast} color="var(--ink-2)" /></span>
                          <span><span data-tgx-vlabel="1" style={sx(VLABEL)}>Prev</span><Value v={e.previous} color="var(--ink-3)" /></span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </section>
        );
      })}

      {lockFor && <LockModal event={lockFor} tz={tz} onArmed={onArmed} onClose={closeLock} />}
    </div>
  );
}
