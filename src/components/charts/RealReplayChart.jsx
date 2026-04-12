import { useEffect, useRef, useState, useMemo, useCallback, forwardRef } from 'react';
import {
  createChart, CrosshairMode,
  CandlestickSeries, HistogramSeries, LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts';

// ─── Symbol → Binance pair mapping ──────────────────────────────────────────
const BINANCE_PAIRS = {
  BTCUSD: 'BTCUSDT', BTCUSDT: 'BTCUSDT',
  ETHUSD: 'ETHUSDT', ETHUSDT: 'ETHUSDT',
  BNBUSD: 'BNBUSDT', BNBUSDT: 'BNBUSDT',
  SOLUSD: 'SOLUSDT', SOLUSDT: 'SOLUSDT',
  XRPUSD: 'XRPUSDT', XRPUSDT: 'XRPUSDT',
  DOGEUSD: 'DOGEUSDT', DOGEUSDT: 'DOGEUSDT',
  ADAUSD: 'ADAUSDT', ADAUSDT: 'ADAUSDT',
  DOTUSD: 'DOTUSDT', DOTUSDT: 'DOTUSDT',
  MATICUSD: 'MATICUSDT', MATICUSDT: 'MATICUSDT',
  AVAXUSD: 'AVAXUSDT', AVAXUSDT: 'AVAXUSDT',
  LINKUSD: 'LINKUSDT', LINKUSDT: 'LINKUSDT',
  LTCUSD: 'LTCUSDT', LTCUSDT: 'LTCUSDT',
  UNIUSD: 'UNIUSDT', UNIUSDT: 'UNIUSDT',
  SHIBUSD: 'SHIBUSDT', SHIBUSDT: 'SHIBUSDT',
  PEPE: 'PEPEUSDT', PEPEUSD: 'PEPEUSDT',
  NEARUSD: 'NEARUSDT', NEARUSDT: 'NEARUSDT',
};

function resolveBinancePair(symbol) {
  if (!symbol) return null;
  const upper = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (BINANCE_PAIRS[upper]) return BINANCE_PAIRS[upper];
  // try appending USDT if it doesn't already end with it
  if (!upper.endsWith('USDT') && !upper.endsWith('USD')) {
    if (BINANCE_PAIRS[upper + 'USDT']) return BINANCE_PAIRS[upper + 'USDT'];
  }
  // fallback: raw symbol + USDT (user can try, Binance will 400 if invalid)
  if (upper.endsWith('USD') && !upper.endsWith('USDT')) return upper + 'T';
  return upper.endsWith('USDT') ? upper : upper + 'USDT';
}

// ─── Timeframes ─────────────────────────────────────────────────────────────
const INTERVALS = [
  { label: '1m',  value: '1m',  ms: 60_000 },
  { label: '5m',  value: '5m',  ms: 300_000 },
  { label: '15m', value: '15m', ms: 900_000 },
  { label: '1H',  value: '1h',  ms: 3_600_000 },
  { label: '4H',  value: '4h',  ms: 14_400_000 },
  { label: '1D',  value: '1d',  ms: 86_400_000 },
];

// ─── Fetch Binance klines ───────────────────────────────────────────────────
async function fetchKlines(symbol, interval, startMs, endMs) {
  const chunks = [];
  let cursor = startMs;

  while (cursor < endMs) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&startTime=${cursor}&endTime=${endMs}&limit=1000`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;

    for (const k of rows) {
      chunks.push({
        time: Math.floor(k[0] / 1000),
        open:   parseFloat(k[1]),
        high:   parseFloat(k[2]),
        low:    parseFloat(k[3]),
        close:  parseFloat(k[4]),
        volume: parseFloat(k[5]),
      });
    }
    cursor = rows[rows.length - 1][6] + 1; // closeTime + 1
    if (rows.length < 1000) break;
  }

  return chunks;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const SEVEN_DAYS = 7 * 24 * 3_600_000;
function prePad(tradeDurationMs) {
  return Math.max(tradeDurationMs * 0.5, SEVEN_DAYS);
}
function postPad(tradeDurationMs) {
  return Math.max(tradeDurationMs * 0.2, 300_000);
}

/** Default replay zoom: frame entry→exit with padding (UTCTimestamp seconds). Clamps to fetched candles. */
function computeTradeFocusedVisibleRange(candles, openUnix, closeUnix, intervalMs) {
  if (!candles.length || openUnix == null) return null;
  const barSec = Math.max(1, Math.floor(intervalMs / 1000));
  const dataFrom = candles[0].time;
  const dataTo = candles[candles.length - 1].time;
  const tOpen = openUnix;
  const tClose = closeUnix != null ? closeUnix : tOpen;
  const tradeSpan = Math.max(tClose - tOpen, barSec);
  const pad = Math.max(tradeSpan * 0.45, barSec * 20);
  let from = tOpen - pad;
  let to = tClose + pad;
  const minWindow = barSec * 40;
  if (to - from < minWindow) {
    const mid = (tOpen + tClose) / 2;
    from = mid - minWindow / 2;
    to = mid + minWindow / 2;
  }
  from = Math.max(dataFrom, from);
  to = Math.min(dataTo, to);
  if (from >= to) return null;
  if (to - from < minWindow * 0.75) {
    const mid = (tOpen + tClose) / 2;
    const half = minWindow / 2;
    from = Math.max(dataFrom, mid - half);
    to = Math.min(dataTo, mid + half);
    if (from >= to) return null;
  }
  return { from, to };
}

// ─── Indicator calculators ──────────────────────────────────────────────────
function calcSMA(candles, period) {
  const out = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

function calcEMA(candles, period) {
  const k = 2 / (period + 1);
  const out = [];
  let prev = null;
  for (let i = 0; i < candles.length; i++) {
    if (prev === null) {
      if (i < period - 1) continue;
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
      prev = sum / period;
    } else {
      prev = candles[i].close * k + prev * (1 - k);
    }
    out.push({ time: candles[i].time, value: prev });
  }
  return out;
}

function calcBollingerBands(candles, period = 20, mult = 2) {
  const upper = [], middle = [], lower = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const mean = sum / period;
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) sqSum += (candles[j].close - mean) ** 2;
    const std = Math.sqrt(sqSum / period);
    const t = candles[i].time;
    upper.push({ time: t, value: mean + mult * std });
    middle.push({ time: t, value: mean });
    lower.push({ time: t, value: mean - mult * std });
  }
  return { upper, middle, lower };
}

function calcRSI(candles, period = 14) {
  const out = [];
  if (candles.length < period + 1) return out;
  let gainSum = 0, lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gainSum += diff; else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  out.push({ time: candles[period].time, value: 100 - 100 / (1 + rs) });
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const r = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push({ time: candles[i].time, value: 100 - 100 / (1 + r) });
  }
  return out;
}

function calcMACD(candles, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(candles, fast);
  const emaSlow = calcEMA(candles, slow);
  const fastMap = new Map(emaFast.map((d) => [d.time, d.value]));
  const macdLine = [];
  for (const s of emaSlow) {
    const f = fastMap.get(s.time);
    if (f != null) macdLine.push({ time: s.time, close: f - s.value });
  }
  const signalLine = calcEMA(macdLine, signal);
  const sigMap = new Map(signalLine.map((d) => [d.time, d.value]));
  const histogram = [];
  const line = [];
  for (const m of macdLine) {
    line.push({ time: m.time, value: m.close });
    const sig = sigMap.get(m.time);
    if (sig != null) {
      histogram.push({ time: m.time, value: m.close - sig, color: m.close - sig >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)' });
    }
  }
  return { line, signal: signalLine, histogram };
}

// indicator registry
const INDICATORS = [
  { id: 'sma20',  label: 'SMA 20',   group: 'overlay', color: '#f59e0b' },
  { id: 'sma50',  label: 'SMA 50',   group: 'overlay', color: '#3b82f6' },
  { id: 'sma200', label: 'SMA 200',  group: 'overlay', color: '#a855f7' },
  { id: 'ema9',   label: 'EMA 9',    group: 'overlay', color: '#ec4899' },
  { id: 'ema21',  label: 'EMA 21',   group: 'overlay', color: '#14b8a6' },
  { id: 'bb',     label: 'Bollinger', group: 'overlay', color: '#6366f1' },
  { id: 'rsi',    label: 'RSI 14',   group: 'pane',    color: '#f59e0b' },
  { id: 'macd',   label: 'MACD',     group: 'pane',    color: '#3b82f6' },
];

// ─── Fibonacci levels ───────────────────────────────────────────────────────
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444'];
const DEFAULT_REPLAY_HEIGHT = 560;

// ─── SVG Drawing overlay ────────────────────────────────────────────────────
const DrawingsOverlay = forwardRef(function DrawingsOverlay(
  {
    drawings,
    drawingInProgress,
    drawCursor,
    drawTool,
    chartToPixel,
    priceToY,
    onPointerDown,
    onPointerMove,
    onRemove,
    isDark,
  },
  ref,
) {
  const [, forceUpdate] = useState(0);

  // re-render on chart scroll/zoom so drawings track coordinates
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  function renderDrawing(d, isPreview) {
    if (d.type === 'hline') {
      const y = priceToY(d.price);
      if (y == null) return null;
      return (
        <g key={d.id || 'preview-hline'} className="group">
          <line x1={0} y1={y} x2="100%" y2={y}
            stroke={d.color || '#f59e0b'} strokeWidth={1.5} strokeDasharray="6 3" opacity={isPreview ? 0.5 : 0.8} />
          <text x={8} y={y - 4} fontSize={9} fill={d.color || '#f59e0b'} fontWeight="bold">
            {d.price.toFixed(2)}
          </text>
          {!isPreview && (
            <line x1={0} y1={y} x2="100%" y2={y}
              stroke="transparent" strokeWidth={8} className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </line>
          )}
        </g>
      );
    }

    if (d.type === 'trendline' || d.type === 'ray') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      const b = d.p2 ? chartToPixel(d.p2.time, d.p2.price) : (drawCursor || null);
      if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null;
      let x2 = b.x, y2 = b.y;
      if (d.type === 'ray' && d.p2) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) { x2 = a.x + (dx / len) * 4000; y2 = a.y + (dy / len) * 4000; }
      }
      return (
        <g key={d.id || 'preview-line'} className="group">
          <line x1={a.x} y1={a.y} x2={x2} y2={y2}
            stroke={d.color || '#00d4aa'} strokeWidth={1.5} opacity={isPreview ? 0.5 : 0.85} />
          <circle cx={a.x} cy={a.y} r={3} fill={d.color || '#00d4aa'} opacity={isPreview ? 0.4 : 0.7} />
          {d.p2 && <circle cx={b.x} cy={b.y} r={3} fill={d.color || '#00d4aa'} opacity={0.7} />}
          {!isPreview && (
            <line x1={a.x} y1={a.y} x2={d.p2 ? b.x : x2} y2={d.p2 ? b.y : y2}
              stroke="transparent" strokeWidth={10} className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </line>
          )}
        </g>
      );
    }

    if (d.type === 'rect') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      const b = d.p2 ? chartToPixel(d.p2.time, d.p2.price) : (drawCursor || null);
      if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null;
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      return (
        <g key={d.id || 'preview-rect'}>
          <rect x={x} y={y} width={w} height={h}
            fill={d.color || 'rgba(99,102,241,0.12)'} stroke="#6366f1" strokeWidth={1} opacity={isPreview ? 0.4 : 0.7} rx={2} />
          {!isPreview && (
            <rect x={x} y={y} width={w} height={h}
              fill="transparent" className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </rect>
          )}
        </g>
      );
    }

    if (d.type === 'fib') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      const b = d.p2 ? chartToPixel(d.p2.time, d.p2.price) : (drawCursor || null);
      if (!a || !b || (a.x == null && a.y == null)) return null;
      const priceHigh = Math.max(d.p1.price, d.p2?.price ?? d.p1.price);
      const priceLow = Math.min(d.p1.price, d.p2?.price ?? d.p1.price);
      const left = Math.min(a.x ?? 0, b.x ?? 0);
      const right = Math.max(a.x ?? 0, b.x ?? 0);
      return (
        <g key={d.id || 'preview-fib'}>
          {FIB_LEVELS.map((level, i) => {
            const price = priceHigh - level * (priceHigh - priceLow);
            const yy = priceToY(price);
            if (yy == null) return null;
            return (
              <g key={level}>
                <line x1={left - 20} y1={yy} x2={right + 20} y2={yy}
                  stroke={FIB_COLORS[i]} strokeWidth={1} strokeDasharray="4 2" opacity={isPreview ? 0.3 : 0.6} />
                <text x={left - 18} y={yy - 3} fontSize={8} fill={FIB_COLORS[i]} fontWeight="bold" opacity={isPreview ? 0.4 : 0.8}>
                  {(level * 100).toFixed(1)}% — {price.toFixed(2)}
                </text>
              </g>
            );
          })}
          {!isPreview && a.y != null && b.y != null && (
            <rect x={left - 20} y={Math.min(a.y, b.y)} width={right - left + 40} height={Math.abs(b.y - a.y)}
              fill="transparent" className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </rect>
          )}
        </g>
      );
    }

    if (d.type === 'text' || d.type === 'callout') {
      const pt = chartToPixel(d.time, d.price);
      if (!pt || pt.x == null || pt.y == null) return null;
      const w = (d.label?.length || 1) * 6.5 + 12;
      return (
        <g key={d.id || 'preview-text'}>
          {d.type === 'callout' && <line x1={pt.x + w / 2} y1={pt.y + 6} x2={pt.x + w / 2} y2={pt.y + 22} stroke={d.color || '#60a5fa'} strokeWidth={1} />}
          <rect x={pt.x - 2} y={pt.y - 12} width={w} height={18} rx={4}
            fill={isDark ? 'rgba(30,32,40,0.92)' : 'rgba(255,255,255,0.92)'} stroke={d.color || '#e2e8f0'} strokeWidth={0.5} />
          <text x={pt.x + 4} y={pt.y + 1} fontSize={10} fill={d.color || '#e2e8f0'} fontWeight="600">
            {d.label}
          </text>
          {!isPreview && (
            <rect x={pt.x - 4} y={pt.y - 14} width={w + 4} height={22}
              fill="transparent" className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </rect>
          )}
        </g>
      );
    }

    if (d.type === 'vline') {
      const pt = chartToPixel(d.time, null);
      if (!pt || pt.x == null) return null;
      return (
        <g key={d.id || 'preview-vline'}>
          <line x1={pt.x} y1={0} x2={pt.x} y2="100%"
            stroke={d.color || '#fb923c'} strokeWidth={1.5} strokeDasharray="6 3" opacity={isPreview ? 0.5 : 0.8} />
          {!isPreview && (
            <line x1={pt.x} y1={0} x2={pt.x} y2="100%"
              stroke="transparent" strokeWidth={8} className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </line>
          )}
        </g>
      );
    }

    if (d.type === 'extline') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      const b = d.p2 ? chartToPixel(d.p2.time, d.p2.price) : (drawCursor || null);
      if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ext = 4000;
      return (
        <g key={d.id || 'preview-extline'}>
          <line x1={a.x - (dx / len) * ext} y1={a.y - (dy / len) * ext}
                x2={a.x + (dx / len) * ext} y2={a.y + (dy / len) * ext}
            stroke={d.color || '#a78bfa'} strokeWidth={1.5} opacity={isPreview ? 0.4 : 0.7} />
          <circle cx={a.x} cy={a.y} r={3} fill={d.color || '#a78bfa'} opacity={0.7} />
          <circle cx={b.x} cy={b.y} r={3} fill={d.color || '#a78bfa'} opacity={0.7} />
          {!isPreview && (
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={10} className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </line>
          )}
        </g>
      );
    }

    if (d.type === 'hray') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      if (!a || a.x == null || a.y == null) return null;
      return (
        <g key={d.id || 'preview-hray'}>
          <line x1={a.x} y1={a.y} x2={4000} y2={a.y}
            stroke={d.color || '#14b8a6'} strokeWidth={1.5} opacity={isPreview ? 0.5 : 0.8} />
          <circle cx={a.x} cy={a.y} r={3} fill={d.color || '#14b8a6'} />
          <text x={a.x + 6} y={a.y - 4} fontSize={9} fill={d.color || '#14b8a6'} fontWeight="bold">
            {d.p1.price.toFixed(2)}
          </text>
          {!isPreview && (
            <line x1={a.x} y1={a.y} x2={4000} y2={a.y} stroke="transparent" strokeWidth={8} className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </line>
          )}
        </g>
      );
    }

    if (d.type === 'channel') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      const b = d.p2 ? chartToPixel(d.p2.time, d.p2.price) : (drawCursor || null);
      if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null;
      const dy = Math.abs(b.y - a.y) * 0.4;
      return (
        <g key={d.id || 'preview-channel'}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={d.color || '#8b5cf6'} strokeWidth={1.5} opacity={isPreview ? 0.4 : 0.7} />
          <line x1={a.x} y1={a.y - dy} x2={b.x} y2={b.y - dy} stroke={d.color || '#8b5cf6'} strokeWidth={1.5} strokeDasharray="4 2" opacity={isPreview ? 0.3 : 0.5} />
          <rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y) - dy} width={Math.abs(b.x - a.x)} height={dy}
            fill={d.color || '#8b5cf6'} fillOpacity={0.06} stroke="none" />
          {!isPreview && (
            <rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y) - dy} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y) + dy}
              fill="transparent" className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </rect>
          )}
        </g>
      );
    }

    if (d.type === 'ellipse') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      const b = d.p2 ? chartToPixel(d.p2.time, d.p2.price) : (drawCursor || null);
      if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
      return (
        <g key={d.id || 'preview-ellipse'}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
            stroke={d.color || '#ec4899'} strokeWidth={1.5} fill={d.color || '#ec4899'} fillOpacity={0.06} opacity={isPreview ? 0.5 : 0.8} />
          {!isPreview && (
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
              fill="transparent" className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </ellipse>
          )}
        </g>
      );
    }

    if (d.type === 'arrowup' || d.type === 'arrowdown') {
      const pt = chartToPixel(d.time, d.price);
      if (!pt || pt.x == null || pt.y == null) return null;
      const up = d.type === 'arrowup';
      return (
        <g key={d.id || 'preview-arrow'}>
          <polygon points={up ? `${pt.x},${pt.y - 10} ${pt.x - 6},${pt.y + 2} ${pt.x + 6},${pt.y + 2}` : `${pt.x},${pt.y + 10} ${pt.x - 6},${pt.y - 2} ${pt.x + 6},${pt.y - 2}`}
            fill={d.color} stroke={d.color} strokeWidth={1} opacity={isPreview ? 0.5 : 0.9} />
          {!isPreview && (
            <circle cx={pt.x} cy={pt.y} r={10} fill="transparent" className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </circle>
          )}
        </g>
      );
    }

    if (d.type === 'pricerange') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      const b = d.p2 ? chartToPixel(d.p2.time, d.p2.price) : (drawCursor || null);
      if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null;
      const mid = (a.x + b.x) / 2;
      const diff = d.p2 ? Math.abs(d.p2.price - d.p1.price) : 0;
      const pct = d.p1.price ? ((d.p2?.price ?? 0) - d.p1.price) / d.p1.price * 100 : 0;
      const isUp = (d.p2?.price ?? b.y) >= d.p1.price;
      return (
        <g key={d.id || 'preview-pricerange'}>
          <line x1={mid} y1={a.y} x2={mid} y2={b.y} stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={2} />
          <line x1={mid - 8} y1={a.y} x2={mid + 8} y2={a.y} stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={1.5} />
          <line x1={mid - 8} y1={b.y} x2={mid + 8} y2={b.y} stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={1.5} />
          {d.p2 && (
            <g>
              <rect x={mid + 12} y={(a.y + b.y) / 2 - 12} width={80} height={24} rx={4}
                fill={isDark ? 'rgba(13,15,20,0.92)' : 'rgba(255,255,255,0.92)'} stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={0.5} />
              <text x={mid + 16} y={(a.y + b.y) / 2 - 1} fontSize={9} fill={isUp ? '#22c55e' : '#ef4444'} fontWeight="bold">
                {diff.toFixed(2)}
              </text>
              <text x={mid + 16} y={(a.y + b.y) / 2 + 9} fontSize={8} fill={isUp ? '#22c55e99' : '#ef444499'}>
                {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
              </text>
            </g>
          )}
          {!isPreview && (
            <rect x={Math.min(a.x, b.x) - 5} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x) + 100} height={Math.abs(b.y - a.y)}
              fill="transparent" className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </rect>
          )}
        </g>
      );
    }

    if (d.type === 'longpos' || d.type === 'shortpos') {
      const a = chartToPixel(d.p1.time, d.p1.price);
      const b = d.p2 ? chartToPixel(d.p2.time, d.p2.price) : (drawCursor || null);
      if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null;
      const isLong = d.type === 'longpos';
      const entryY = a.y, slY = b.y;
      const tpY = entryY - (slY - entryY);
      const left = Math.min(a.x, b.x) - 20;
      const width = Math.abs(b.x - a.x) + 40;
      return (
        <g key={d.id || 'preview-pos'}>
          <rect x={left} y={Math.min(entryY, tpY)} width={width} height={Math.abs(tpY - entryY)}
            fill={isLong ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'} stroke={isLong ? '#22c55e' : '#ef4444'} strokeWidth={0.5} />
          <rect x={left} y={Math.min(entryY, slY)} width={width} height={Math.abs(slY - entryY)}
            fill={isLong ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)'} stroke={isLong ? '#ef4444' : '#22c55e'} strokeWidth={0.5} />
          <line x1={left} y1={entryY} x2={left + width} y2={entryY} stroke="#f59e0b" strokeWidth={2} />
          <text x={left + 4} y={entryY - 3} fontSize={8} fill="#f59e0b" fontWeight="bold">Entry</text>
          {d.p2 && (
            <>
              <text x={left + 4} y={slY + (isLong ? 10 : -4)} fontSize={8} fill="#ef4444" fontWeight="bold">SL</text>
              <text x={left + 4} y={tpY + (isLong ? -4 : 10)} fontSize={8} fill="#22c55e" fontWeight="bold">TP (1:1)</text>
            </>
          )}
          {!isPreview && (
            <rect x={left} y={Math.min(tpY, slY)} width={width} height={Math.abs(tpY - slY)}
              fill="transparent" className="cursor-pointer" onClick={() => onRemove(d.id)}>
              <title>Click to remove</title>
            </rect>
          )}
        </g>
      );
    }

    return null;
  }

  // preview for in-progress drawing
  const preview = drawingInProgress && drawCursor
    ? renderDrawing({ ...drawingInProgress, p2: drawCursor, color: getDrawPreviewColor(drawingInProgress.type), id: null }, true)
    : null;

  // single-click tool preview lines at cursor
  const cursorPreview = (() => {
    if (!drawCursor) return null;
    if (drawTool === 'hline') return <line x1={0} y1={drawCursor.y} x2="100%" y2={drawCursor.y} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" opacity={0.35} />;
    if (drawTool === 'vline') return <line x1={drawCursor.x} y1={0} x2={drawCursor.x} y2="100%" stroke="#fb923c" strokeWidth={1} strokeDasharray="4 2" opacity={0.35} />;
    if (drawTool === 'crosshair') return (<>
      <line x1={0} y1={drawCursor.y} x2="100%" y2={drawCursor.y} stroke="#64748b" strokeWidth={0.5} strokeDasharray="3 2" opacity={0.6} />
      <line x1={drawCursor.x} y1={0} x2={drawCursor.x} y2="100%" stroke="#64748b" strokeWidth={0.5} strokeDasharray="3 2" opacity={0.6} />
    </>);
    return null;
  })();

  function getDrawPreviewColor(type) {
    const DRAW_COLORS = {
      trendline: '#00d4aa', ray: '#60a5fa', extline: '#a78bfa', hline: '#f59e0b',
      vline: '#fb923c', hray: '#14b8a6', channel: '#8b5cf6', rect: 'rgba(99,102,241,0.15)',
      ellipse: '#ec4899', fib: '#f59e0b', pricerange: '#00d4aa',
      longpos: '#f59e0b', shortpos: '#f59e0b', callout: '#60a5fa',
    };
    return DRAW_COLORS[type] || '#00d4aa';
  }

  return (
    <svg
      ref={ref}
      data-chart-overlay
      className="absolute inset-0 z-20"
      style={{
        pointerEvents: drawTool ? 'auto' : 'none',
        cursor: drawTool && drawTool !== 'crosshair' ? 'crosshair' : drawTool === 'crosshair' ? 'crosshair' : 'default',
        width: '100%',
        height: '100%',
        touchAction: drawTool ? 'none' : 'auto',
        userSelect: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      {drawings.map((d) => renderDrawing(d, false))}
      {preview}
      {cursorPreview}

      {/* crosshair at cursor when drawing (skip for the crosshair tool itself — it has its own preview) */}
      {drawTool && drawTool !== 'crosshair' && drawCursor && (
        <g opacity={0.25}>
          <line x1={drawCursor.x} y1={0} x2={drawCursor.x} y2="100%" stroke="#00d4aa" strokeWidth={0.5} strokeDasharray="3 3" />
          <line x1={0} y1={drawCursor.y} x2="100%" y2={drawCursor.y} stroke="#00d4aa" strokeWidth={0.5} strokeDasharray="3 3" />
        </g>
      )}
    </svg>
  );
});

// ─── Toolbar helpers ────────────────────────────────────────────────────────
function ToolBtn({ id, tip, icon, active, onSelect }) {
  const isOn = Object.is(active, id);
  return (
    <button
      type="button"
      title={tip}
      onClick={() => onSelect(id)}
      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      style={{
        backgroundColor: isOn ? 'rgba(0,212,170,0.15)' : 'transparent',
        color: isOn ? '#00d4aa' : 'var(--dash-text-faint)',
      }}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
    </button>
  );
}
function ToolSep() {
  return <div className="my-1 w-5 self-center border-t" style={{ borderColor: 'var(--dash-border)' }} />;
}

/** Two-anchor shapes: press on chart → drag → release (TradingView-style). */
const DRAG_DRAW_TOOLS = new Set([
  'trendline', 'ray', 'extline', 'rect', 'fib', 'ellipse', 'channel', 'pricerange', 'longpos', 'shortpos',
]);

// ─── Component ──────────────────────────────────────────────────────────────
export default function RealReplayChart({ trade, isDark }) {
  const wrapperRef = useRef(null);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const markersPluginRef = useRef(null);
  const entryLineRef = useRef(null);
  const exitLineRef = useRef(null);

  const [interval, setInterval_] = useState('5m');
  const [allCandles, setAllCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playIdx, setPlayIdx] = useState(-1); // -1 = show all
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(100); // ms per candle
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([]); // array of indicator ids
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const indicatorSeriesRef = useRef({}); // { [id]: series | series[] }
  const timerRef = useRef(null);
  /** Apply trade-focused zoom once per fetch/interval/trade so pan/zoom is not reset on marker updates. */
  const tradeZoomKeyAppliedRef = useRef(null);

  // ─── Drawing tools state ────────────────────────────────────────────────
  const [drawTool, setDrawTool] = useState(null); // null | 'hline' | 'trendline' | 'ray' | 'rect' | 'fib' | 'text'
  const [drawings, setDrawings] = useState([]);
  const [drawingInProgress, setDrawingInProgress] = useState(null); // partial drawing being constructed
  const [drawCursor, setDrawCursor] = useState(null); // { x, y, time, price } for live preview
  const svgOverlayRef = useRef(null);
  const dragDrawActiveRef = useRef(false);
  const drawingInProgressRef = useRef(null);
  /** Window listeners for drag (avoid setPointerCapture — it blocks toolbar clicks). */
  const dragWindowCleanupRef = useRef(null);
  const pxToChartRef = useRef(null);
  const commitDragDrawingRef = useRef(null);

  // pixel → chart coordinate helpers
  const pxToChart = useCallback((clientX, clientY) => {
    const cs = candleSeriesRef.current;
    const chart = chartRef.current;
    const el = chartContainerRef.current;
    if (!cs || !chart || !el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = cs.coordinateToPrice(y);
    if (time == null || price == null) return null;
    return { x, y, time, price };
  }, []);

  const chartToPixel = useCallback((time, price) => {
    const cs = candleSeriesRef.current;
    const chart = chartRef.current;
    if (!cs || !chart) return null;
    const x = time != null ? chart.timeScale().timeToCoordinate(time) : null;
    const y = price != null ? cs.priceToCoordinate(price) : null;
    return { x, y };
  }, []);

  const priceToY = useCallback((price) => {
    const cs = candleSeriesRef.current;
    if (!cs) return null;
    return cs.priceToCoordinate(price);
  }, []);

  // tools that stay active after placing one shape (toolbar stays on same tool)
  const REPEAT_TOOLS = ['trendline', 'ray', 'extline', 'hline', 'vline', 'arrowup', 'arrowdown'];

  const DRAW_COLORS = {
    trendline: '#00d4aa', ray: '#60a5fa', extline: '#a78bfa', hline: '#f59e0b',
    vline: '#fb923c', hray: '#14b8a6', channel: '#8b5cf6', rect: '#6366f1',
    ellipse: '#ec4899', fib: '#f59e0b', pricerange: '#00d4aa',
    longpos: '#22c55e', shortpos: '#ef4444', text: '#e2e8f0',
    arrowup: '#22c55e', arrowdown: '#ef4444', callout: '#60a5fa',
  };

  const commitDragDrawing = useCallback((wip, p2) => {
    const tool = wip.type;
    const d = { ...wip, p2, color: DRAW_COLORS[tool] || '#00d4aa', id: Date.now() };
    if (tool === 'pricerange') {
      d.priceDiff = Math.abs(d.p2.price - d.p1.price);
      d.pctChange = d.p1.price !== 0 ? ((d.p2.price - d.p1.price) / d.p1.price) * 100 : 0;
    }
    setDrawings((prev) => [...prev, d]);
    if (!REPEAT_TOOLS.includes(tool)) setDrawTool(null);
  }, [DRAW_COLORS]);

  commitDragDrawingRef.current = commitDragDrawing;
  pxToChartRef.current = pxToChart;

  const detachDragWindowListeners = useCallback(() => {
    if (dragWindowCleanupRef.current) {
      dragWindowCleanupRef.current();
      dragWindowCleanupRef.current = null;
    }
  }, []);

  const attachDragWindowListeners = useCallback(
    (pointerId) => {
      detachDragWindowListeners();

      const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;
        if (!dragDrawActiveRef.current) return;
        const pt = pxToChartRef.current?.(ev.clientX, ev.clientY);
        const el = chartContainerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setDrawCursor({
          x: ev.clientX - rect.left,
          y: ev.clientY - rect.top,
          time: pt?.time ?? null,
          price: pt?.price ?? null,
        });
      };

      const finishDrag = (ev) => {
        if (ev.pointerId !== pointerId) return;

        const wip = drawingInProgressRef.current;
        detachDragWindowListeners();

        dragDrawActiveRef.current = false;
        drawingInProgressRef.current = null;
        setDrawingInProgress(null);

        if (!wip || !DRAG_DRAW_TOOLS.has(wip.type)) return;

        const pt = pxToChartRef.current?.(ev.clientX, ev.clientY);
        if (!pt) return;

        const dx = Math.abs(pt.x - wip.p1.x);
        const dy = Math.abs(pt.y - wip.p1.y);
        if (dx < 4 && dy < 4) return;

        commitDragDrawingRef.current?.(wip, pt);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
      dragWindowCleanupRef.current = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
      };
    },
    [detachDragWindowListeners],
  );

  /** Toolbar / Esc: always clear drag listeners so tool switches work reliably. */
  const selectDrawTool = useCallback(
    (id) => {
      detachDragWindowListeners();
      dragDrawActiveRef.current = false;
      drawingInProgressRef.current = null;
      setDrawingInProgress(null);
      setDrawCursor(null);
      setDrawTool(id);
    },
    [detachDragWindowListeners],
  );

  useEffect(() => () => detachDragWindowListeners(), [detachDragWindowListeners]);

  /** Pointer down: single-tap tools place here; drag tools start press-and-drag. */
  const handleDrawPointerDown = useCallback(
    (e) => {
      if (!drawTool) return;
      if (drawTool === 'crosshair') return;

      const pt = pxToChart(e.clientX, e.clientY);
      if (!pt) return;

      if (DRAG_DRAW_TOOLS.has(drawTool)) {
        e.preventDefault();
        e.stopPropagation();
        const wip = { type: drawTool, p1: pt };
        drawingInProgressRef.current = wip;
        setDrawingInProgress(wip);
        dragDrawActiveRef.current = true;
        attachDragWindowListeners(e.pointerId);
        return;
      }

      // Single placement (click / tap once)
      if (drawTool === 'hline') {
        setDrawings((d) => [...d, { type: 'hline', price: pt.price, color: DRAW_COLORS.hline, id: Date.now() }]);
        if (!REPEAT_TOOLS.includes(drawTool)) setDrawTool(null);
        return;
      }
      if (drawTool === 'vline') {
        setDrawings((d) => [...d, { type: 'vline', time: pt.time, color: DRAW_COLORS.vline, id: Date.now() }]);
        if (!REPEAT_TOOLS.includes(drawTool)) setDrawTool(null);
        return;
      }
      if (drawTool === 'arrowup' || drawTool === 'arrowdown') {
        setDrawings((d) => [...d, { type: drawTool, time: pt.time, price: pt.price, color: DRAW_COLORS[drawTool], id: Date.now() }]);
        return;
      }
      if (drawTool === 'hray') {
        setDrawings((d) => [...d, { type: 'hray', p1: pt, color: DRAW_COLORS.hray, id: Date.now() }]);
        setDrawTool(null);
        return;
      }
      if (drawTool === 'text' || drawTool === 'callout') {
        const label = prompt('Enter text:');
        if (label) {
          setDrawings((d) => [...d, { type: drawTool, time: pt.time, price: pt.price, label, color: DRAW_COLORS[drawTool], id: Date.now() }]);
        }
        setDrawTool(null);
      }
    },
    [drawTool, pxToChart, attachDragWindowListeners],
  );

  const handleDrawPointerMove = useCallback((e) => {
    if (dragDrawActiveRef.current) return;
    if (!drawTool && !drawingInProgress && !dragDrawActiveRef.current) {
      setDrawCursor(null);
      return;
    }
    const pt = pxToChart(e.clientX, e.clientY);
    const el = chartContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDrawCursor({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: pt?.time ?? null,
      price: pt?.price ?? null,
    });
  }, [drawTool, drawingInProgress, pxToChart]);

  function removeDrawing(id) {
    setDrawings((d) => d.filter((dr) => dr.id !== id));
  }

  function clearAllDrawings() {
    detachDragWindowListeners();
    dragDrawActiveRef.current = false;
    drawingInProgressRef.current = null;
    setDrawings([]);
    setDrawingInProgress(null);
    setDrawTool(null);
  }

  // cancel drawing on Escape (including mid-drag)
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        selectDrawTool(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectDrawTool]);

  // ─── Fullscreen toggle ──────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.().catch(() => {
        setIsFullscreen((f) => !f);
      });
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ESC key to exit manual fullscreen fallback
  useEffect(() => {
    if (!isFullscreen) return;
    function onKey(e) {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  const binancePair = useMemo(() => resolveBinancePair(trade?.symbol), [trade?.symbol]);
  const entryPrice = Number(trade?.entryPrice);
  const exitPrice  = Number(trade?.exitPrice);
  const openMs     = trade?.openedAt ? new Date(trade.openedAt).getTime() : null;
  const closeMs    = trade?.closedAt ? new Date(trade.closedAt).getTime() : null;
  const duration   = openMs && closeMs ? closeMs - openMs : 3_600_000;
  const side       = (trade?.side || '').toLowerCase();
  const isLong     = side === 'buy' || side === 'long';

  // trade open/close timestamps as unix seconds
  const openUnix  = openMs ? Math.floor(openMs / 1000) : null;
  const closeUnix = closeMs ? Math.floor(closeMs / 1000) : null;

  // Resize chart height when fullscreen toggles. Do not touch the time scale here — a previous version
  // also depended on playIdx and called fitContent() while replaying / setVisibleRange when stopping,
  // which wiped manual zoom and jumped the view (typically to the right).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartContainerRef.current) return;
    if (isFullscreen && !wrapperRef.current) return;
    const raf = requestAnimationFrame(() => {
      const h = isFullscreen
        ? window.innerHeight - (chartContainerRef.current.getBoundingClientRect().top - wrapperRef.current.getBoundingClientRect().top) - 60
        : Math.max(460, Math.min(760, window.innerHeight - 260));
      chart.applyOptions({ height: Math.max(300, h) });
    });
    return () => cancelAnimationFrame(raf);
  }, [isFullscreen]);

  // ─── Fetch data on interval change ──────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!binancePair || !openMs) return;
    setLoading(true);
    setError('');
    setPlayIdx(-1);
    setPlaying(false);
    tradeZoomKeyAppliedRef.current = null;

    try {
      const startMs = openMs - prePad(duration);
      const endMs   = (closeMs || openMs + duration) + postPad(duration);
      const data    = await fetchKlines(binancePair, interval, startMs, endMs);
      if (!data.length) throw new Error('No candle data returned');
      setAllCandles(data);
    } catch (e) {
      setError(e?.message || 'Failed to fetch chart data');
      setAllCandles([]);
    } finally {
      setLoading(false);
    }
  }, [binancePair, interval, openMs, closeMs, duration]);

  useEffect(() => { loadData(); }, [loadData]);

  // index of candle at trade open time
  const openCandleIdx = useMemo(() => {
    if (!openUnix || !allCandles.length) return 0;
    const idx = allCandles.findIndex((c) => c.time >= openUnix);
    return idx >= 0 ? Math.max(0, idx - 1) : 0;
  }, [allCandles, openUnix]);

  // visible candles based on playback state
  const visibleCandles = useMemo(() => {
    if (playIdx < 0) return allCandles;
    return allCandles.slice(0, playIdx + 1);
  }, [allCandles, playIdx]);

  // ─── Create chart ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || DEFAULT_REPLAY_HEIGHT,
      layout: {
        background: { type: 'solid', color: isDark ? '#0d0f14' : '#ffffff' },
        textColor: isDark ? '#9ca3af' : '#6b7280',
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', width: 1, style: 3 },
        horzLine: { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.18 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55eaa',
      wickDownColor: '#ef4444aa',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      if (markersPluginRef.current) {
        try { markersPluginRef.current.detach(); } catch { /* noop */ }
        markersPluginRef.current = null;
      }
      indicatorSeriesRef.current = {};
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [isDark]);

  // ─── Update chart data ──────────────────────────────────────────────────
  useEffect(() => {
    const cs = candleSeriesRef.current;
    const vs = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!cs || !vs || !chart || !visibleCandles.length) return;

    cs.setData(visibleCandles);
    vs.setData(visibleCandles.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open
        ? (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.25)')
        : (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.25)'),
    })));

    // ── Price lines ──
    [entryLineRef, exitLineRef].forEach((ref) => {
      if (ref.current) {
        try { cs.removePriceLine(ref.current); } catch { /* noop */ }
        ref.current = null;
      }
    });

    if (Number.isFinite(entryPrice)) {
      entryLineRef.current = cs.createPriceLine({
        price: entryPrice,
        color: '#00d4aa',
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: `Entry ${entryPrice.toFixed(2)}`,
      });
    }
    if (Number.isFinite(exitPrice)) {
      exitLineRef.current = cs.createPriceLine({
        price: exitPrice,
        color: '#94a3b8',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `Exit ${exitPrice.toFixed(2)}`,
      });
    }
    // ── Markers (entry + exit only; no journal event dots) ──
    const markers = [];
    if (openUnix) {
      const cIdx = visibleCandles.findIndex((c) => c.time >= openUnix);
      if (cIdx >= 0) {
        markers.push({
          time: visibleCandles[cIdx].time,
          position: isLong ? 'belowBar' : 'aboveBar',
          color: '#00d4aa',
          shape: isLong ? 'arrowUp' : 'arrowDown',
          text: `${isLong ? 'BUY' : 'SELL'} @ ${entryPrice.toFixed(2)}`,
        });
      }
    }
    if (closeUnix && playIdx < 0) {
      const cIdx = visibleCandles.findIndex((c) => c.time >= closeUnix);
      if (cIdx >= 0) {
        markers.push({
          time: visibleCandles[cIdx].time,
          position: isLong ? 'aboveBar' : 'belowBar',
          color: '#94a3b8',
          shape: isLong ? 'arrowDown' : 'arrowUp',
          text: `CLOSE @ ${exitPrice.toFixed(2)}`,
        });
      }
    }

    markers.sort((a, b) => a.time - b.time);

    if (markersPluginRef.current) {
      try { markersPluginRef.current.detach(); } catch { /* noop */ }
    }
    if (markers.length) {
      markersPluginRef.current = createSeriesMarkers(cs, markers);
    }

    // Default zoom around the trade when replay is stopped (once per load; keeps user pan/zoom afterward)
    if (playIdx < 0 && allCandles.length) {
      const intervalMs = INTERVALS.find((x) => x.value === interval)?.ms ?? 300_000;
      const zoomKey = `${interval}|${trade?.id ?? ''}|${trade?.openedAt ?? ''}|${allCandles[0]?.time}|${allCandles.length}`;
      if (tradeZoomKeyAppliedRef.current !== zoomKey) {
        tradeZoomKeyAppliedRef.current = zoomKey;
        const range = computeTradeFocusedVisibleRange(allCandles, openUnix, closeUnix, intervalMs);
        if (range) chart.timeScale().setVisibleRange(range);
        else chart.timeScale().fitContent();
      }
    }
  }, [visibleCandles, isDark, entryPrice, exitPrice, openUnix, closeUnix, isLong, playIdx, allCandles, interval, trade?.id, trade?.openedAt]);

  // ─── Indicator series management ────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const data = visibleCandles;

    // remove series that are no longer active
    for (const [id, series] of Object.entries(indicatorSeriesRef.current)) {
      if (!activeIndicators.includes(id)) {
        const arr = Array.isArray(series) ? series : [series];
        arr.forEach((s) => { try { chart.removeSeries(s); } catch { /* noop */ } });
        delete indicatorSeriesRef.current[id];
      }
    }

    if (!data.length) return;

    for (const id of activeIndicators) {
      if (indicatorSeriesRef.current[id]) {
        // update existing series data
        updateIndicatorData(chart, id, indicatorSeriesRef.current[id], data);
      } else {
        // create new series
        indicatorSeriesRef.current[id] = createIndicatorSeries(chart, id, data);
      }
    }

    function nextPaneIndex(ch) {
      try { return ch.panes().length; } catch { return 1; }
    }

    function createIndicatorSeries(ch, indId, candles) {
      const meta = INDICATORS.find((i) => i.id === indId);
      if (!meta) return null;

      if (indId === 'sma20' || indId === 'sma50' || indId === 'sma200') {
        const period = indId === 'sma20' ? 20 : indId === 'sma50' ? 50 : 200;
        const s = ch.addSeries(LineSeries, { color: meta.color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        s.setData(calcSMA(candles, period));
        return s;
      }

      if (indId === 'ema9' || indId === 'ema21') {
        const period = indId === 'ema9' ? 9 : 21;
        const s = ch.addSeries(LineSeries, { color: meta.color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        s.setData(calcEMA(candles, period));
        return s;
      }

      if (indId === 'bb') {
        const bb = calcBollingerBands(candles, 20, 2);
        const sUp = ch.addSeries(LineSeries, { color: meta.color, lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        const sMid = ch.addSeries(LineSeries, { color: meta.color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        const sLow = ch.addSeries(LineSeries, { color: meta.color, lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        sUp.setData(bb.upper);
        sMid.setData(bb.middle);
        sLow.setData(bb.lower);
        return [sUp, sMid, sLow];
      }

      if (indId === 'rsi') {
        const pane = nextPaneIndex(ch);
        const s = ch.addSeries(LineSeries, { color: meta.color, lineWidth: 1.5, lastValueVisible: true, priceLineVisible: false }, pane);
        s.setData(calcRSI(candles, 14));
        return s;
      }

      if (indId === 'macd') {
        const macd = calcMACD(candles);
        const pane = nextPaneIndex(ch);
        const sLine = ch.addSeries(LineSeries, { color: meta.color, lineWidth: 1.5, lastValueVisible: false, priceLineVisible: false }, pane);
        const sSig = ch.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, lastValueVisible: false, priceLineVisible: false }, pane);
        const sHist = ch.addSeries(HistogramSeries, { lastValueVisible: false, priceLineVisible: false }, pane);
        sLine.setData(macd.line);
        sSig.setData(macd.signal);
        sHist.setData(macd.histogram);
        return [sLine, sSig, sHist];
      }

      return null;
    }

    function updateIndicatorData(ch, indId, series, candles) {
      if (!series) return;

      if (indId === 'sma20' || indId === 'sma50' || indId === 'sma200') {
        const period = indId === 'sma20' ? 20 : indId === 'sma50' ? 50 : 200;
        series.setData(calcSMA(candles, period));
      } else if (indId === 'ema9' || indId === 'ema21') {
        const period = indId === 'ema9' ? 9 : 21;
        series.setData(calcEMA(candles, period));
      } else if (indId === 'bb') {
        const bb = calcBollingerBands(candles, 20, 2);
        series[0].setData(bb.upper);
        series[1].setData(bb.middle);
        series[2].setData(bb.lower);
      } else if (indId === 'rsi') {
        series.setData(calcRSI(candles, 14));
      } else if (indId === 'macd') {
        const macd = calcMACD(candles);
        series[0].setData(macd.line);
        series[1].setData(macd.signal);
        series[2].setData(macd.histogram);
      }
    }
  }, [activeIndicators, visibleCandles]);

  function toggleIndicator(id) {
    setActiveIndicators((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ─── Playback timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) { clearInterval(timerRef.current); return; }
    timerRef.current = window.setInterval(() => {
      setPlayIdx((idx) => {
        const next = idx + 1;
        if (next >= allCandles.length) { setPlaying(false); return allCandles.length - 1; }
        return next;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [playing, speed, allCandles.length]);

  // Preserve user-controlled pan/zoom during replay.
  // We intentionally avoid auto-scrolling to the latest candle.

  // ─── Actions ────────────────────────────────────────────────────────────
  function startReplay() {
    setPlayIdx(openCandleIdx);
    setPlaying(true);
  }

  function togglePlay() {
    if (playIdx < 0) { startReplay(); return; }
    if (playIdx >= allCandles.length - 1) { setPlayIdx(openCandleIdx); setPlaying(true); return; }
    setPlaying((p) => !p);
  }

  function stopReplay() {
    setPlaying(false);
    setPlayIdx(-1);
  }

  function stepForward() {
    setPlaying(false);
    setPlayIdx((i) => {
      if (i < 0) return openCandleIdx;
      return Math.min(i + 1, allCandles.length - 1);
    });
  }

  function stepBack() {
    setPlaying(false);
    setPlayIdx((i) => Math.max(0, i < 0 ? allCandles.length - 2 : i - 1));
  }

  // ─── Current candle info ────────────────────────────────────────────────
  const currentCandle = playIdx >= 0 && visibleCandles.length
    ? visibleCandles[visibleCandles.length - 1]
    : null;
  const progress = playIdx >= 0 && allCandles.length > 1
    ? ((playIdx / (allCandles.length - 1)) * 100).toFixed(0)
    : 100;
  const isReplaying = playIdx >= 0;

  // ─── No pair available ─────────────────────────────────────────────────
  if (!binancePair) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border text-center"
        style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-faint)' }}>
        <svg className="h-10 w-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-semibold" style={{ color: 'var(--dash-text-muted)' }}>Chart unavailable for {trade?.symbol || 'this symbol'}</p>
        <p className="mt-1 text-xs">Real-time charts are available for crypto pairs (BTC, ETH, SOL, etc.)</p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef}
      className={`rounded-2xl border overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none flex flex-col' : ''}`}
      style={{
        borderColor: isFullscreen ? 'transparent' : 'var(--dash-border)',
        backgroundColor: isDark ? '#0d0f14' : '#ffffff',
      }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
        style={{ borderColor: 'var(--dash-border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
            <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>
              {trade.symbol} · {binancePair}
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>
              Binance · Real Market Data
              {isReplaying && ` · ${progress}% · ${playIdx + 1}/${allCandles.length}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Timeframe selector */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--dash-border)' }}>
            {INTERVALS.map((itv) => (
              <button key={itv.value} type="button"
                onClick={() => { setInterval_(itv.value); setPlayIdx(-1); setPlaying(false); }}
                className="px-2.5 py-1.5 text-[10px] font-bold transition-colors"
                style={{
                  backgroundColor: interval === itv.value ? 'rgba(0,212,170,0.15)' : 'transparent',
                  color: interval === itv.value ? '#00d4aa' : 'var(--dash-text-faint)',
                }}>
                {itv.label}
              </button>
            ))}
          </div>

          {/* Indicators button */}
          <div className="relative">
            <button type="button"
              onClick={() => setShowIndicatorMenu((v) => !v)}
              className="flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold transition-colors"
              style={{
                borderColor: activeIndicators.length ? 'rgba(0,212,170,0.4)' : 'var(--dash-border)',
                backgroundColor: activeIndicators.length ? 'rgba(0,212,170,0.1)' : 'transparent',
                color: activeIndicators.length ? '#00d4aa' : 'var(--dash-text-faint)',
              }}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Indicators{activeIndicators.length > 0 && ` (${activeIndicators.length})`}
            </button>

            {showIndicatorMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowIndicatorMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border p-2 shadow-xl"
                  style={{ borderColor: 'var(--dash-border)', backgroundColor: isDark ? '#13151a' : '#fff' }}>
                  <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--dash-text-faint)' }}>
                    Overlays
                  </p>
                  {INDICATORS.filter((i) => i.group === 'overlay').map((ind) => {
                    const on = activeIndicators.includes(ind.id);
                    return (
                      <button key={ind.id} type="button" onClick={() => toggleIndicator(ind.id)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/5"
                        style={{ color: on ? ind.color : 'var(--dash-text-muted)' }}>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: ind.color, opacity: on ? 1 : 0.3 }} />
                        <span className="flex-1 font-semibold">{ind.label}</span>
                        {on && <span className="text-[10px]">✓</span>}
                      </button>
                    );
                  })}

                  <div className="my-1.5 border-t" style={{ borderColor: 'var(--dash-border)' }} />

                  <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--dash-text-faint)' }}>
                    Oscillators
                  </p>
                  {INDICATORS.filter((i) => i.group === 'pane').map((ind) => {
                    const on = activeIndicators.includes(ind.id);
                    return (
                      <button key={ind.id} type="button" onClick={() => toggleIndicator(ind.id)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/5"
                        style={{ color: on ? ind.color : 'var(--dash-text-muted)' }}>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: ind.color, opacity: on ? 1 : 0.3 }} />
                        <span className="flex-1 font-semibold">{ind.label}</span>
                        {on && <span className="text-[10px]">✓</span>}
                      </button>
                    );
                  })}

                  {activeIndicators.length > 0 && (
                    <>
                      <div className="my-1.5 border-t" style={{ borderColor: 'var(--dash-border)' }} />
                      <button type="button"
                        onClick={() => { setActiveIndicators([]); setShowIndicatorMenu(false); }}
                        className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-400/10">
                        Clear All
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Speed selector */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--dash-border)' }}>
            {[
              { label: '1x', ms: 200 },
              { label: '2x', ms: 100 },
              { label: '5x', ms: 40 },
              { label: '10x', ms: 15 },
            ].map((s) => (
              <button key={s.label} type="button" onClick={() => setSpeed(s.ms)}
                className="px-2 py-1 text-[10px] font-bold transition-colors"
                style={{
                  backgroundColor: speed === s.ms ? 'rgba(0,212,170,0.15)' : 'transparent',
                  color: speed === s.ms ? '#00d4aa' : 'var(--dash-text-faint)',
                }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Playback controls */}
          <button type="button" onClick={stepBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent/10"
            style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button type="button" onClick={togglePlay}
            className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all"
            style={{
              borderColor: playing ? '#00d4aa50' : 'var(--dash-border)',
              backgroundColor: playing ? 'rgba(0,212,170,0.12)' : 'transparent',
              color: playing ? '#00d4aa' : 'var(--dash-text-secondary)',
            }}>
            {playing ? (
              <><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>Pause</>
            ) : (
              <><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>{isReplaying ? 'Resume' : 'Replay'}</>
            )}
          </button>

          <button type="button" onClick={stepForward}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent/10"
            style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {isReplaying && (
            <button type="button" onClick={stopReplay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent/10"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }} title="Show full chart">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* Fullscreen toggle */}
          <button type="button" onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent/10"
            style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Live ticker ────────────────────────────────────────────────────── */}
      {currentCandle && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-b px-5 py-2"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
          <div>
            <span className="text-[10px] mr-1" style={{ color: 'var(--dash-text-faint)' }}>O</span>
            <span className="text-xs font-mono" style={{ color: 'var(--dash-text-muted)' }}>{currentCandle.open?.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] mr-1" style={{ color: 'var(--dash-text-faint)' }}>H</span>
            <span className="text-xs font-mono text-emerald-400/80">{currentCandle.high?.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] mr-1" style={{ color: 'var(--dash-text-faint)' }}>L</span>
            <span className="text-xs font-mono text-red-400/80">{currentCandle.low?.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] mr-1" style={{ color: 'var(--dash-text-faint)' }}>C</span>
            <span className="text-xs font-bold font-mono" style={{ color: currentCandle.close >= currentCandle.open ? '#22c55e' : '#ef4444' }}>
              {currentCandle.close?.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] mr-1" style={{ color: 'var(--dash-text-faint)' }}>Vol</span>
            <span className="text-xs font-mono" style={{ color: 'var(--dash-text-muted)' }}>
              {currentCandle.volume >= 1e6 ? (currentCandle.volume / 1e6).toFixed(1) + 'M' : currentCandle.volume >= 1e3 ? (currentCandle.volume / 1e3).toFixed(1) + 'K' : currentCandle.volume?.toFixed(0)}
            </span>
          </div>
          {Number.isFinite(entryPrice) && (
            <div>
              <span className="text-[10px] mr-1" style={{ color: 'var(--dash-text-faint)' }}>Entry</span>
              <span className="text-xs font-mono" style={{ color: '#00d4aa' }}>{entryPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Active indicator pills ──────────────────────────────────────── */}
      {activeIndicators.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b px-5 py-1.5" style={{ borderColor: 'var(--dash-border)' }}>
          {activeIndicators.map((id) => {
            const meta = INDICATORS.find((i) => i.id === id);
            if (!meta) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: meta.color + '18', color: meta.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
                <button type="button" onClick={() => toggleIndicator(id)}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">×</button>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Chart area ───────────────────────────────────────────────────── */}
      <div className={`relative ${isFullscreen ? 'flex-1' : ''}`}>
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ backgroundColor: isDark ? 'rgba(13,15,20,0.85)' : 'rgba(255,255,255,0.85)' }}>
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                <p className="text-xs font-semibold" style={{ color: 'var(--dash-text-muted)' }}>
                  Loading {binancePair} {interval} candles…
                </p>
              </div>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ backgroundColor: isDark ? 'rgba(13,15,20,0.85)' : 'rgba(255,255,255,0.85)' }}>
              <div className="flex flex-col items-center gap-2 text-center px-6">
                <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.834-2.694-.834-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm font-semibold text-red-400">{error}</p>
                <button type="button" onClick={loadData}
                  className="mt-1 rounded-lg bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                  Retry
                </button>
              </div>
            </div>
          )}
          <div ref={chartContainerRef} style={{ height: isFullscreen ? '100%' : 'min(72vh, 680px)', minHeight: 460 }} />
        </div>
      </div>

      {/* ── Scrubber (during replay) ───────────────────────────────────────── */}
      {isReplaying && (
        <div className="px-5 pb-4 pt-1">
          <input
            type="range" min={0} max={allCandles.length - 1} value={playIdx}
            onChange={(e) => { setPlayIdx(Number(e.target.value)); setPlaying(false); }}
            className="w-full cursor-pointer h-1.5 rounded-full appearance-none"
            style={{
              accentColor: '#00d4aa',
              background: `linear-gradient(to right, #00d4aa ${progress}%, var(--dash-border) ${progress}%)`,
            }}
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>
              Candle {playIdx + 1} / {allCandles.length}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>
              {new Date((visibleCandles[visibleCandles.length - 1]?.time || 0) * 1000).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
