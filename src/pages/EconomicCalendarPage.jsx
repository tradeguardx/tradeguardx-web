import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useToast } from '../components/common/ToastProvider';
import { useIsMobile } from '../hooks/useIsMobile';
import { fetchCalendar, scheduleCalendarLock } from '../api/calendarApi';
import { calendarSample } from '../fixtures/calendarSample';
import {
  rangeFor, timezoneLabel, msUntil, isPast, countdown, inLabel, timeCell,
  nextHighImpact, impactCounts, currenciesOf, filterDays, lockWindow,
} from '../lib/calendar';

/**
 * Economic calendar — upcoming macro releases (CPI, FOMC, NFP, rate
 * decisions) with the one thing Forex Factory does not have: a lock around
 * the release. Matches the Tax centre's light palette.
 *
 * Every countdown ticks from event_time_utc on a single client clock; the
 * server's relative times are never displayed. Non-exact times are shown as
 * their status (TENTATIVE / ALL DAY / DAY n) — a clock time is never
 * invented for them.
 */

// ── palette (Tax centre) ───────────────────────────────────────────────
const C = {
  page: '#eef2f4', card: '#ffffff', line: '#e2e8ea', ink: '#0f1e1b', ink2: '#5a6b70', ink3: '#8b9a9e',
  mint: '#10b981', mintBg: '#ecfdf5', mintLine: '#a7f3d0', high: '#e5484d', med: '#f59e0b', low: '#94a3b8',
  highBg: '#fef2f2', dark: '#0f1e1b', darkLine: '#1f3430', darkInk2: '#9fb3ad',
};
const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontVariantNumeric: 'tabular-nums' };
const IMPACT = { 3: { label: 'High', color: C.high }, 2: { label: 'Medium', color: C.med }, 1: { label: 'Low', color: C.low } };
const LOCK_MINUTES = 15;

// ── small parts ────────────────────────────────────────────────────────
function CurrencyTag({ code }) {
  return (
    <span className="inline-flex h-[20px] min-w-[34px] items-center justify-center rounded-md px-1.5 text-[10.5px] font-semibold tracking-[.06em]" style={{ ...MONO, background: '#f3f6f7', border: `1px solid ${C.line}`, color: C.ink2 }}>
      {String(code || '').slice(0, 3)}
    </span>
  );
}

function ImpactBars({ level }) {
  if (!level) return <span className="inline-block w-[14px]" aria-hidden />;
  const color = IMPACT[level]?.color || C.low;
  return (
    <span className="inline-flex items-end gap-[2px]" title={`${IMPACT[level]?.label || ''} impact`} aria-label={`${IMPACT[level]?.label || ''} impact`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className="inline-block w-[3px] rounded-[1px]" style={{ height: `${6 + i * 3}px`, background: i <= level ? color : '#e2e8ea' }} />
      ))}
    </span>
  );
}

function Dash() { return <span style={{ color: C.ink3 }}>—</span>; }
function Val({ v }) { return v == null || v === '' ? <Dash /> : <span style={{ color: C.ink }}>{v}</span>; }

function ActualCell({ event, ms }) {
  if (event.actual != null && event.actual !== '') {
    const color = event.surprise === 'beat' ? C.mint : event.surprise === 'miss' ? C.high : C.ink;
    const weight = event.surprise === 'beat' || event.surprise === 'miss' ? 600 : 400;
    return <span style={{ color, fontWeight: weight }}>{event.actual}</span>;
  }
  const soon = event.time_status === 'exact' ? inLabel(ms) : null;
  if (soon) return <span className="text-[10.5px] tracking-[.06em]" style={{ color: C.ink3 }}>{soon}</span>;
  return <Dash />;
}

function TimeCell({ event, isNext }) {
  const t = timeCell(event);
  return (
    <span className="inline-flex items-center gap-2">
      {isNext && <span className="ecal-pulse inline-block h-[7px] w-[7px] rounded-full" style={{ background: C.high }} aria-hidden />}
      {t.exact ? <span style={{ color: C.ink }}>{t.text}</span> : <span className="text-[10.5px] tracking-[.06em]" style={{ color: C.ink3 }}>{t.text}</span>}
    </span>
  );
}

function SkeletonRows({ n = 6 }) {
  return (
    <div className="px-4 py-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="ecal-shimmer my-2 h-[34px] rounded-lg" style={{ background: '#f3f6f7' }} />
      ))}
    </div>
  );
}

// ── auto-lock modal ────────────────────────────────────────────────────
function AutoLockModal({ event, tz, onClose }) {
  const { session } = useAuth();
  const { selectedAccount, selectedTradingAccountId } = useTradingAccounts();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const win = lockWindow(event, LOCK_MINUTES, tz);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    if (!selectedTradingAccountId) { toast.error('No account selected', 'Pick the account to lock first.'); return; }
    setBusy(true);
    try {
      await scheduleCalendarLock({ accessToken: session?.access_token, tradingAccountId: selectedTradingAccountId, eventId: event.id, lockFrom: win.from.toISOString(), lockUntil: win.to.toISOString() });
      toast.success('Auto-lock armed', `${selectedAccount?.name || 'This account'} locks ${win.fromLabel}–${win.toLabel} around ${event.title}.`);
      onClose();
    } catch (err) {
      const status = err?.status ?? err?.details?.status;
      toast.error(status === 404 ? 'Auto-lock is not live on the engine yet' : 'Could not arm the lock', status === 404 ? 'Nothing was armed. The calendar lock endpoint is not deployed.' : err?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" style={{ background: 'rgba(15,30,27,.55)' }} onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="ecal-lock-title" className="w-full max-w-[440px] overflow-hidden rounded-[13px]" style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: '0 18px 50px rgba(15,30,27,.18)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="text-[10px] font-semibold uppercase tracking-[.14em]" style={{ ...MONO, color: C.ink3 }}>Killswitch · auto-lock</div>
          <h3 id="ecal-lock-title" className="mt-2 text-[16px] font-semibold" style={{ color: C.ink }}>Lock trading around {event.title}</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: C.ink2 }}>The killswitch closes anything open at the start of the window and refuses new positions until it ends. Same lock as the manual one — same no-early-cancel rule.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 px-5 py-4">
          {[['Account', selectedAccount?.name || '—', false], ['Locks', win.fromLabel, true], ['Unlocks', win.toLabel, true]].map(([k, v, mono]) => (
            <div key={k} className="rounded-[10px] px-3 py-2.5" style={{ background: '#f8fafb', border: `1px solid ${C.line}` }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em]" style={{ color: C.ink3 }}>{k}</div>
              <div className="mt-1 truncate text-[14px] font-semibold" style={{ ...(mono ? MONO : {}), color: C.ink }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-2 text-[12px]" style={{ color: C.ink2 }}>
          <span className="inline-flex items-center gap-1.5"><CurrencyTag code={event.country} /> {event.time} · ±{LOCK_MINUTES} min{event.forecast ? ` · forecast ${event.forecast}` : ''}{event.previous ? ` · previous ${event.previous}` : ''}</span>
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3">
          <button type="button" disabled={busy} onClick={submit} className="rounded-[9px] px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60" style={{ background: C.high }}>{busy ? 'Arming…' : `Arm lock ${win.fromLabel}–${win.toLabel}`}</button>
          <button type="button" onClick={onClose} className="rounded-[9px] px-4 py-2.5 text-[12.5px] font-semibold" style={{ border: `1px solid ${C.line}`, color: C.ink2, background: C.card }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────
export default function EconomicCalendarPage() {
  const { session } = useAuth();
  const { selectedAccount, selectedTradingAccountId } = useTradingAccounts();
  const isMobile = useIsMobile(767);
  const accessToken = session?.access_token;

  const [mode, setMode] = useState('week');
  const [offset, setOffset] = useState(0);
  const [impacts, setImpacts] = useState(() => new Set([3, 2]));
  const [countries, setCountries] = useState([]);
  const [ccyOpen, setCcyOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [data, setData] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState('');
  const [sample, setSample] = useState(false);
  const [lockFor, setLockFor] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const todayRef = useRef(null);
  const scrolledRef = useRef(false);

  const range = useMemo(() => rangeFor(mode, offset), [mode, offset]);
  const tz = data?.timezone || selectedAccount?.timezone || undefined;

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    if (!accessToken) return undefined;
    const ctrl = new AbortController();
    const key = `${range.from}:${range.to}`;
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetchCalendar({ accessToken, from: range.from, to: range.to, tz: browserTz, tradingAccountId: selectedTradingAccountId, signal: ctrl.signal })
      .then((r) => { if (!ctrl.signal.aborted) { setData(r); setSample(false); setError(''); } })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        // Local dev only: show the layout against a labelled sample when the feed is not reachable.
        if (import.meta.env.DEV) { setData(calendarSample()); setSample(true); setError(''); return; }
        setData({ timezone: null, days: [] }); setError(e?.message || 'Could not load the calendar');
      })
      .finally(() => { if (!ctrl.signal.aborted) setLoadedKey(key); });
    return () => ctrl.abort();
  }, [accessToken, range.from, range.to, selectedTradingAccountId]);

  const loading = loadedKey !== `${range.from}:${range.to}`;
  const days = useMemo(() => data?.days ?? [], [data]);
  const counts = useMemo(() => impactCounts(days), [days]);
  const allCurrencies = useMemo(() => currenciesOf(days), [days]);
  const visible = useMemo(() => filterDays(days, { impacts, countries }), [days, impacts, countries]);
  const next = useMemo(() => nextHighImpact(days, now, countries), [days, now, countries]);
  const nextId = next?.event.id;

  // Auto-scroll to today once the data is in.
  useEffect(() => {
    if (loading || scrolledRef.current || !todayRef.current) return;
    scrolledRef.current = true;
    todayRef.current.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [loading, days]);

  const toggleImpact = (lvl) => setImpacts((s) => { const n = new Set(s); if (n.has(lvl)) n.delete(lvl); else n.add(lvl); return n; });
  const toggleCountry = (c) => setCountries((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const toggleDay = (date) => setCollapsed((s) => { const n = new Set(s); if (n.has(date)) n.delete(date); else n.add(date); return n; });
  const closeLock = useCallback(() => setLockFor(null), []);

  const segBtn = (active) => `px-3 py-1.5 text-[12.5px] font-semibold rounded-[8px] transition-colors ${active ? 'text-white' : ''}`;
  const seg = [
    { k: 'week:0', label: 'This week', on: mode === 'week' && offset === 0, go: () => { setMode('week'); setOffset(0); } },
    { k: 'week:1', label: 'Next week', on: mode === 'week' && offset === 1, go: () => { setMode('week'); setOffset(1); } },
    { k: 'month', label: 'Month', on: mode === 'month', go: () => { setMode('month'); setOffset(0); } },
  ];

  return (
    <div className="ecal" style={{ color: C.ink, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .ecal-pulse{animation:ecalPulse 1.6s ease-in-out infinite}
        @keyframes ecalPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
        .ecal-shimmer{animation:ecalShimmer 1.4s ease-in-out infinite}
        @keyframes ecalShimmer{0%,100%{opacity:1}50%{opacity:.45}}
        .ecal-row:hover{background:#f8fafb}
        @media (prefers-reduced-motion:reduce){.ecal-pulse,.ecal-shimmer{animation:none}}
      `}</style>

      {/* 1. Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-.02em]" style={{ color: C.ink }}>Economic calendar</h1>
          <p className="mt-1 text-[13px]" style={{ color: C.ink2 }}>What will move your pairs this week — and a lock you can put around it.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11.5px] font-semibold" style={{ ...MONO, background: C.card, border: `1px solid ${C.line}`, color: C.ink2 }} title={tz || 'Browser timezone'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          {timezoneLabel(tz, new Date(now))}
        </span>
      </div>

      {data?.source?.stale && !sample && (
        <div className="mb-4 rounded-[10px] px-3.5 py-2.5 text-[12px]" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
          <strong className="font-semibold">Feed is behind.</strong> The last successful update was {data.source.last_success_at ? new Date(data.source.last_success_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'unknown'} — showing the last stored copy.
        </div>
      )}
      {sample && (
        <div className="mb-4 rounded-[10px] px-3.5 py-2.5 text-[12px]" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
          <strong className="font-semibold">Sample data.</strong> The calendar feed is not reachable from this build, so this is a labelled fixture — nothing here is real.
        </div>
      )}

      {/* 2. Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex items-center gap-0.5 rounded-[10px] p-1" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <button type="button" aria-label="Previous" onClick={() => setOffset((o) => o - 1)} className="grid h-7 w-7 place-items-center rounded-[8px]" style={{ color: C.ink2 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
          <span className="mx-0.5 h-4 w-px" style={{ background: C.line }} />
          {seg.map((s) => <button key={s.k} type="button" onClick={s.go} className={segBtn(s.on)} style={{ background: s.on ? C.ink : 'transparent', color: s.on ? '#fff' : C.ink2 }}>{s.label}</button>)}
          <span className="mx-0.5 h-4 w-px" style={{ background: C.line }} />
          <button type="button" aria-label="Next" onClick={() => setOffset((o) => o + 1)} className="grid h-7 w-7 place-items-center rounded-[8px]" style={{ color: C.ink2 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg></button>
        </div>
        <span className="text-[12px] font-medium" style={{ ...MONO, color: C.ink3 }}>{range.label}</span>

        <div className="flex flex-wrap items-center gap-1.5 sm:ml-2">
          {[3, 2, 1].map((lvl) => {
            const on = impacts.has(lvl);
            return (
              <button key={lvl} type="button" aria-pressed={on} onClick={() => toggleImpact(lvl)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: on ? C.card : 'transparent', border: `1px solid ${on ? C.line : 'transparent'}`, color: on ? C.ink : C.ink3, opacity: on ? 1 : 0.8 }}>
                <span className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: IMPACT[lvl].color, opacity: on ? 1 : 0.45 }} />
                {IMPACT[lvl].label}
                <span style={{ ...MONO, color: C.ink3 }}>{counts[lvl]}</span>
              </button>
            );
          })}
        </div>

        <div className="relative sm:ml-auto">
          <button type="button" aria-haspopup="listbox" aria-expanded={ccyOpen} onClick={() => setCcyOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink }}>
            {countries.length ? `${countries.length} currenc${countries.length === 1 ? 'y' : 'ies'}` : 'All currencies'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 10l5 5 5-5" /></svg>
          </button>
          {ccyOpen && (
            <div role="listbox" aria-multiselectable="true" className="absolute right-0 z-20 mt-1 w-[200px] rounded-[10px] p-1.5" style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: '0 10px 30px rgba(15,30,27,.12)' }}>
              {allCurrencies.length === 0 && <div className="px-2 py-1.5 text-[12px]" style={{ color: C.ink3 }}>No currencies in range</div>}
              {allCurrencies.map((c) => {
                const on = countries.includes(c);
                return (
                  <button key={c} type="button" role="option" aria-selected={on} onClick={() => toggleCountry(c)} className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12.5px]" style={{ color: C.ink, background: on ? C.mintBg : 'transparent' }}>
                    <span className="grid h-[14px] w-[14px] place-items-center rounded-[4px]" style={{ border: `1px solid ${on ? C.mint : C.line}`, background: on ? C.mint : '#fff' }}>{on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>}</span>
                    <CurrencyTag code={c} />
                  </button>
                );
              })}
              {countries.length > 0 && <button type="button" onClick={() => setCountries([])} className="mt-1 w-full rounded-[7px] px-2 py-1.5 text-left text-[12px] font-semibold" style={{ color: C.ink2, borderTop: `1px solid ${C.line}` }}>Clear</button>}
            </div>
          )}
        </div>
      </div>

      {/* 3. Next-event strip */}
      {!loading && next && (
        <section className="mb-4 overflow-hidden rounded-[13px]" style={{ background: C.dark, color: '#fff', border: `1px solid ${C.darkLine}` }}>
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[.14em]" style={{ ...MONO, background: 'rgba(229,72,77,.18)', color: '#fca5a5' }}>
                <span className="ecal-pulse inline-block h-[6px] w-[6px] rounded-full" style={{ background: C.high }} />Next high impact
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <span className="text-[19px] font-semibold tracking-[-.01em]">{next.event.title}</span>
                <span className="inline-flex h-[20px] items-center rounded-md px-1.5 text-[10.5px] font-semibold tracking-[.06em]" style={{ ...MONO, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', color: '#d4dedb' }}>{next.event.country}</span>
              </div>
              <div className="mt-1.5 text-[12.5px]" style={{ color: C.darkInk2 }}>
                {next.day.label} · <span style={MONO}>{next.event.time}</span>
                {' · '}forecast <span style={{ ...MONO, color: '#fff' }}>{next.event.forecast ?? '—'}</span>
                {' · '}previous <span style={{ ...MONO, color: '#fff' }}>{next.event.previous ?? '—'}</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2.5 md:items-end">
              <div className="text-[30px] font-semibold leading-none tracking-[-.02em]" style={MONO} aria-live="off">{countdown(next.ms)}</div>
              <button type="button" onClick={() => setLockFor(next.event)} className="inline-flex items-center gap-2 rounded-[9px] px-3.5 py-2 text-[12.5px] font-bold" style={{ background: C.high, color: '#fff' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4v7" /><path d="M6.8 7.4a7.4 7.4 0 1010.4 0" /></svg>
                Auto-lock ±{LOCK_MINUTES} min
              </button>
            </div>
          </div>
        </section>
      )}

      {error && !loading && (
        <div className="mb-4 rounded-[10px] px-3.5 py-3 text-[12.5px]" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink2 }}>
          <strong className="font-semibold" style={{ color: C.ink }}>Couldn&rsquo;t load the calendar.</strong> {error}
        </div>
      )}

      {/* 4. Day groups */}
      {loading ? (
        <div className="rounded-[13px]" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <div className="ecal-shimmer mx-4 mt-4 h-4 w-40 rounded" style={{ background: '#f3f6f7' }} />
          <SkeletonRows />
        </div>
      ) : visible.length === 0 && !error ? (
        <div className="rounded-[13px] px-5 py-10 text-center text-[13px]" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink3 }}>No events in this range.</div>
      ) : visible.map((day) => {
        const open = !collapsed.has(day.date);
        const shown = day.events;
        const high = day.events.filter((e) => e.impact === 3).length;
        return (
          <section key={day.date} ref={day.is_today ? todayRef : undefined} className="mb-3 overflow-hidden rounded-[13px] scroll-mt-4" style={{ background: C.card, border: `1px solid ${day.is_today ? C.mintLine : C.line}` }}>
            <button type="button" onClick={() => toggleDay(day.date)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: open ? `1px solid ${C.line}` : 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: C.ink3, transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform .15s' }}><path d="M7 10l5 5 5-5" /></svg>
              <span className="text-[14px] font-semibold" style={{ color: C.ink }}>{day.label}</span>
              {day.is_today && <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-[.1em]" style={{ ...MONO, background: C.mintBg, border: `1px solid ${C.mintLine}`, color: '#047857' }}>TODAY</span>}
              <span className="ml-auto text-[12px]" style={{ ...MONO, color: C.ink3 }}>
                {high > 0 && <><span style={{ color: C.high }}>{high} high impact</span> · </>}{shown.length} {shown.length === 1 ? 'event' : 'events'}
              </span>
            </button>

            {open && (shown.length === 0 ? (
              <div className="px-4 py-3.5 text-[12.5px]" style={{ color: C.ink3 }}>No events</div>
            ) : isMobile ? (
              <div>
                {shown.map((e) => {
                  const ms = msUntil(e, now); const past = isPast(e, now); const isNext = e.id === nextId; const holiday = e.impact === 0;
                  return (
                    <div key={e.id} className="px-4 py-3" style={{ borderTop: `1px solid ${C.line}`, opacity: past ? 0.52 : 1, background: isNext ? C.highBg : 'transparent' }}>
                      <div className="flex items-center gap-2.5 text-[12.5px]" style={MONO}>
                        <TimeCell event={e} isNext={isNext} />
                        <CurrencyTag code={e.country} />
                        <ImpactBars level={e.impact} />
                        <span className="ml-auto"><ActualCell event={e} ms={ms} /></span>
                      </div>
                      <div className="mt-1.5 text-[13.5px] font-medium" style={{ color: holiday ? C.ink3 : C.ink, fontStyle: holiday ? 'italic' : 'normal' }}>{holiday ? '🏦 ' : ''}{e.title}</div>
                      {!holiday && (
                        <div className="mt-1 flex gap-4 text-[11.5px]" style={{ color: C.ink3 }}>
                          <span>Forecast <span style={{ ...MONO, color: C.ink2 }}>{e.forecast ?? '—'}</span></span>
                          <span>Previous <span style={{ ...MONO, color: C.ink2 }}>{e.previous ?? '—'}</span></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-[10.5px] font-semibold uppercase tracking-[.08em]" style={{ color: C.ink3 }}>
                    <th className="w-[112px] px-4 py-2 text-left font-semibold">Time</th>
                    <th className="w-[72px] px-2 py-2 text-left font-semibold">Currency</th>
                    <th className="w-[64px] px-2 py-2 text-left font-semibold">Impact</th>
                    <th className="px-2 py-2 text-left font-semibold">Event</th>
                    <th className="w-[96px] px-3 py-2 text-right font-semibold">Actual</th>
                    <th className="w-[96px] px-3 py-2 text-right font-semibold">Forecast</th>
                    <th className="w-[96px] px-4 py-2 text-right font-semibold">Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((e) => {
                    const ms = msUntil(e, now); const past = isPast(e, now); const isNext = e.id === nextId; const holiday = e.impact === 0;
                    return (
                      <tr key={e.id} className="ecal-row" style={{ borderTop: `1px solid ${C.line}`, opacity: past ? 0.52 : 1, background: isNext ? C.highBg : undefined }}>
                        <td className="px-4 py-2.5 align-middle" style={MONO}><TimeCell event={e} isNext={isNext} /></td>
                        <td className="px-2 py-2.5 align-middle"><CurrencyTag code={e.country} /></td>
                        <td className="px-2 py-2.5 align-middle"><ImpactBars level={e.impact} /></td>
                        <td className="px-2 py-2.5 align-middle" style={{ color: holiday ? C.ink3 : C.ink, fontStyle: holiday ? 'italic' : 'normal' }}>{holiday ? '🏦 ' : ''}{e.title}</td>
                        {holiday ? <td colSpan={3} /> : (
                          <>
                            <td className="px-3 py-2.5 text-right align-middle" style={MONO}><ActualCell event={e} ms={ms} /></td>
                            <td className="px-3 py-2.5 text-right align-middle" style={MONO}><Val v={e.forecast} /></td>
                            <td className="px-4 py-2.5 text-right align-middle" style={MONO}><Val v={e.previous} /></td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
          </section>
        );
      })}

      {lockFor && <AutoLockModal event={lockFor} tz={tz} onClose={closeLock} />}
    </div>
  );
}
