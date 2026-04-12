import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Line, ComposedChart,
} from 'recharts';
import { EmptyState, SkeletonBlock } from '../common/LoadingSkeleton';
import { useDashboardTheme } from '../../context/DashboardThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import DashboardPageBanner from './DashboardPageBanner';
import { staggerContainer, staggerItem } from './dashboardMotion';
import { fetchJournalStats, fetchUnifiedTrades, fetchBehaviorTags } from '../../api/tradesApi';
import { journalPeriodBadgeLabel, journalPeriodSubtitle } from '../../lib/planLimits';
import { WeeklySummaryCard, MonthlySummaryCard, ShareModal } from '../share/ShareableCards';

// ─── helpers ───────────────────────────────────────────────────────────────────
function fmt$(v, currency = 'USD') {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, signDisplay: 'exceptZero', maximumFractionDigits: 2 }).format(n);
}
function fmtPct(v) { return Number.isFinite(Number(v)) ? `${Number(v).toFixed(1)}%` : '—'; }
function fmtDuration(sec) {
  if (!sec || !Number.isFinite(sec)) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
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

// ─── Chart theme hook ─────────────────────────────────────────────────────────
function useChartStyles() {
  const { isDark } = useDashboardTheme();
  return {
    tooltipStyle: isDark
      ? { backgroundColor: 'rgba(13,15,20,0.97)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '8px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }
      : { backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    axisColor: isDark ? '#4a5568' : '#94a3b8',
    gridColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
      className="group relative overflow-hidden rounded-2xl border p-4 transition-shadow hover:shadow-lg"
      style={{ borderColor: color + '20', backgroundColor: color + '06', boxShadow: 'var(--dash-shadow-card)' }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-60" style={{ backgroundColor: color }} />
      <div className="relative flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: color + '90' }}>{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: color + '15', color }}>
          {icon}
        </div>
      </div>
      <p className="relative text-2xl font-display font-black tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="relative mt-1 text-[11px] font-medium" style={{ color: 'var(--dash-text-faint)' }}>{sub}</p>}
    </motion.div>
  );
}

// ─── Full Monthly P&L Calendar ────────────────────────────────────────────────
function FullPnlCalendar({ calendarData, trades }) {
  const { isDark } = useDashboardTheme();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const calMap = useMemo(() => {
    const m = new Map();
    for (const c of (calendarData || [])) m.set(c.date, c.pnl);
    return m;
  }, [calendarData]);

  const tradesByDate = useMemo(() => {
    const m = new Map();
    for (const t of (trades || [])) {
      const d = (t.closedAt || t.openedAt || '').slice(0, 10);
      if (!d) continue;
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(t);
    }
    return m;
  }, [trades]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString(undefined, { month: 'long' });
  const yearStr = String(year);

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const prevMonthLast = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = startDow - 1; i >= 0; i--) cells.push({ day: prevMonthLast - i, iso: null, pnl: null, tradeCount: 0, outside: true });
    for (let d = 1; d <= totalDays; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso, pnl: calMap.get(iso) ?? null, tradeCount: tradesByDate.get(iso)?.length ?? 0, outside: false });
    }
    let nextD = 1;
    while (cells.length % 7 !== 0) cells.push({ day: nextD++, iso: null, pnl: null, tradeCount: 0, outside: true });

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [year, month, calMap, tradesByDate]);

  const monthSummary = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let totalPnl = 0, greenDays = 0, redDays = 0, totalTrades = 0, bestDay = 0, worstDay = 0;
    for (const [date, pnl] of calMap) {
      if (date.startsWith(prefix)) {
        totalPnl += pnl;
        if (pnl > 0) greenDays++;
        if (pnl < 0) redDays++;
        if (pnl > bestDay) bestDay = pnl;
        if (pnl < worstDay) worstDay = pnl;
        totalTrades += tradesByDate.get(date)?.length ?? 0;
      }
    }
    return { totalPnl, greenDays, redDays, totalTrades, bestDay, worstDay };
  }, [year, month, calMap, tradesByDate]);

  const selectedTrades = selectedDate ? (tradesByDate.get(selectedDate) || []) : [];
  const selectedPnl = selectedDate ? (calMap.get(selectedDate) ?? null) : null;
  const todayIso = new Date().toISOString().slice(0, 10);

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); setSelectedDate(null); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); setSelectedDate(null); }
  function goToday() { setViewDate(new Date()); setSelectedDate(todayIso); }

  const pnlGradient = (pnl) => {
    if (pnl === null) return undefined;
    if (pnl > 0) return isDark
      ? 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.06) 100%)'
      : 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.03) 100%)';
    return isDark
      ? 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.06) 100%)'
      : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.03) 100%)';
  };

  const pnlBorder = (pnl) => {
    if (pnl === null) return 'var(--dash-border)';
    return pnl > 0
      ? (isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)')
      : (isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)');
  };

  return (
    <div className="space-y-5">
      {/* ── Month header card ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border p-6" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-20" style={{ backgroundColor: monthSummary.totalPnl >= 0 ? '#22c55e' : '#ef4444' }} />

        <div className="relative flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={prevMonth} className="flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:border-accent/30 hover:shadow-sm active:scale-95" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
              <svg className="h-4 w-4" style={{ color: 'var(--dash-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center min-w-[200px]">
              <h2 className="text-2xl font-display font-black tracking-tight" style={{ color: 'var(--dash-text-primary)' }}>{monthName}</h2>
              <p className="text-xs font-semibold" style={{ color: 'var(--dash-text-faint)' }}>{yearStr}</p>
            </div>
            <button type="button" onClick={nextMonth} className="flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:border-accent/30 hover:shadow-sm active:scale-95" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
              <svg className="h-4 w-4" style={{ color: 'var(--dash-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={goToday} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[11px] font-bold transition-all hover:border-accent/30 hover:text-accent active:scale-95" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Today
            </button>
          </div>
        </div>

        {/* Month summary strip */}
        <div className="relative grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: 'Month P&L', value: fmt$(monthSummary.totalPnl), color: monthSummary.totalPnl >= 0 ? '#22c55e' : '#ef4444', big: true },
            { label: 'Green Days', value: String(monthSummary.greenDays), color: '#22c55e' },
            { label: 'Red Days', value: String(monthSummary.redDays), color: '#ef4444' },
            { label: 'Trades', value: String(monthSummary.totalTrades), color: '#00d4aa' },
            { label: 'Best Day', value: monthSummary.bestDay > 0 ? fmt$(monthSummary.bestDay) : '—', color: '#22c55e' },
            { label: 'Worst Day', value: monthSummary.worstDay < 0 ? fmt$(monthSummary.worstDay) : '—', color: '#ef4444' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl px-3 py-2.5 ${s.big ? 'ring-1' : ''}`}
              style={{ backgroundColor: s.color + '08', borderColor: s.color + '20', ...(s.big ? { ringColor: s.color + '25' } : {}) }}>
              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: s.color + '80' }}>{s.label}</p>
              <p className={`mt-0.5 font-black ${s.big ? 'text-lg' : 'text-base'}`} style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Calendar grid ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--dash-border)' }}>
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
            <div key={d} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--dash-text-faint)' }}>
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        {calendarGrid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7" style={{ borderBottom: wi < calendarGrid.length - 1 ? '1px solid var(--dash-border)' : 'none' }}>
            {week.map((cell, ci) => {
              const isToday = cell.iso === todayIso;
              const isSelected = cell.iso === selectedDate;
              const hasPnl = cell.pnl !== null;
              const isGreen = cell.pnl > 0;
              const isWeekend = ci >= 5;

              return (
                <button
                  key={ci}
                  type="button"
                  disabled={cell.outside}
                  onClick={() => cell.iso && setSelectedDate(isSelected ? null : cell.iso)}
                  className={`relative min-h-[80px] sm:min-h-[100px] p-2 text-left transition-all ${cell.outside ? 'opacity-30 cursor-default' : 'cursor-pointer hover:z-10'} ${!cell.outside && !isSelected ? 'hover:shadow-md hover:-translate-y-px' : ''}`}
                  style={{
                    borderRight: ci < 6 ? '1px solid var(--dash-border)' : 'none',
                    background: isSelected ? 'rgba(0,212,170,0.1)' : hasPnl ? pnlGradient(cell.pnl) : (isWeekend && !cell.outside ? (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)') : 'transparent'),
                    boxShadow: isSelected ? 'inset 0 0 0 2px rgba(0,212,170,0.5)' : isToday ? 'inset 0 0 0 2px rgba(0,212,170,0.25)' : 'none',
                  }}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[12px] font-bold ${isToday ? 'bg-accent text-white' : ''}`}
                      style={isToday ? undefined : { color: cell.outside ? 'var(--dash-text-faint)' : 'var(--dash-text-primary)' }}
                    >
                      {cell.day}
                    </span>
                    {cell.tradeCount > 0 && !cell.outside && (
                      <span className="rounded-md px-1.5 py-0.5 text-[8px] font-bold" style={{ backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-faint)' }}>
                        {cell.tradeCount}
                      </span>
                    )}
                  </div>

                  {/* P&L value */}
                  {hasPnl && !cell.outside && (
                    <div className="mt-auto">
                      <p className={`text-[13px] sm:text-sm font-black ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt$(cell.pnl)}
                      </p>
                      {/* mini bar indicator */}
                      <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${Math.min(100, (Math.abs(cell.pnl) / Math.max(1, Math.abs(monthSummary.bestDay), Math.abs(monthSummary.worstDay))) * 100)}%`,
                          backgroundColor: isGreen ? '#22c55e' : '#ef4444',
                        }} />
                      </div>
                    </div>
                  )}

                  {/* No-trade dot */}
                  {!hasPnl && cell.tradeCount > 0 && !cell.outside && (
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: Math.min(cell.tradeCount, 4) }).map((_, i) => (
                        <div key={i} className="h-1.5 w-1.5 rounded-full bg-accent/40" />
                      ))}
                    </div>
                  )}

                  {/* Selected indicator */}
                  {isSelected && (
                    <motion.div
                      layoutId="calendarSelected"
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Selected day detail ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: selectedPnl != null ? (selectedPnl >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
          >
            {/* Day header */}
            <div className="relative overflow-hidden px-6 py-5" style={{ borderBottom: '1px solid var(--dash-border)' }}>
              {selectedPnl != null && (
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl opacity-20" style={{ backgroundColor: selectedPnl >= 0 ? '#22c55e' : '#ef4444' }} />
              )}
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--dash-text-faint)' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' })}
                  </p>
                  <h4 className="text-lg font-display font-black mt-0.5" style={{ color: 'var(--dash-text-primary)' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-bold" style={{ color: 'var(--dash-text-faint)' }}>{selectedTrades.length} trade{selectedTrades.length !== 1 ? 's' : ''}</span>
                    {selectedTrades.length > 0 && (
                      <>
                        <span className="text-[10px] font-bold text-emerald-400">{selectedTrades.filter((t) => Number(t.pnl) > 0).length}W</span>
                        <span className="text-[10px] font-bold text-red-400">{selectedTrades.filter((t) => Number(t.pnl) < 0).length}L</span>
                      </>
                    )}
                  </div>
                </div>
                {selectedPnl !== null && (
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: selectedPnl >= 0 ? '#22c55e80' : '#ef444480' }}>Day P&L</p>
                    <p className={`text-2xl font-display font-black ${selectedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(selectedPnl)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trade rows */}
            {selectedTrades.length > 0 ? (
              <div>
                {selectedTrades.map((t, i) => {
                  const pnl = Number(t.pnl);
                  const isWin = pnl > 0;
                  const side = (t.side || '').toLowerCase();
                  const isLong = side === 'buy' || side === 'long';
                  const isClosed = String(t.status || '').toUpperCase() === 'CLOSED';
                  return (
                    <Link
                      key={t.tradeUid || t.id || i}
                      to={`/dashboard/trades/${encodeURIComponent(t.tradeUid || t.id)}`}
                      className="group flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-[var(--dash-bg-card-hover)]"
                      style={{ borderBottom: i < selectedTrades.length - 1 ? '1px solid var(--dash-border)' : 'none' }}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black ring-1 ${isLong ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/15' : 'bg-red-500/10 text-red-400 ring-red-500/15'}`}>
                        {isLong ? 'L' : 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>{t.symbol || 'Unknown'}</p>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${isClosed ? 'bg-slate-500/10 text-slate-400' : 'bg-amber-500/10 text-amber-400'}`}>{t.status}</span>
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--dash-text-faint)' }}>
                          {t.openedAt ? new Date(t.openedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {t.closedAt ? ` → ${new Date(t.closedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ' — still open'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-black tabular-nums ${Number.isFinite(pnl) && isClosed ? (isWin ? 'text-emerald-400' : 'text-red-400') : ''}`} style={!(Number.isFinite(pnl) && isClosed) ? { color: 'var(--dash-text-faint)' } : undefined}>
                          {Number.isFinite(pnl) && isClosed ? fmt$(pnl) : 'OPEN'}
                        </span>
                        <svg className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'var(--dash-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                  <svg className="h-5 w-5" style={{ color: 'var(--dash-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                </div>
                <p className="text-xs font-semibold" style={{ color: 'var(--dash-text-faint)' }}>No trades on this day</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--dash-text-faint)' }}>Rest day or no activity recorded</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Behavior Pattern Tab ─────────────────────────────────────────────────────
const BT_SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#facc15', LOW: '#94a3b8', POSITIVE: '#22c55e' };
const BT_SEVERITY_BG = { CRITICAL: 'rgba(239,68,68,0.08)', HIGH: 'rgba(249,115,22,0.08)', MEDIUM: 'rgba(250,204,21,0.06)', LOW: 'rgba(148,163,184,0.06)', POSITIVE: 'rgba(34,197,94,0.06)' };
const BT_SEVERITY_BORDER = { CRITICAL: 'rgba(239,68,68,0.20)', HIGH: 'rgba(249,115,22,0.18)', MEDIUM: 'rgba(250,204,21,0.15)', LOW: 'rgba(148,163,184,0.12)', POSITIVE: 'rgba(34,197,94,0.15)' };

function BehaviorScoreRing({ score, size = 112, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--dash-border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke + 1}
          strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{pct}</span>
        <span className="text-[9px] font-bold" style={{ color: 'var(--dash-text-faint)' }}>/ 100</span>
      </div>
    </div>
  );
}

function BehaviorPatternTab({ effectiveStats, advanced, ov, recentTrades, tooltipStyle, axisColor, gridColor, behaviorData, behaviorLoading }) {
  const closedTrades = useMemo(() =>
    recentTrades.filter((t) => String(t.status || '').toUpperCase() === 'CLOSED' && t.pnl != null),
    [recentTrades]
  );

  const ds = behaviorData?.disciplineScore;
  const tags = behaviorData?.behaviorTags ?? [];

  const streakData = useMemo(() => {
    let currentWin = 0, currentLoss = 0, bestWin = 0, worstLoss = 0;
    const streaks = [];
    for (const t of closedTrades.sort((a, b) => new Date(a.closedAt || a.openedAt) - new Date(b.closedAt || b.openedAt))) {
      const w = Number(t.pnl) > 0;
      if (w) { currentWin++; currentLoss = 0; bestWin = Math.max(bestWin, currentWin); }
      else { currentLoss++; currentWin = 0; worstLoss = Math.max(worstLoss, currentLoss); }
      streaks.push({ symbol: t.symbol, pnl: Number(t.pnl), w });
    }
    return { bestWin, worstLoss, last20: streaks.slice(-20) };
  }, [closedTrades]);

  const hourData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i}:00`, count: 0, pnl: 0, wins: 0 }));
    for (const t of closedTrades) {
      const h = new Date(t.openedAt || t.closedAt).getHours();
      if (h >= 0 && h < 24) {
        hours[h].count++;
        hours[h].pnl += Number(t.pnl) || 0;
        if (Number(t.pnl) > 0) hours[h].wins++;
      }
    }
    return hours.filter((h) => h.count > 0);
  }, [closedTrades]);

  const negativeTags = tags.filter((t) => t.severity !== 'POSITIVE');
  const positiveTags = tags.filter((t) => t.severity === 'POSITIVE');

  return (
    <div className="space-y-5">
      {/* ── 3-Pillar Discipline Score + Streak ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border p-6 flex flex-col items-center justify-center text-center" style={{ borderColor: (ds ? (ds.overall >= 80 ? '#22c55e' : ds.overall >= 50 ? '#f59e0b' : '#ef4444') : 'var(--dash-border)') + '25', backgroundColor: (ds ? (ds.overall >= 80 ? '#22c55e' : ds.overall >= 50 ? '#f59e0b' : '#ef4444') : '#94a3b8') + '06' }}>
          {behaviorLoading ? (
            <div className="h-28 w-28 rounded-full animate-pulse" style={{ backgroundColor: 'var(--dash-bg-card)' }} />
          ) : ds ? (
            <>
              <BehaviorScoreRing score={ds.overall} />
              <p className="mt-3 text-xs font-bold uppercase tracking-widest" style={{ color: ds.overall >= 80 ? '#22c55e' : ds.overall >= 50 ? '#f59e0b' : '#ef4444' }}>
                {ds.overall >= 80 ? 'Excellent' : ds.overall >= 50 ? 'Needs Work' : 'Poor'}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--dash-text-faint)' }}>
                Avg Discipline ({behaviorData?.tradeCount ?? 0} trades)
              </p>
              {/* 3-pillar breakdown */}
              <div className="mt-4 w-full space-y-2">
                {[
                  { label: 'Risk', score: ds.breakdown?.riskDiscipline?.score ?? 0, color: '#ef4444' },
                  { label: 'Execution', score: ds.breakdown?.executionDiscipline?.score ?? 0, color: '#f59e0b' },
                  { label: 'Emotional', score: ds.breakdown?.emotionalDiscipline?.score ?? 0, color: '#8b5cf6' },
                ].map((p) => (
                  <div key={p.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-bold" style={{ color: 'var(--dash-text-faint)' }}>{p.label}</span>
                      <span className="text-[10px] font-black" style={{ color: p.score >= 80 ? '#22c55e' : p.score >= 50 ? '#f59e0b' : '#ef4444' }}>{p.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p.score}%` }} transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full" style={{ backgroundColor: p.score >= 80 ? '#22c55e' : p.score >= 50 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--dash-text-faint)' }}>No score data yet</p>
          )}
        </div>

        {/* Streak visual */}
        <div className="sm:col-span-2 rounded-2xl border p-5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--dash-text-secondary)' }}>Win/Loss Streak</h3>
            <div className="flex gap-3">
              <span className="text-[10px] font-bold text-emerald-400">Best: {streakData.bestWin}W</span>
              <span className="text-[10px] font-bold text-red-400">Worst: {streakData.worstLoss}L</span>
            </div>
          </div>
          <div className="flex gap-[3px] flex-wrap">
            {streakData.last20.map((s, i) => (
              <div key={i} className="h-7 w-7 rounded-md flex items-center justify-center text-[8px] font-bold transition-transform hover:scale-125"
                style={{ backgroundColor: s.w ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: s.w ? '#4ade80' : '#f87171' }}
                title={`${s.symbol}: ${fmt$(s.pnl)}`}
              >
                {s.w ? 'W' : 'L'}
              </div>
            ))}
            {streakData.last20.length === 0 && <p className="text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>Close trades to see streak data.</p>}
          </div>
          <p className="mt-2 text-[9px]" style={{ color: 'var(--dash-text-faint)' }}>Last {streakData.last20.length} trades (hover for details)</p>
        </div>
      </div>

      {/* ── Behavior Identity Tags ── */}
      {behaviorLoading ? (
        <div className="rounded-2xl border p-5 animate-pulse" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <div className="h-6 w-48 rounded mb-4" style={{ backgroundColor: 'var(--dash-bg-card)' }} />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl" style={{ backgroundColor: 'var(--dash-bg-card)' }} />)}
          </div>
        </div>
      ) : tags.length > 0 ? (
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              <h3 className="text-sm font-bold" style={{ color: 'var(--dash-text-secondary)' }}>Behavior Identity</h3>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--dash-text-faint)' }}>
              Cross-trade patterns detected in your last {behaviorData?.tradeCount ?? 0} trades
            </p>
          </div>

          {/* Negative tags */}
          {negativeTags.length > 0 && (
            <div className="space-y-2.5 mb-4">
              {negativeTags.map((bt) => {
                const tagColor = BT_SEVERITY_COLORS[bt.severity] || '#94a3b8';
                const tagBg = BT_SEVERITY_BG[bt.severity] || BT_SEVERITY_BG.LOW;
                const tagBorder = BT_SEVERITY_BORDER[bt.severity] || BT_SEVERITY_BORDER.LOW;
                return (
                  <div key={bt.tag} className="rounded-xl border p-3.5" style={{ borderColor: tagBorder, backgroundColor: tagBg }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider" style={{ backgroundColor: tagColor + '18', color: tagColor, border: `1px solid ${tagColor}30` }}>
                          {bt.tag.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: tagColor }}>{bt.severity}</span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--dash-text-faint)' }}>
                        {bt.matchCount}/{bt.tradeCount} trades
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>{bt.description}</p>
                    {/* Confidence bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round(bt.confidence * 100)}%`, backgroundColor: tagColor }} />
                      </div>
                      <span className="text-[9px] font-bold" style={{ color: tagColor }}>{Math.round(bt.confidence * 100)}%</span>
                    </div>
                    <p className="mt-1 text-[10px] italic" style={{ color: 'var(--dash-text-faint)' }}>{bt.evidence}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Positive tags */}
          {positiveTags.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#22c55e' }}>Strengths</p>
              {positiveTags.map((bt) => (
                <div key={bt.tag} className="rounded-xl border p-3.5" style={{ borderColor: BT_SEVERITY_BORDER.POSITIVE, backgroundColor: BT_SEVERITY_BG.POSITIVE }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider" style={{ backgroundColor: 'rgba(34,197,94,0.18)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.30)' }}>
                        {bt.tag.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--dash-text-faint)' }}>
                      {bt.matchCount}/{bt.tradeCount} trades
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>{bt.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round(bt.confidence * 100)}%`, backgroundColor: '#22c55e' }} />
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: '#22c55e' }}>{Math.round(bt.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <p className="text-xs" style={{ color: 'var(--dash-text-faint)' }}>Need more trades to detect behavior patterns.</p>
        </div>
      )}

      {/* ── 2-column: DOW + By Hour ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--dash-text-secondary)' }}>Performance by Day</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={effectiveStats?.byDayOfWeek ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="day" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, _, p) => [fmt$(v), `${p.payload.count} trades`]} />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {(effectiveStats?.byDayOfWeek ?? []).map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--dash-text-secondary)' }}>Performance by Hour</h3>
          {hourData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" stroke={axisColor} fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisColor} fontSize={9} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, _, p) => [fmt$(v), `${p.payload.count} trades`]} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {hourData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#00d4aa' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--dash-text-faint)' }}>Close trades to see hourly patterns.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Symbol breakdown ── */}
      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--dash-text-secondary)' }}>Performance by Symbol</h3>
        <div className="space-y-3">
          {(effectiveStats?.bySymbol ?? []).slice(0, 8).map((s) => {
            const maxPnl = Math.abs(effectiveStats?.bySymbol?.[0]?.pnl || 1);
            return (
              <div key={s.symbol} className="flex items-center gap-3">
                <span className="w-20 shrink-0 font-mono text-xs font-bold" style={{ color: 'var(--dash-text-primary)' }}>{s.symbol}</span>
                <div className="relative flex-1 h-7 overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                  <div className="absolute inset-y-0 left-0 rounded-lg transition-all" style={{ width: `${Math.min(100, (Math.abs(s.pnl) / maxPnl) * 100)}%`, backgroundColor: s.pnl >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }} />
                  <div className="absolute inset-y-0 left-3 flex items-center">
                    <span className="text-[11px] font-bold" style={{ color: s.pnl >= 0 ? '#4ade80' : '#f87171' }}>{fmt$(s.pnl)}</span>
                  </div>
                </div>
                <div className="w-16 text-right shrink-0">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--dash-text-muted)' }}>{s.count} trades</span>
                </div>
                <div className="w-12 text-right shrink-0">
                  <span className="text-[10px] font-bold" style={{ color: s.winRate >= 50 ? '#4ade80' : '#f87171' }}>{s.winRate}%</span>
                </div>
              </div>
            );
          })}
          {(effectiveStats?.bySymbol ?? []).length === 0 && <p className="text-xs" style={{ color: 'var(--dash-text-faint)' }}>No closed trades yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TradeJournal() {
  const { session, user } = useAuth();
  const { accounts, accountsLoading, selectedTradingAccountId } = useTradingAccounts();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(90);
  const [activeTab, setActiveTab] = useState('overview');
  const [shareType, setShareType] = useState(null); // null | 'weekly' | 'monthly'
  const [behaviorData, setBehaviorData] = useState(null);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const shareCardRef = useRef(null);
  const { tooltipStyle, axisColor, gridColor } = useChartStyles();
  const planSlug = user?.plan;

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !selectedTradingAccountId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [statsData, tradesData] = await Promise.all([
        fetchJournalStats({ accessToken: token, tradingAccountId: selectedTradingAccountId, days: period }).catch(() => null),
        fetchUnifiedTrades({ accessToken: token, tradingAccountId: selectedTradingAccountId, limit: 200 }).catch(() => []),
      ]);
      setStats(statsData);
      setRecentTrades((Array.isArray(tradesData) ? tradesData : []).filter(isMeaningfulTradeRow));
    } catch (e) {
      setError(e?.message || 'Could not load journal.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedTradingAccountId, period]);

  useEffect(() => { if (selectedTradingAccountId) load(); }, [selectedTradingAccountId, period, load]);

  // Lazy-load behavior tags when Behavior tab is active
  useEffect(() => {
    if (activeTab !== 'behavior') return;
    const token = session?.access_token;
    if (!token || !selectedTradingAccountId) return;
    if (behaviorData) return;
    let cancelled = false;
    setBehaviorLoading(true);
    fetchBehaviorTags({ accessToken: token, tradingAccountId: selectedTradingAccountId })
      .then((data) => { if (!cancelled) setBehaviorData(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBehaviorLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, session?.access_token, selectedTradingAccountId, behaviorData]);

  const clientStats = useMemo(() => {
    if (stats?.overview) return null;
    if (!recentTrades.length) return null;
    const closed = recentTrades.filter((t) => String(t.status || '').toUpperCase() === 'CLOSED' && t.pnl != null);
    const totalPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wins = closed.filter((t) => Number(t.pnl) > 0);
    const losses = closed.filter((t) => Number(t.pnl) < 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length : 0;
    const pf = Math.abs(avgLoss * losses.length) > 0 ? Math.abs(avgWin * wins.length) / Math.abs(avgLoss * losses.length) : null;
    const holdSecs = closed.filter((t) => t.openedAt && t.closedAt).map((t) => (new Date(t.closedAt) - new Date(t.openedAt)) / 1000);
    const avgHold = holdSecs.length ? holdSecs.reduce((a, b) => a + b, 0) / holdSecs.length : null;
    let bestStreak = 0, worstStreak = 0, cw = 0, cl = 0;
    for (const t of closed) { if (Number(t.pnl) > 0) { cw++; cl = 0; bestStreak = Math.max(bestStreak, cw); } else { cl++; cw = 0; worstStreak = Math.max(worstStreak, cl); } }
    const calMap = new Map();
    for (const t of recentTrades) {
      const d = (t.closedAt || t.openedAt || '').slice(0, 10);
      if (!d) continue;
      calMap.set(d, (calMap.get(d) ?? 0) + (Number(t.pnl) || 0));
    }
    const calendar = [...calMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, pnl]) => ({ date, pnl: Number(pnl.toFixed(4)) }));
    let cum = 0;
    const equityCurve = calendar.map(({ date, pnl }) => { cum += pnl; return { date, cumPnl: Number(cum.toFixed(4)) }; });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowMap = new Map();
    for (const t of closed) { const d = new Date(t.closedAt || t.openedAt)?.getDay(); if (d == null) continue; const p = dowMap.get(d) ?? { count: 0, pnl: 0 }; dowMap.set(d, { count: p.count + 1, pnl: p.pnl + (Number(t.pnl) || 0) }); }
    const byDayOfWeek = dayNames.map((name, i) => ({ day: name, count: dowMap.get(i)?.count ?? 0, pnl: Number((dowMap.get(i)?.pnl ?? 0).toFixed(4)) }));
    const symMap = new Map();
    for (const t of closed) { const sym = t.symbol || 'Unknown'; const p = symMap.get(sym) ?? { count: 0, pnl: 0, wins: 0 }; const pnl = Number(t.pnl) || 0; symMap.set(sym, { count: p.count + 1, pnl: p.pnl + pnl, wins: p.wins + (pnl > 0 ? 1 : 0) }); }
    const bySymbol = [...symMap.entries()].map(([symbol, s]) => ({ symbol, count: s.count, pnl: Number(s.pnl.toFixed(4)), winRate: s.count ? Number(((s.wins / s.count) * 100).toFixed(1)) : 0 })).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
    return {
      overview: { totalTrades: recentTrades.length, closedTrades: closed.length, openTrades: recentTrades.length - closed.length, totalPnl: Number(totalPnl.toFixed(4)), winRate: Number(winRate.toFixed(1)), avgWin: Number(avgWin.toFixed(4)), avgLoss: Number(avgLoss.toFixed(4)), profitFactor: pf != null ? Number(pf.toFixed(2)) : null, avgHoldSeconds: avgHold != null ? Math.round(avgHold) : null, bestStreak, worstStreak },
      calendar, equityCurve, byDayOfWeek, bySymbol, byHour: [], behavior: { totalSlWiden: 0, totalTpPullIn: 0, totalRuleBlocks: 0, avgSlUpdatesPerTrade: 0 },
    };
  }, [stats, recentTrades]);

  const effectiveStats = stats?.overview ? stats : clientStats;
  const ov = effectiveStats?.overview;

  const advanced = useMemo(() => {
    const closed = recentTrades.filter((t) => String(t.status || '').toUpperCase() === 'CLOSED' && t.pnl != null);
    if (!closed.length) return null;
    const wr = (ov?.winRate ?? 0) / 100;
    const expectancy = wr * (ov?.avgWin ?? 0) + (1 - wr) * (ov?.avgLoss ?? 0);
    const pnls = closed.map((t) => Number(t.pnl) || 0);
    const largestWin = Math.max(0, ...pnls);
    const largestLoss = Math.min(0, ...pnls);
    const curve = effectiveStats?.equityCurve ?? [];
    let peak = 0, maxDD = 0;
    const drawdownCurve = curve.map((pt) => {
      const cum = pt.cumPnl ?? 0;
      if (cum > peak) peak = cum;
      const dd = peak > 0 ? ((peak - cum) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
      return { date: pt.date, cumPnl: cum, drawdown: -Number(dd.toFixed(2)) };
    });
    const avgRR = ov?.avgLoss && ov.avgLoss !== 0 ? Math.abs((ov?.avgWin ?? 0) / ov.avgLoss) : null;
    const daySet = new Set(closed.map((t) => (t.closedAt || t.openedAt || '').slice(0, 10)).filter(Boolean));
    const tradesPerDay = daySet.size > 0 ? (closed.length / daySet.size) : 0;
    const byDay = new Map();
    for (const t of [...recentTrades].sort((a, b) => new Date(b.closedAt || b.openedAt || 0) - new Date(a.closedAt || a.openedAt || 0))) {
      const d = (t.closedAt || t.openedAt || '').slice(0, 10);
      if (!d) continue;
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(t);
    }
    const dailyRecap = [...byDay.entries()].slice(0, 7).map(([date, trades]) => {
      const dayPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
      const dayWins = trades.filter((t) => Number(t.pnl) > 0).length;
      return { date, trades, pnl: dayPnl, wins: dayWins, total: trades.length };
    });
    return { expectancy: Number(expectancy.toFixed(2)), largestWin, largestLoss, maxDD: Number(maxDD.toFixed(2)), drawdownCurve, avgRR: avgRR != null ? Number(avgRR.toFixed(2)) : null, tradesPerDay: Number(tradesPerDay.toFixed(1)), dailyRecap };
  }, [recentTrades, ov, effectiveStats]);

  const kpiCards = useMemo(() => [
    { label: 'Total P&L', value: fmt$(ov?.totalPnl), sub: `${ov?.closedTrades ?? 0} closed trades`, color: '#00d4aa', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
    { label: 'Win Rate', value: fmtPct(ov?.winRate), sub: `Best streak ${ov?.bestStreak ?? 0}W`, color: '#22c55e', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: 'Profit Factor', value: ov?.profitFactor != null ? `${ov.profitFactor}x` : '—', sub: `Avg win ${fmt$(ov?.avgWin)}`, color: '#60a5fa', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { label: 'Expectancy', value: advanced?.expectancy != null ? fmt$(advanced.expectancy) : '—', sub: 'Avg $ per trade', color: '#06b6d4', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
    { label: 'Max Drawdown', value: advanced?.maxDD != null ? `${advanced.maxDD}%` : '—', sub: `Worst streak ${ov?.worstStreak ?? 0}L`, color: '#ef4444', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg> },
    { label: 'Avg RR', value: advanced?.avgRR != null ? `${advanced.avgRR}:1` : '—', sub: 'Win/Loss ratio', color: '#8b5cf6', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg> },
    { label: 'Avg Hold', value: fmtDuration(ov?.avgHoldSeconds), sub: `${advanced?.tradesPerDay ?? '—'} trades/day`, color: '#f59e0b', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: 'Discipline', value: (() => { if (behaviorData?.disciplineScore) return `${behaviorData.disciplineScore.overall}/100`; const slW = effectiveStats?.behavior?.totalSlWiden ?? 0; const rb = effectiveStats?.behavior?.totalRuleBlocks ?? 0; return `${Math.max(0, 100 - slW * 20 - rb * 15)}/100`; })(), sub: behaviorData?.disciplineScore ? 'Avg across recent trades' : `${effectiveStats?.behavior?.totalRuleBlocks ?? 0} rule blocks`, color: '#f87171', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
  ], [ov, effectiveStats, advanced]);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
    { id: 'pnl', label: 'P&L Calendar', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'behavior', label: 'Behavior', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  ];

  const { weekTrades, weekLabel, weekRange, monthTrades, monthLabel } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const wt = recentTrades.filter((t) => {
      const d = new Date(t.closedAt || t.openedAt);
      return d >= startOfWeek && d <= endOfWeek;
    });
    const mt = recentTrades.filter((t) => {
      const d = new Date(t.closedAt || t.openedAt);
      return d >= startOfMonth && d <= endOfMonth;
    });

    const wl = `Week of ${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    const wr = `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const ml = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    return { weekTrades: wt, weekLabel: wl, weekRange: wr, monthTrades: mt, monthLabel: ml };
  }, [recentTrades]);

  if (loading || accountsLoading) {
    return (
      <div className="max-w-7xl space-y-5">
        <SkeletonBlock className="h-14 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <SkeletonBlock key={i} className="h-24 w-full" />)}
        </div>
        <SkeletonBlock className="h-60 w-full" />
      </div>
    );
  }

  if (!accountsLoading && accounts.length === 0) {
    return (
      <div className="max-w-7xl">
        <DashboardPageBanner accent="cyan" title="Trade Journal" subtitle={journalPeriodSubtitle(planSlug)} />
        <EmptyState title="Add a trading account" description="Create a trading account to start journaling trades." action={<Link to="/dashboard/account/trading" className="inline-flex items-center px-4 py-2 rounded-xl bg-accent text-surface-950 font-semibold text-sm">Trading accounts</Link>} />
      </div>
    );
  }

  const hasData = (ov?.totalTrades ?? 0) > 0 || recentTrades.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl space-y-5">
      <DashboardPageBanner
        accent="cyan"
        title="Trade Journal"
        subtitle={journalPeriodSubtitle(planSlug)}
        badge={<span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">{journalPeriodBadgeLabel(planSlug)}</span>}
        actions={(
          <div className="flex items-center gap-2">
            {[30, 90, 180].map((d) => (
              <button key={d} type="button" onClick={() => setPeriod(d)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{ borderColor: period === d ? 'rgba(0,212,170,0.4)' : 'var(--dash-border)', backgroundColor: period === d ? 'rgba(0,212,170,0.1)' : 'transparent', color: period === d ? '#00d4aa' : 'var(--dash-text-muted)' }}>
                {d}d
              </button>
            ))}
            <Link to="/dashboard/trades" className="group inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:border-accent/25"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-secondary)' }}>
              All Trades
              <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
        )}
      />

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border p-1.5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className="relative shrink-0 flex items-center gap-2 rounded-xl px-5 py-3 text-[12px] font-bold transition-all"
            style={{ color: activeTab === t.id ? '#00d4aa' : 'var(--dash-text-muted)' }}>
            {activeTab === t.id && (
              <motion.div layoutId="journalActiveTab" className="absolute inset-0 rounded-xl"
                style={{ backgroundColor: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)', boxShadow: '0 1px 4px rgba(0,212,170,0.08)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            )}
            <span className="relative">{t.icon}</span>
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-amber-400">{error}</p>}

      {!hasData && !error ? (
        <EmptyState
          title="No trades in this window"
          description="Pair the TradeGuardX extension with your broker and start trading — records appear here automatically."
          action={(
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/dashboard/install-extension" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-surface-950 font-semibold text-sm">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Install Extension
              </Link>
              <Link to="/dashboard/account/trading" className="inline-flex items-center px-4 py-2 rounded-xl border text-sm font-semibold" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>Trading Accounts</Link>
            </div>
          )}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>

            {/* ─── OVERVIEW TAB ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* KPI grid */}
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {kpiCards.map((c) => <StatCard key={c.label} {...c} />)}
                </motion.div>

                {/* Equity curve */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-display font-bold" style={{ color: 'var(--dash-text-secondary)' }}>Equity Curve</h3>
                      <p className="mt-0.5 text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>Cumulative P&L over time</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-display font-bold ${(ov?.totalPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(ov?.totalPnl)}</span>
                      <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{ov?.closedTrades ?? 0} trades</p>
                    </div>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={effectiveStats?.equityCurve ?? []}>
                        <defs>
                          <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#00d4aa" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis dataKey="date" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v?.slice(5)} />
                        <YAxis stroke={axisColor} fontSize={10} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} width={55} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt$(v), 'Cumulative P&L']} labelFormatter={(l) => `Date: ${l}`} />
                        <Area type="monotone" dataKey="cumPnl" stroke="#00d4aa" strokeWidth={2.5} fill="url(#cumGrad)" dot={false} activeDot={{ r: 5, stroke: 'var(--dash-bg)', strokeWidth: 2, fill: '#00d4aa' }} />
                        <Line type="monotone" dataKey="cumPnl" stroke="transparent" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Drawdown */}
                {advanced?.drawdownCurve?.length > 1 && (
                  <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(239,68,68,0.15)', backgroundColor: 'rgba(239,68,68,0.03)' }}>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-display font-bold" style={{ color: 'var(--dash-text-secondary)' }}>Drawdown</h3>
                        <p className="mt-0.5 text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>Peak-to-trough decline</p>
                      </div>
                      <span className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400">Max DD: {advanced.maxDD}%</span>
                    </div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={advanced.drawdownCurve}>
                          <defs>
                            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.02} />
                              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                          <XAxis dataKey="date" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v?.slice(5)} />
                          <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={45} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Math.abs(v)}%`, 'Drawdown']} labelFormatter={(l) => `Date: ${l}`} />
                          <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Largest Win/Loss */}
                {advanced && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="group relative overflow-hidden flex items-center justify-between rounded-2xl border p-4" style={{ borderColor: 'rgba(34,197,94,0.2)', backgroundColor: 'rgba(34,197,94,0.04)' }}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#22c55e90' }}>Largest Win</p>
                        <p className="mt-1.5 text-xl font-black text-emerald-400">{fmt$(advanced.largestWin)}</p>
                      </div>
                      <div className="h-11 w-11 rounded-xl bg-emerald-500/12 flex items-center justify-center ring-1 ring-emerald-500/15">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      </div>
                    </div>
                    <div className="group relative overflow-hidden flex items-center justify-between rounded-2xl border p-4" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ef444490' }}>Largest Loss</p>
                        <p className="mt-1.5 text-xl font-black text-red-400">{fmt$(advanced.largestLoss)}</p>
                      </div>
                      <div className="h-11 w-11 rounded-xl bg-red-500/12 flex items-center justify-center ring-1 ring-red-500/15">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Win/Loss donut + Recent trades */}
                <div className="grid gap-5 lg:grid-cols-3">
                  <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--dash-text-secondary)' }}>Win / Loss</h3>
                    <div className="flex items-center">
                      <div className="relative w-[120px] shrink-0">
                        <ResponsiveContainer width="100%" height={120}>
                          <PieChart>
                            <Pie data={[{ name: 'Wins', value: ov?.winRate ?? 0 }, { name: 'Losses', value: 100 - (ov?.winRate ?? 0) }]}
                              cx="50%" cy="50%" innerRadius={38} outerRadius={54} paddingAngle={4} dataKey="value" strokeWidth={0}>
                              <Cell fill="#22c55e" />
                              <Cell fill="#ef4444" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-black" style={{ color: 'var(--dash-text-primary)' }}>{fmtPct(ov?.winRate)}</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2.5 pl-3">
                        {[
                          { label: 'Win Rate', value: fmtPct(ov?.winRate), color: '#22c55e', dot: true },
                          { label: 'Avg Win', value: fmt$(ov?.avgWin), color: '#4ade80' },
                          { label: 'Avg Loss', value: fmt$(ov?.avgLoss), color: '#ef4444', dot: true },
                          { label: 'Profit Factor', value: ov?.profitFactor != null ? `${ov.profitFactor}x` : '—', color: '#60a5fa' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {item.dot && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />}
                              <span className="text-[11px] font-medium" style={{ color: 'var(--dash-text-faint)' }}>{item.label}</span>
                            </div>
                            <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Daily recap compact */}
                  <div className="lg:col-span-2 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
                    <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--dash-border)' }}>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--dash-text-secondary)' }}>Recent Days</h3>
                      <button type="button" onClick={() => setActiveTab('pnl')} className="text-[11px] font-bold text-accent hover:underline">Full Calendar →</button>
                    </div>
                    {(advanced?.dailyRecap ?? []).slice(0, 5).map((day, idx) => {
                      const isGreen = day.pnl >= 0;
                      const d = new Date(day.date + 'T12:00:00');
                      return (
                        <div key={day.date} className="flex items-center gap-3 px-5 py-2.5"
                          style={{ borderBottom: idx < Math.min(4, (advanced?.dailyRecap?.length ?? 0) - 1) ? '1px solid var(--dash-border)' : 'none' }}>
                          <span className="w-16 shrink-0 text-xs font-bold" style={{ color: 'var(--dash-text-primary)' }}>{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--dash-text-faint)' }}>{day.total} trade{day.total !== 1 ? 's' : ''}</span>
                          <span className="text-[10px] font-bold text-emerald-400">{day.wins}W</span>
                          <span className="text-[10px] font-bold text-red-400">{day.total - day.wins}L</span>
                          <span className="flex-1" />
                          <span className={`text-sm font-black ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(day.pnl)}</span>
                        </div>
                      );
                    })}
                    {(!advanced?.dailyRecap || advanced.dailyRecap.length === 0) && (
                      <div className="px-5 py-4 text-center"><p className="text-xs" style={{ color: 'var(--dash-text-faint)' }}>No daily data yet.</p></div>
                    )}
                  </div>
                </div>

                {/* Share your performance */}
                <div className="relative overflow-hidden rounded-2xl border p-6" style={{ borderColor: 'rgba(0,212,170,0.15)', background: 'linear-gradient(135deg, rgba(0,212,170,0.06) 0%, rgba(139,92,246,0.04) 100%)' }}>
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>Share Your Performance</h3>
                    </div>
                    <p className="text-xs leading-relaxed max-w-lg mb-4" style={{ color: 'var(--dash-text-muted)' }}>
                      Generate beautiful shareable cards of your weekly or monthly trading performance. Download as PNG and share on social media.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setShareType('weekly')}
                        className="group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all active:scale-[0.97]"
                        style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.08))', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.2)' }}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Weekly Card
                      </button>
                      <button type="button" onClick={() => setShareType('monthly')}
                        className="group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all active:scale-[0.97]"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.08))', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Monthly Card
                      </button>
                      <Link to="/dashboard/trades" className="group inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all hover:border-accent/25"
                        style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}>
                        Explore Trades
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── P&L CALENDAR TAB ────────────────────────────────────── */}
            {activeTab === 'pnl' && (
              <FullPnlCalendar calendarData={effectiveStats?.calendar ?? []} trades={recentTrades} />
            )}

            {/* ─── BEHAVIOR TAB ────────────────────────────────────────── */}
            {activeTab === 'behavior' && (
              <BehaviorPatternTab
                effectiveStats={effectiveStats}
                advanced={advanced}
                ov={ov}
                recentTrades={recentTrades}
                tooltipStyle={tooltipStyle}
                axisColor={axisColor}
                gridColor={gridColor}
                behaviorData={behaviorData}
                behaviorLoading={behaviorLoading}
              />
            )}

          </motion.div>
        </AnimatePresence>
      )}

      {/* Share modals */}
      <ShareModal isOpen={shareType === 'weekly'} onClose={() => setShareType(null)} cardRef={shareCardRef} title="Weekly Recap">
        <WeeklySummaryCard ref={shareCardRef} trades={weekTrades} weekLabel={weekLabel} dateRange={weekRange} />
      </ShareModal>
      <ShareModal isOpen={shareType === 'monthly'} onClose={() => setShareType(null)} cardRef={shareCardRef} title="Monthly Report">
        <MonthlySummaryCard ref={shareCardRef} trades={monthTrades} monthLabel={monthLabel} calendarData={effectiveStats?.calendar} />
      </ShareModal>
    </motion.div>
  );
}
