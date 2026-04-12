import { useCallback, useRef, useState, useMemo, forwardRef } from 'react';
import { toPng } from 'html-to-image';

// Instagram feed portrait 4:5 @1080×1350 — Telegram-friendly (under ~1MB when compressed)
const SHARE_CARD_W = 432;
const SHARE_CARD_H = 540;
const EXPORT_PIXEL_RATIO = 2.5; // 432×2.5 = 1080, 540×2.5 = 1350
const EXPORT_BG = '#0d1117';

function getSharePngOptions(overrides = {}) {
  return {
    pixelRatio: EXPORT_PIXEL_RATIO,
    cacheBust: true,
    backgroundColor: EXPORT_BG,
    style: { transform: 'scale(1)', transformOrigin: 'top left' },
    ...overrides,
  };
}

// ─── Utils ──────────────────────────────────────────────────────────────────
function fmt$(v, currency = 'USD') {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, signDisplay: 'exceptZero', maximumFractionDigits: 2 }).format(n);
}
function fmtDuration(sec) {
  if (!sec || !Number.isFinite(sec)) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
function fmtPct(v) { return Number.isFinite(Number(v)) ? `${Number(v).toFixed(2)}%` : '—'; }
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Mini sparkline (pure SVG) ──────────────────────────────────────────────
function MiniSparkline({ prices = [], isWin, width = 220, height = 48 }) {
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 2;
  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
    const y = height - pad - ((p - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const color = isWin ? '#22c55e' : '#ef4444';
  const gradId = `spark-${isWin ? 'win' : 'loss'}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-60">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${height} ${points} ${width - pad},${height}`}
        fill={`url(#${gradId})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Discipline ring SVG ────────────────────────────────────────────────────
function DisciplineRing({ score, size = 56 }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const r = 15.9;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ─── TradeGuardX watermark ──────────────────────────────────────────────────
function Watermark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#00d4aa] to-[#00a88a]">
        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <span className="text-[10px] font-bold tracking-wider text-white/50">TRADEGUARDX</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INDIVIDUAL TRADE CARD
// ═══════════════════════════════════════════════════════════════════════════
export const TradeShareCard = forwardRef(function TradeShareCard({ trade, disciplineScore, sparkPrices, events }, ref) {
  const pnl = Number(trade?.pnl);
  const isWin = pnl > 0;
  const side = (trade?.side || '').toLowerCase();
  const isLong = side === 'buy' || side === 'long';
  const entry = Number(trade?.entryPrice);
  const exit = Number(trade?.exitPrice);
  const qty = trade?.quantity || '—';
  const holdSec = trade?.openedAt && trade?.closedAt
    ? Math.max(0, Math.floor((new Date(trade.closedAt) - new Date(trade.openedAt)) / 1000))
    : null;
  const returnPct = entry && qty !== '—' ? ((pnl / (entry * (Number(qty) || 1))) * 100) : null;

  const score = disciplineScore ?? 100;
  const bgGradient = isWin
    ? 'linear-gradient(145deg, #0a1a14 0%, #0d1117 40%, #0f1419 100%)'
    : 'linear-gradient(145deg, #1a0a0a 0%, #0d1117 40%, #0f1419 100%)';
  const accentGlow = isWin ? '#22c55e' : '#ef4444';
  const solidBase = isWin ? '#0a1210' : '#120b0b';

  return (
    <div
      ref={ref}
      style={{
        width: SHARE_CARD_W,
        height: SHARE_CARD_H,
        boxSizing: 'border-box',
        backgroundColor: solidBase,
        backgroundImage: bgGradient,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Background glow orbs */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: accentGlow, opacity: 0.06, filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: '#00d4aa', opacity: 0.04, filter: 'blur(40px)' }} />

      {/* Subtle grid pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div style={{ position: 'relative', padding: '22px 22px 20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header: Symbol + direction + result badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 14,
              background: isLong ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${isLong ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: isLong ? '#22c55e' : '#ef4444',
            }}>
              {isLong ? 'L' : 'S'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{trade?.symbol || 'Unknown'}</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                  background: isLong ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: isLong ? '#22c55e' : '#ef4444',
                  letterSpacing: '0.05em',
                }}>{(trade?.side || '').toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)', fontWeight: 500 }}>
                {fmtDate(trade?.closedAt || trade?.openedAt)}
              </span>
            </div>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 12,
            background: isWin ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isWin ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: isWin ? '#22c55e' : '#ef4444', letterSpacing: '0.05em' }}>
              {isWin ? 'WIN' : 'LOSS'}
            </span>
          </div>
        </div>

        {/* P&L Hero */}
        <div style={{ marginBottom: 14, position: 'relative' }}>
          <div style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0.45 }}>
            <MiniSparkline prices={sparkPrices || []} isWin={isWin} width={200} height={44} />
          </div>
          <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', color: `${accentGlow}80`, marginBottom: 4, textTransform: 'uppercase' }}>
            Realized P&L
          </p>
          <p style={{
            fontSize: 36, fontWeight: 900, color: accentGlow, letterSpacing: '-0.03em', lineHeight: 1,
            textShadow: `0 0 40px ${accentGlow}25`,
          }}>
            {Number.isFinite(pnl) ? fmt$(pnl, trade?.currency || 'USD') : '—'}
          </p>
          {returnPct != null && Number.isFinite(returnPct) && (
            <span style={{
              display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 8,
              background: `${accentGlow}12`, color: accentGlow, fontSize: 12, fontWeight: 700,
            }}>
              {returnPct > 0 ? '+' : ''}{returnPct.toFixed(2)}% return
            </span>
          )}
        </div>

        {/* Stat grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 0,
        }}>
          {[
            { label: 'Entry', value: Number.isFinite(entry) ? entry.toFixed(2) : '—', color: '#22c55e' },
            { label: 'Exit', value: Number.isFinite(exit) ? exit.toFixed(2) : '—', color: '#ef4444' },
            { label: 'Hold Time', value: fmtDuration(holdSec), color: '#f59e0b' },
            { label: 'Volume', value: qty, color: '#8b5cf6' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '8px 10px', borderRadius: 10,
              background: `${s.color}08`, border: `1px solid ${s.color}15`,
            }}>
              <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: `${s.color}80`, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</p>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', fontFamily: "'SF Mono', 'Fira Code', monospace" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Bottom strip: Discipline + events + watermark */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <DisciplineRing score={score} size={52} />
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Discipline</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444' }}>
                {score >= 80 ? 'Excellent' : score >= 50 ? 'Needs Work' : 'Poor'}
              </p>
            </div>
          </div>
          {events?.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Events</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>{events.length}</p>
            </div>
          )}
          <Watermark />
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// WEEKLY SUMMARY CARD
// ═══════════════════════════════════════════════════════════════════════════
export const WeeklySummaryCard = forwardRef(function WeeklySummaryCard({ trades = [], weekLabel, dateRange }, ref) {
  const stats = useMemo(() => {
    const closed = trades.filter((t) => String(t.status || '').toUpperCase() === 'CLOSED');
    const totalPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wins = closed.filter((t) => Number(t.pnl) > 0).length;
    const losses = closed.filter((t) => Number(t.pnl) <= 0).length;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    const best = closed.length > 0 ? closed.reduce((a, b) => (Number(b.pnl) || 0) > (Number(a.pnl) || 0) ? b : a, closed[0]) : null;
    const worst = closed.length > 0 ? closed.reduce((a, b) => (Number(b.pnl) || 0) < (Number(a.pnl) || 0) ? b : a, closed[0]) : null;
    const symbols = [...new Set(closed.map((t) => t.symbol))];
    const totalHoldSec = closed.reduce((s, t) => {
      if (!t.openedAt || !t.closedAt) return s;
      return s + Math.max(0, (new Date(t.closedAt) - new Date(t.openedAt)) / 1000);
    }, 0);
    const avgHold = closed.length > 0 ? totalHoldSec / closed.length : 0;
    let streak = 0;
    for (let i = closed.length - 1; i >= 0; i--) {
      if (Number(closed[i].pnl) > 0) streak++;
      else break;
    }
    return { totalPnl, wins, losses, winRate, best, worst, symbols, avgHold, streak, total: closed.length };
  }, [trades]);

  const isWin = stats.totalPnl >= 0;
  const bgGradient = 'linear-gradient(145deg, #080c15 0%, #0d1117 50%, #111827 100%)';

  return (
    <div ref={ref} style={{
      width: SHARE_CARD_W,
      minHeight: SHARE_CARD_H,
      boxSizing: 'border-box',
      backgroundColor: '#0d1117',
      backgroundImage: bgGradient,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 20,
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ position: 'absolute', top: -50, right: -30, width: 200, height: 200, borderRadius: '50%', background: isWin ? '#22c55e' : '#ef4444', opacity: 0.05, filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: -40, left: 40, width: 160, height: 160, borderRadius: '50%', background: '#00d4aa', opacity: 0.04, filter: 'blur(50px)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.015, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div style={{ position: 'relative', padding: '28px 28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: 'rgba(0,212,170,0.12)', color: '#00d4aa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Weekly Recap
              </span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              {weekLabel || 'This Week'}
            </p>
            {dateRange && (
              <p style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 2 }}>{dateRange}</p>
            )}
          </div>
          <div style={{
            padding: '8px 16px', borderRadius: 14,
            background: isWin ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
          }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: isWin ? '#22c55e80' : '#ef444480', textTransform: 'uppercase', marginBottom: 2 }}>NET P&L</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: isWin ? '#22c55e' : '#ef4444', letterSpacing: '-0.02em' }}>
              {fmt$(stats.totalPnl)}
            </p>
          </div>
        </div>

        {/* Stats grid — 2x3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Trades', value: stats.total, color: '#60a5fa' },
            { label: 'Wins', value: stats.wins, color: '#22c55e' },
            { label: 'Losses', value: stats.losses, color: '#ef4444' },
            { label: 'Win Rate', value: `${stats.winRate.toFixed(0)}%`, color: stats.winRate >= 50 ? '#22c55e' : '#f59e0b' },
            { label: 'Avg Hold', value: fmtDuration(stats.avgHold), color: '#8b5cf6' },
            { label: 'Win Streak', value: stats.streak, color: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '12px 14px', borderRadius: 12,
              background: `${s.color}06`, border: `1px solid ${s.color}12`,
            }}>
              <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: `${s.color}70`, textTransform: 'uppercase', marginBottom: 5 }}>{s.label}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Best & worst trades */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {stats.best && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: '#22c55e70', textTransform: 'uppercase', marginBottom: 4 }}>Best Trade</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{fmt$(stats.best.pnl)}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{stats.best.symbol}</p>
            </div>
          )}
          {stats.worst && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: '#ef444470', textTransform: 'uppercase', marginBottom: 4 }}>Worst Trade</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{fmt$(stats.worst.pnl)}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{stats.worst.symbol}</p>
            </div>
          )}
        </div>

        {/* Symbols traded + watermark */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Symbols Traded</p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {stats.symbols.slice(0, 6).map((s) => (
                <span key={s} style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }}>{s}</span>
              ))}
              {stats.symbols.length > 6 && (
                <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>+{stats.symbols.length - 6}</span>
              )}
            </div>
          </div>
          <Watermark />
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY SUMMARY CARD
// ═══════════════════════════════════════════════════════════════════════════
export const MonthlySummaryCard = forwardRef(function MonthlySummaryCard({ trades = [], monthLabel, calendarData }, ref) {
  const stats = useMemo(() => {
    const closed = trades.filter((t) => String(t.status || '').toUpperCase() === 'CLOSED');
    const totalPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wins = closed.filter((t) => Number(t.pnl) > 0).length;
    const losses = closed.filter((t) => Number(t.pnl) <= 0).length;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    const best = closed.length > 0 ? closed.reduce((a, b) => (Number(b.pnl) || 0) > (Number(a.pnl) || 0) ? b : a, closed[0]) : null;
    const symbols = [...new Set(closed.map((t) => t.symbol))];
    const totalHoldSec = closed.reduce((s, t) => {
      if (!t.openedAt || !t.closedAt) return s;
      return s + Math.max(0, (new Date(t.closedAt) - new Date(t.openedAt)) / 1000);
    }, 0);
    const avgHold = closed.length > 0 ? totalHoldSec / closed.length : 0;
    const tradingDays = new Set(closed.map((t) => (t.closedAt || t.openedAt || '').slice(0, 10))).size;
    const greenDays = (calendarData || []).filter((d) => d.pnl > 0).length;
    const redDays = (calendarData || []).filter((d) => d.pnl < 0).length;
    let maxStreak = 0, curStreak = 0;
    for (const t of closed) {
      if (Number(t.pnl) > 0) { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
      else curStreak = 0;
    }
    return { totalPnl, wins, losses, winRate, best, symbols, avgHold, tradingDays, greenDays, redDays, maxStreak, total: closed.length };
  }, [trades, calendarData]);

  const isWin = stats.totalPnl >= 0;

  // Mini heatmap: 7 cols x ~5 rows, representing days of the month
  const heatmap = useMemo(() => {
    if (!calendarData?.length) return null;
    const sorted = [...calendarData].sort((a, b) => a.date.localeCompare(b.date));
    const maxAbs = Math.max(...sorted.map((d) => Math.abs(d.pnl)), 1);
    return sorted.map((d) => {
      const intensity = Math.min(1, Math.abs(d.pnl) / maxAbs);
      const color = d.pnl > 0
        ? `rgba(34,197,94,${0.15 + intensity * 0.6})`
        : d.pnl < 0
          ? `rgba(239,68,68,${0.15 + intensity * 0.6})`
          : 'rgba(255,255,255,0.03)';
      return { date: d.date, color, pnl: d.pnl };
    });
  }, [calendarData]);

  return (
    <div ref={ref} style={{
      width: SHARE_CARD_W,
      minHeight: SHARE_CARD_H,
      boxSizing: 'border-box',
      backgroundColor: '#0d1117',
      backgroundImage: 'linear-gradient(145deg, #080c18 0%, #0d1117 40%, #0f1520 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 20,
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ position: 'absolute', top: -60, left: '40%', width: 220, height: 220, borderRadius: '50%', background: isWin ? '#22c55e' : '#ef4444', opacity: 0.05, filter: 'blur(70px)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.015, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div style={{ position: 'relative', padding: '28px 28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.12)', color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Monthly Report
            </span>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em', marginTop: 6 }}>
              {monthLabel || 'This Month'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: isWin ? '#22c55e70' : '#ef444470', textTransform: 'uppercase', marginBottom: 2 }}>NET P&L</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: isWin ? '#22c55e' : '#ef4444', letterSpacing: '-0.02em' }}>
              {fmt$(stats.totalPnl)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Trades', value: stats.total, color: '#60a5fa' },
            { label: 'Win Rate', value: `${stats.winRate.toFixed(0)}%`, color: stats.winRate >= 50 ? '#22c55e' : '#f59e0b' },
            { label: 'Trading Days', value: stats.tradingDays, color: '#8b5cf6' },
            { label: 'Best Streak', value: stats.maxStreak, color: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '10px 12px', borderRadius: 12,
              background: `${s.color}06`, border: `1px solid ${s.color}12`,
            }}>
              <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: `${s.color}60`, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Day heatmap */}
        {heatmap && heatmap.length > 0 && (
          <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Daily P&L Heatmap</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {heatmap.map((d) => (
                <div key={d.date} style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: d.color,
                }} title={`${d.date}: ${fmt$(d.pnl)}`} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>{stats.greenDays} green days</span>
              <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>{stats.redDays} red days</span>
            </div>
          </div>
        )}

        {/* W/L bar + best trade */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Win / Loss</p>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
              {stats.total > 0 && (
                <>
                  <div style={{ width: `${stats.winRate}%`, background: '#22c55e', borderRadius: '4px 0 0 4px' }} />
                  <div style={{ width: `${100 - stats.winRate}%`, background: '#ef4444', borderRadius: '0 4px 4px 0' }} />
                </>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#22c55e' }}>{stats.wins}W</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444' }}>{stats.losses}L</span>
            </div>
          </div>
          {stats.best && (
            <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.08)' }}>
              <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: '#22c55e60', textTransform: 'uppercase', marginBottom: 4 }}>Best Trade</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>{fmt$(stats.best.pnl)}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{stats.best.symbol} · {fmtDateShort(stats.best.closedAt)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {stats.symbols.slice(0, 5).map((s) => (
              <span key={s} style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }}>{s}</span>
            ))}
          </div>
          <Watermark />
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SHARE MODAL
// ═══════════════════════════════════════════════════════════════════════════
export function ShareModal({ isOpen, onClose, children, cardRef, title = 'Share Card' }) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const downloadPng = useCallback(async () => {
    if (!cardRef?.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, getSharePngOptions());
      const link = document.createElement('a');
      link.download = `tradeguardx-${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setDownloading(false);
    }
  }, [cardRef, title]);

  const copyToClipboard = useCallback(async () => {
    if (!cardRef?.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, getSharePngOptions());
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [cardRef]);

  const nativeShare = useCallback(async () => {
    if (!cardRef?.current || !navigator.share) return;
    try {
      const dataUrl = await toPng(cardRef.current, getSharePngOptions());
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'tradeguardx-share.png', { type: 'image/png' });
      await navigator.share({ title: 'TradeGuardX', files: [file] });
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Share failed:', err);
    }
  }, [cardRef]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="relative flex max-h-[92vh] max-w-[560px] w-full flex-col overflow-hidden rounded-2xl"
        style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Modal header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>{title}</h3>
              <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
                1080×1350 PNG · Instagram (4:5) and Telegram-ready, no white border
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'rgba(148,163,184,0.6)' }}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex justify-center">
            <div style={{ transformOrigin: 'top center' }}>
              {children}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 border-t px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button type="button" onClick={downloadPng} disabled={downloading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #00a88a)', color: '#0d1117' }}>
            {downloading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            {downloading ? 'Generating...' : 'Download PNG'}
          </button>

          <button type="button" onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.06)', color: copied ? '#22c55e' : '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
            {copied ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy
              </>
            )}
          </button>

          {typeof navigator !== 'undefined' && navigator.share && (
            <button type="button" onClick={nativeShare}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all active:scale-[0.97]"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
