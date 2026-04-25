import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, TradeRowSkeleton } from '../components/common/LoadingSkeleton';
import DashboardPageBanner from '../components/dashboard/DashboardPageBanner';
import { staggerContainer, staggerItem } from '../components/dashboard/dashboardMotion';

import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useDashboardTheme } from '../context/DashboardThemeContext';
import { journalHistoryDaysForPlan, journalPeriodBadgeLabel } from '../lib/planLimits';
import { fetchUnifiedTrades } from '../api/tradesApi';
import { useTradeAnnotationsBulk } from '../hooks/useTradeAnnotations';

function fmt$(v, currency = 'USD') {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, signDisplay: 'exceptZero', maximumFractionDigits: 2 }).format(n);
}
function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
function fmtDuration(open, close) {
  if (!open || !close) return null;
  const sec = (new Date(close) - new Date(open)) / 1000;
  if (!Number.isFinite(sec) || sec < 0) return null;
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

const EVENT_BADGE = {
  SL_UPDATE: { label: 'SL moved', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  TP_UPDATE: { label: 'TP moved', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  SIZE_UPDATE: { label: 'Size chg', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  RULE_BLOCK: { label: 'Blocked', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
};

const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'wins', label: 'Wins' },
  { key: 'losses', label: 'Losses' },
  { key: 'open', label: 'Open' },
  { key: 'blocked', label: 'Rule-blocked' },
  { key: 'review', label: 'Needs review' },
];

const ALL_RANGES = [
  { key: '24h', label: '24h', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: 'all', label: 'All', days: null },
];

const SIDES = [
  { key: 'any', label: 'Any side' },
  { key: 'buy', label: 'Buy' },
  { key: 'sell', label: 'Sell' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'best', label: 'Best P&L' },
  { key: 'worst', label: 'Worst P&L' },
];

const PARAM_DEFAULTS = { view: 'all', range: 'all', side: 'any', sort: 'newest', q: '' };

function isClosed(t) { return String(t?.status || '').toUpperCase() === 'CLOSED'; }
function ruleBlockCount(t) { return Number(t?.aiShortInsight?.evidence?.eventCounts?.ruleBlocks || 0); }
function hasAnnotation(ann) {
  return !!(ann && (ann.rating || ann.setupType || ann.emotion || (ann.notes && ann.notes.trim())));
}
function withinRange(t, rangeKey) {
  const r = ALL_RANGES.find((x) => x.key === rangeKey);
  if (!r || r.days == null) return true;
  const opened = t.openedAt ? new Date(t.openedAt).getTime() : null;
  if (!opened || Number.isNaN(opened)) return true;
  return opened >= Date.now() - r.days * 24 * 60 * 60 * 1000;
}
function matchesSide(t, side) {
  if (!side || side === 'any') return true;
  const s = String(t.side || '').toLowerCase();
  if (side === 'buy') return s === 'buy' || s === 'long';
  if (side === 'sell') return s === 'sell' || s === 'short';
  return true;
}

function isMeaningfulTradeRow(t) {
  if (!t || typeof t !== 'object') return false;
  const symbol = String(t.symbol || '').trim().toUpperCase();
  if (!symbol || symbol === '-' || symbol === '—' || symbol === '--' || symbol === 'UNKNOWN') return false;
  const side = String(t.side || '').trim().toUpperCase();
  if (!['BUY', 'SELL', 'LONG', 'SHORT'].includes(side)) return false;
  const hasTime = !!(t.openedAt || t.closedAt);
  const hasPrice = Number.isFinite(Number(t.entryPrice)) || Number.isFinite(Number(t.exitPrice)) || Number.isFinite(Number(t.currentPrice));
  const hasSize = Number.isFinite(Number(t.quantity)) || Number.isFinite(Number(t.volume));
  return hasTime || hasPrice || hasSize;
}


export default function AllTradesPage() {
  const navigate = useNavigate();
  const { isDark } = useDashboardTheme();
  const { session, user } = useAuth();
  const { accounts, accountsLoading, selectedTradingAccountId, selectedAccount } = useTradingAccounts();
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState([]);
  const [error, setError] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || PARAM_DEFAULTS.view;
  const range = searchParams.get('range') || PARAM_DEFAULTS.range;
  const side = searchParams.get('side') || PARAM_DEFAULTS.side;
  const sort = searchParams.get('sort') || PARAM_DEFAULTS.sort;
  const search = searchParams.get('q') || PARAM_DEFAULTS.q;

  const patchParams = useCallback((patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        const isDefault = v == null || v === '' || PARAM_DEFAULTS[k] === v;
        if (isDefault) next.delete(k); else next.set(k, v);
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearAllFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ['view', 'range', 'side', 'sort', 'q'].forEach((k) => next.delete(k));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const planCap = journalHistoryDaysForPlan(user?.plan);
  const visibleRanges = useMemo(
    () => ALL_RANGES.filter((r) => planCap == null || r.days == null || r.days <= planCap),
    [planCap],
  );

  useEffect(() => {
    if (range !== 'all' && !visibleRanges.some((r) => r.key === range)) {
      patchParams({ range: 'all' });
    }
  }, [range, visibleRanges, patchParams]);

  const loadTrades = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !selectedTradingAccountId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const rows = await fetchUnifiedTrades({ accessToken: token, tradingAccountId: selectedTradingAccountId, limit: 200 });
      const safeRows = (Array.isArray(rows) ? rows : []).filter(isMeaningfulTradeRow);
      setTrades(safeRows);
    } catch (e) {
      setError(e?.message || 'Could not load trades.');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedTradingAccountId]);

  useEffect(() => {
    if (accountsLoading) return;
    loadTrades();
  }, [accountsLoading, selectedTradingAccountId, loadTrades]);

  const tradeUids = useMemo(() => trades.map((t) => t.tradeUid).filter(Boolean), [trades]);
  const annotations = useTradeAnnotationsBulk(tradeUids);

  const baseFiltered = useMemo(() => {
    let list = trades;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => (t.symbol || '').toLowerCase().includes(q) || (t.tradeUid || '').toLowerCase().includes(q));
    }
    list = list.filter((t) => withinRange(t, range));
    list = list.filter((t) => matchesSide(t, side));
    return list;
  }, [trades, search, range, side]);

  const viewCounts = useMemo(() => {
    const c = { all: 0, wins: 0, losses: 0, open: 0, blocked: 0, review: 0 };
    baseFiltered.forEach((t) => {
      const closed = isClosed(t);
      const pnl = Number(t.pnl);
      c.all += 1;
      if (closed && Number.isFinite(pnl) && pnl > 0) c.wins += 1;
      if (closed && Number.isFinite(pnl) && pnl < 0) c.losses += 1;
      if (!closed) c.open += 1;
      if (ruleBlockCount(t) > 0) c.blocked += 1;
      const ann = t.tradeUid ? annotations[t.tradeUid] : null;
      if (closed && !hasAnnotation(ann)) c.review += 1;
    });
    return c;
  }, [baseFiltered, annotations]);

  const filtered = useMemo(() => {
    let list = baseFiltered;
    if (view !== 'all') {
      list = list.filter((t) => {
        const closed = isClosed(t);
        const pnl = Number(t.pnl);
        switch (view) {
          case 'wins': return closed && Number.isFinite(pnl) && pnl > 0;
          case 'losses': return closed && Number.isFinite(pnl) && pnl < 0;
          case 'open': return !closed;
          case 'blocked': return ruleBlockCount(t) > 0;
          case 'review': {
            const ann = t.tradeUid ? annotations[t.tradeUid] : null;
            return closed && !hasAnnotation(ann);
          }
          default: return true;
        }
      });
    }
    const sorted = [...list];
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
    else if (sort === 'oldest') sorted.sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt));
    else if (sort === 'best') sorted.sort((a, b) => Number(b.pnl || 0) - Number(a.pnl || 0));
    else if (sort === 'worst') sorted.sort((a, b) => Number(a.pnl || 0) - Number(b.pnl || 0));
    return sorted;
  }, [baseFiltered, view, sort, annotations]);

  const stats = useMemo(() => {
    const closed = trades.filter(isClosed);
    const net = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wins = closed.filter((t) => Number(t.pnl) > 0).length;
    return { total: trades.length, net, wr: closed.length ? Math.round((wins / closed.length) * 100) : 0, open: trades.length - closed.length };
  }, [trades]);

  const hasActiveFilters = view !== 'all' || range !== 'all' || side !== 'any' || !!search;

  const pageLoading = accountsLoading || loading;

  if (!accountsLoading && accounts.length === 0) {
    return (
      <div className="max-w-6xl">
        <DashboardPageBanner
          accent="violet"
          title="All Trades"
          subtitle={`Synced trades for this account — ${journalPeriodBadgeLabel(user?.plan)} window.`}
        />
        <EmptyState
          title="Add a trading account"
          description="Create a trading account to start seeing your synced trades here."
          action={<Link to="/dashboard/account/trading" className="inline-flex items-center px-4 py-2 rounded-xl bg-accent text-surface-950 font-semibold text-sm">Trading accounts</Link>}
        />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl">
      <DashboardPageBanner
        accent="violet"
        title="All Trades"
        subtitle={`Synced trades for this account — ${journalPeriodBadgeLabel(user?.plan)} window.`}
        badge={<span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">{pageLoading ? '…' : `${stats.total} trades`}</span>}
        actions={(
          <div className="flex gap-2">
            <Link to="/dashboard/journal" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent/20"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-secondary)' }}>
              ← Journal
            </Link>
          </div>
        )}
      />

      {!accountsLoading && accounts.length > 0 && selectedAccount?.accountSize != null && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--dash-text-primary)' }}>{selectedAccount.accountCurrency || 'USD'} {Number(selectedAccount.accountSize).toLocaleString()}</p>
            <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>Trading Account Balance</p>
          </div>
          <Link to="/dashboard/account/trading" className="text-[11px] font-semibold text-accent hover:underline">Manage</Link>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-amber-400">{error}</p>}

      {!pageLoading && trades.length > 0 && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Trades', value: stats.total, color: '#00d4aa', rgb: '0,212,170', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
            { label: 'Open', value: stats.open, color: '#f59e0b', rgb: '245,158,11', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Net P&L', value: fmt$(stats.net), color: stats.net >= 0 ? '#22c55e' : '#ef4444', rgb: stats.net >= 0 ? '34,197,94' : '239,68,68', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
            { label: 'Win Rate', value: `${stats.wr}%`, color: '#06b6d4', rgb: '6,182,212', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          ].map((s) => (
            <motion.div key={s.label} variants={staggerItem} whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
              className="group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition-all hover:shadow-lg"
              style={{
                borderColor: `rgba(${s.rgb},${isDark ? 0.2 : 0.28})`,
                backgroundColor: isDark ? `rgba(${s.rgb},0.07)` : '#ffffff',
                boxShadow: isDark ? 'none' : `0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(${s.rgb},0.08)`,
              }}>
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-60" style={{ backgroundColor: s.color }} />
              <div className="relative flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${s.rgb},${isDark ? 0.6 : 0.72})` }}>{s.label}</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `rgba(${s.rgb},${isDark ? 0.12 : 0.10})`, color: s.color }}>{s.icon}</div>
              </div>
              <p className="relative mt-1.5 text-xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* view tabs (Sentry-style saved views) */}
      {!pageLoading && trades.length > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-1 overflow-x-auto rounded-2xl border p-1"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
        >
          {VIEWS.map((v) => {
            const active = view === v.key;
            const count = viewCounts[v.key] ?? 0;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => patchParams({ view: v.key })}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-all whitespace-nowrap"
                style={{
                  backgroundColor: active ? (isDark ? 'rgba(0,212,170,0.14)' : 'rgba(0,212,170,0.10)') : 'transparent',
                  color: active ? '#00d4aa' : 'var(--dash-text-muted)',
                  boxShadow: active ? (isDark ? '0 1px 3px rgba(0,212,170,0.15)' : '0 0 0 1px rgba(0,212,170,0.28)') : 'none',
                }}
              >
                <span>{v.label}</span>
                <span
                  className="inline-flex min-w-[18px] items-center justify-center rounded-md px-1 text-[10px] font-bold"
                  style={{
                    backgroundColor: active ? 'rgba(0,212,170,0.18)' : 'var(--dash-bg-card)',
                    color: active ? '#00d4aa' : 'var(--dash-text-faint)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* search + range + side + sort bar */}
      {!pageLoading && trades.length > 0 && (
        <div className="mb-4 rounded-2xl border p-3" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--dash-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search by symbol, pair, or trade ID…"
                value={search}
                onChange={(e) => patchParams({ q: e.target.value })}
                className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none focus:border-accent/40 transition-colors"
                style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-primary)' }}
              />
            </div>

            {/* time range */}
            <div
              className="flex items-center gap-1 rounded-xl border p-1"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
              title={`Limited by your plan: ${journalPeriodBadgeLabel(user?.plan)}`}
            >
              {visibleRanges.map((r) => {
                const active = range === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => patchParams({ range: r.key })}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all"
                    style={{
                      backgroundColor: active ? (isDark ? 'rgba(0,212,170,0.14)' : 'rgba(0,212,170,0.10)') : 'transparent',
                      color: active ? '#00d4aa' : 'var(--dash-text-muted)',
                      boxShadow: active ? (isDark ? '0 1px 3px rgba(0,212,170,0.15)' : '0 0 0 1px rgba(0,212,170,0.28)') : 'none',
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* side */}
            <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
              {SIDES.map((s) => {
                const active = side === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => patchParams({ side: s.key })}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all"
                    style={{
                      backgroundColor: active ? (isDark ? 'rgba(0,212,170,0.14)' : 'rgba(0,212,170,0.10)') : 'transparent',
                      color: active ? '#00d4aa' : 'var(--dash-text-muted)',
                      boxShadow: active ? (isDark ? '0 1px 3px rgba(0,212,170,0.15)' : '0 0 0 1px rgba(0,212,170,0.28)') : 'none',
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <select value={sort} onChange={(e) => patchParams({ sort: e.target.value })}
                className="appearance-none rounded-xl border pl-3 pr-8 py-2 text-[11px] font-semibold outline-none cursor-pointer transition-colors hover:border-accent/20"
                style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-secondary)' }}>
                {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: 'var(--dash-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-accent/10"
                style={{ color: '#00d4aa' }}
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {pageLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <TradeRowSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 && !error ? (
        trades.length === 0 ? (
          <EmptyState
            title="No trades synced yet"
            description="Pair the extension with your broker, trade, and records appear here automatically."
            action={(
              <div className="flex flex-wrap gap-2 justify-center">
                <Link to="/dashboard/account/trading" className="inline-flex items-center px-4 py-2 rounded-xl bg-accent text-surface-950 font-semibold text-sm">Trading accounts</Link>
                <Link to="/dashboard/install-extension" className="inline-flex items-center px-4 py-2 rounded-xl border text-sm font-semibold" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>Extension setup</Link>
              </div>
            )}
          />
        ) : (
          <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--dash-border)' }}>
            <p style={{ color: 'var(--dash-text-faint)' }}>No trades match your filters.</p>
            <button type="button" onClick={clearAllFilters} className="mt-2 text-sm text-accent hover:underline">Clear filters</button>
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--dash-border)' }}>
                  {['Symbol', 'Side', 'Status', 'Opened', 'Closed', 'Hold', 'Entry', 'Exit', 'P&L', 'Rating', 'Setup', 'Flags', ''].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--dash-text-faint)', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const pnl = Number(t.pnl);
                  const isWin = pnl > 0;
                  const isClosed = String(t.status || '').toUpperCase() === 'CLOSED';
                  const side = (t.side || '').toUpperCase();
                  const isLong = side === 'BUY' || side === 'LONG';
                  const dur = fmtDuration(t.openedAt, t.closedAt);
                  const mediaCount = Number(t?.mediaSummary?.mediaCount || 0);
                  const ann = t.tradeUid ? annotations[t.tradeUid] : null;
                  const ev = t.aiShortInsight?.evidence?.eventCounts || {};
                  const flags = [
                    ev.slUpdates > 0 && EVENT_BADGE.SL_UPDATE,
                    ev.tpUpdates > 0 && EVENT_BADGE.TP_UPDATE,
                    ev.sizeUpdates > 0 && EVENT_BADGE.SIZE_UPDATE,
                    ev.ruleBlocks > 0 && EVENT_BADGE.RULE_BLOCK,
                  ].filter(Boolean);

                  return (
                    <motion.tr
                      key={t.tradeUid || t.id || i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="group cursor-pointer transition-colors hover:bg-[var(--dash-bg-card-hover)]"
                      style={{ borderBottom: '1px solid var(--dash-border)' }}
                      onClick={() => t.tradeUid && navigate(`/dashboard/trades/${encodeURIComponent(t.tradeUid)}`)}
                    >
                      {/* Symbol */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold ${isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {isLong ? 'L' : 'S'}
                          </div>
                          <span className="font-mono text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--dash-text-primary)' }}>{t.symbol || '—'}</span>
                        </div>
                      </td>
                      {/* Side */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{side || '—'}</span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${isClosed ? 'bg-slate-500/10 text-slate-400' : 'bg-amber-500/10 text-amber-400'}`}>{t.status || 'OPEN'}</span>
                      </td>
                      {/* Opened */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--dash-text-muted)' }}>{fmtDate(t.openedAt)}</td>
                      {/* Closed */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--dash-text-muted)' }}>{fmtDate(t.closedAt)}</td>
                      {/* Hold */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--dash-text-faint)' }}>{dur || '—'}</td>
                      {/* Entry */}
                      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: 'var(--dash-text-secondary)' }}>{t.entryPrice ? Number(t.entryPrice).toFixed(4) : '—'}</td>
                      {/* Exit */}
                      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: 'var(--dash-text-secondary)' }}>{t.exitPrice ? Number(t.exitPrice).toFixed(4) : '—'}</td>
                      {/* P&L */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isClosed && Number.isFinite(pnl) ? (
                          <span className={`text-sm font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(pnl, t.currency || 'USD')}</span>
                        ) : (
                          <span style={{ color: 'var(--dash-text-faint)' }}>—</span>
                        )}
                      </td>
                      {/* Rating */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ann?.rating ? (
                          <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                            {'★'.repeat(ann.rating)}{'☆'.repeat(5 - ann.rating)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--dash-text-faint)' }}>—</span>
                        )}
                      </td>
                      {/* Setup */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {ann?.setupType && (
                            <span className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: isDark ? 'rgba(0,212,170,0.10)' : 'rgba(0,212,170,0.12)', color: '#00d4aa', border: isDark ? 'none' : '1px solid rgba(0,212,170,0.25)' }}>{ann.setupType}</span>
                          )}
                          {ann?.emotion && (
                            <span className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: isDark ? 'rgba(96,165,250,0.10)' : 'rgba(96,165,250,0.10)', color: '#60a5fa', border: isDark ? 'none' : '1px solid rgba(96,165,250,0.25)' }}>{ann.emotion}</span>
                          )}
                          {ann?.notes && (
                            <span title="Has notes" className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>📝</span>
                          )}
                          {!ann?.setupType && !ann?.emotion && !ann?.notes && (
                            <span style={{ color: 'var(--dash-text-faint)' }}>—</span>
                          )}
                        </div>
                      </td>
                      {/* Flags */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {flags.map((b) => (
                            <span key={b.label} title={b.label} className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: b.bg, color: b.color, border: isDark ? 'none' : `1px solid ${b.color}40` }}>{b.label.split(' ')[0]}</span>
                          ))}
                          {mediaCount > 0 && (
                            <span title={`${mediaCount} screenshot(s)`} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: isDark ? 'rgba(0,212,170,0.10)' : 'rgba(0,212,170,0.08)', color: '#00d4aa', border: isDark ? 'none' : '1px solid rgba(0,212,170,0.28)' }}>
                              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {mediaCount}
                            </span>
                          )}
                          {(ann?.mistakes ?? []).length > 0 && (
                            <span title={ann.mistakes.join(', ')} className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.08)', color: '#f87171', border: isDark ? 'none' : '1px solid rgba(239,68,68,0.28)' }}>
                              {ann.mistakes.length} err
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Detail link */}
                      <td className="px-4 py-3">
                        {t.tradeUid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold transition-all opacity-40 group-hover:opacity-100"
                            style={{ color: 'var(--dash-text-faint)' }}>
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </span>
                        ) : null}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--dash-text-faint)' }}>
                Showing {filtered.length} of {trades.length} trade{trades.length !== 1 ? 's' : ''}
              </p>
              {filtered.length !== trades.length && (
                <button type="button" onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-accent/10"
                  style={{ color: '#00d4aa' }}>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Clear filters
                </button>
              )}
            </div>
            {trades.length >= 200 && (
              <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>Max 200 trades loaded</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
