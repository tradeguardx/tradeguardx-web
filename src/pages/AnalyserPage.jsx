import { useCallback, useEffect, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import { registerSmcOverlays } from '../lib/smcOverlays';
import { useAuth } from '../context/AuthContext';
import { useDashboardTheme } from '../context/DashboardThemeContext';
import SymbolPicker from '../components/dashboard/SymbolPicker';
import {
  fetchAnalyserCandles,
  sendAnalyserChat,
  ANALYSER_INTERVALS,
} from '../api/analyserApi';

/** KLineCharts v10 takes a structured Period, not an interval string. */
const PERIOD_BY_INTERVAL = {
  '1m': { type: 'minute', span: 1 },
  '5m': { type: 'minute', span: 5 },
  '15m': { type: 'minute', span: 15 },
  '1h': { type: 'hour', span: 1 },
  '4h': { type: 'hour', span: 4 },
  '1d': { type: 'day', span: 1 },
};

/** Indicators KLineCharts ships. `pane:true` = own pane under price. */
const INDICATORS = [
  { id: 'MA', label: 'MA' },
  { id: 'EMA', label: 'EMA' },
  { id: 'BOLL', label: 'BOLL' },
  { id: 'SAR', label: 'SAR' },
  { id: 'VOL', label: 'Vol', pane: true },
  { id: 'MACD', label: 'MACD', pane: true },
  { id: 'RSI', label: 'RSI', pane: true },
  { id: 'KDJ', label: 'KDJ', pane: true },
];

/** Built-in overlays, drawn interactively: pick a tool then click the chart. */
/** Vertical rail, like TradingView's. `d` is the SVG path for the icon. */
const DRAW_TOOLS = [
  { id: 'segment', label: 'Trend line', d: 'M4 20L20 4' },
  { id: 'rayLine', label: 'Ray', d: 'M4 20L20 4M20 4l-5 1M20 4l-1 5' },
  { id: 'straightLine', label: 'Extended line', d: 'M2 22L22 2' },
  { id: 'horizontalStraightLine', label: 'Horizontal line', d: 'M3 12h18' },
  { id: 'priceLine', label: 'Price line', d: 'M3 12h13M17 9l4 3-4 3' },
  { id: 'parallelStraightLine', label: 'Parallel channel', d: 'M3 16L15 4M9 20L21 8' },
  { id: 'fibonacciLine', label: 'Fibonacci', d: 'M3 5h18M3 10h18M3 15h18M3 20h18' },
  { id: 'simpleAnnotation', label: 'Note', d: 'M5 4h14v11H9l-4 4V4z' },
];

const CHART_TYPES = [
  { id: 'candle_solid', label: 'Candle' },
  { id: 'candle_stroke', label: 'Hollow' },
  { id: 'area', label: 'Area' },
];

/**
 * Decimals to show for a given price. A fixed 2 was fine for the ten majors, but
 * any pair is selectable now and PEPEUSDT trades at 0.0000026 — two decimals
 * would render the entire chart as 0.00.
 */
function pricePrecisionFor(price) {
  const p = Math.abs(Number(price) || 0);
  if (p === 0) return 2;
  if (p >= 100) return 2;
  if (p >= 1) return 4;
  // Keep ~4 significant digits below 1: 0.0000026 → 9dp.
  return Math.min(Math.ceil(-Math.log10(p)) + 3, 10);
}

const SUGGESTIONS = [
  'Mark the market structure',
  'What is the current bias?',
  'Where did structure break?',
];

/**
 * AI Chart Analyser — chart left, chat right.
 *
 * The AI never invents levels: every drawing comes from the server's
 * deterministic structure engine and is plotted verbatim. Candles come from the
 * same endpoint the analysis runs on, so a label always lands on the bar the
 * user is looking at.
 */
export default function AnalyserPage() {
  const { session } = useAuth();
  const { isDark } = useDashboardTheme();
  const accessToken = session?.access_token;

  const [symbol, setSymbol] = useState('BTCUSDT');
  // Named timeframe, not `interval`: a state setter called setInterval would
  // shadow the global timer function inside this component.
  const [timeframe, setTimeframe] = useState('1h');
  const [candles, setCandles] = useState([]);
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState(['VOL']);
  const [chartType, setChartType] = useState('candle_solid');
  const [activeTool, setActiveTool] = useState(null);
  const [showIndicators, setShowIndicators] = useState(false);
  /** User-drawn overlay ids, newest last — powers undo. */
  const userOverlayIdsRef = useRef([]);

  const containerRef = useRef(null);
  const chartRef = useRef(null);
  /** Ids of overlays this page drew, so we clear ours without touching the user's. */
  const aiOverlayIdsRef = useRef([]);
  /** Latest candles, read by the data loader without re-registering it. */
  const candlesRef = useRef([]);
  /** Last AI drawing set, so clearing user scribbles can restore it. */
  const lastDrawingsRef = useRef(null);
  /** Set when the AI (not the user) changed symbol/timeframe, so the reset
   *  effect keeps the chat instead of clearing it mid-conversation. */
  const aiSwitchRef = useRef(false);

  // Custom zone/ray overlays must exist before any createOverlay call.
  registerSmcOverlays();

  // ─── chart lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const chart = init(el, {
      styles: {
        grid: {
          horizontal: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' },
          vertical: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' },
        },
        candle: {
          bar: {
            upColor: '#22c55e', downColor: '#ef4444',
            upBorderColor: '#22c55e', downBorderColor: '#ef4444',
            upWickColor: '#22c55e', downWickColor: '#ef4444',
          },
          tooltip: { showRule: 'follow_cross' },
        },
      },
    });
    chartRef.current = chart;

    // v10 replaced applyNewData/updateData with a pull-based loader. Candles are
    // already fetched into candlesRef by the effect below, so this just hands
    // over whatever is current — keeping ONE source shared with the AI.
    chart.setDataLoader({
      getBars: ({ type, callback }) => {
        if (type === 'init') callback(candlesRef.current, false);
        else callback([], false); // no paging back — the window is fixed per request
      },
    });

    return () => {
      // Dispose the captured element, not containerRef.current — React may have
      // already nulled the ref by cleanup time, and dispose(null) throws.
      dispose(el);
      chartRef.current = null;
      aiOverlayIdsRef.current = [];
    };
  }, [isDark]);

  // ─── candles ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return undefined;
    const ctrl = new AbortController();
    setLoading(true);
    setLoadErr('');

    fetchAnalyserCandles({ accessToken, symbol, interval: timeframe, limit: 500, signal: ctrl.signal })
      .then((d) => setCandles(d?.candles || []))
      .catch((e) => {
        if (e?.name !== 'AbortError') setLoadErr(e?.message || 'Could not load candles');
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [accessToken, symbol, timeframe]);

  // Push candles into the chart. Backend sends `time` in SECONDS (lightweight-
  // charts' convention, shared with the replay chart); KLineCharts wants
  // `timestamp` in MILLISECONDS — hence the x1000.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;

    candlesRef.current = candles.map((c) => ({
      timestamp: c.time * 1000,
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
    }));

    chart.setSymbol({
      ticker: symbol,
      pricePrecision: pricePrecisionFor(candles[candles.length - 1]?.close),
      volumePrecision: 2,
    });
    chart.setPeriod(PERIOD_BY_INTERVAL[timeframe] || { type: 'hour', span: 1 });
  }, [candles, symbol, timeframe]);

  // Changing symbol/timeframe invalidates any drawn structure.
  useEffect(() => {
    clearAiOverlays();
    if (aiSwitchRef.current) {
      aiSwitchRef.current = false; // AI-driven switch: keep the conversation
      return;
    }
    setMessages([]);
  }, [symbol, timeframe]);

  function clearAiOverlays() {
    const chart = chartRef.current;
    if (!chart) return;
    for (const id of aiOverlayIdsRef.current) {
      try { chart.removeOverlay({ id }); } catch { /* already gone */ }
    }
    aiOverlayIdsRef.current = [];
  }

  /** Applies drawings verbatim — engine output, never model prose. */
  const applyDrawings = useCallback((drawings) => {
    const chart = chartRef.current;
    if (!chart || !Array.isArray(drawings)) return;

    lastDrawingsRef.current = drawings;
    clearAiOverlays();
    const ids = [];

    const rgba = (hex, a) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };

    for (const d of drawings) {
      try {
        let id = null;

        if (d.kind === 'zone') {
          // Mitigated zones are history — keep them, but faint, so live ones read first.
          const alpha = d.mitigated ? 0.06 : 0.16;
          id = chart.createOverlay({
            name: 'smcZone',
            points: [
              { timestamp: d.from * 1000, value: d.top },
              { timestamp: d.from * 1000, value: d.bottom },
            ],
            extendData: {
              text: d.text,
              fill: rgba(d.color, alpha),
              border: rgba(d.color, d.mitigated ? 0.2 : 0.45),
              textColor: rgba(d.color, d.mitigated ? 0.5 : 0.9),
            },
          });
        } else if (d.kind === 'ray') {
          id = chart.createOverlay({
            name: 'smcRay',
            points: [{ timestamp: d.time * 1000, value: d.price }],
            extendData: { text: d.text, color: d.color },
          });
        } else if (d.kind === 'marker') {
          id = chart.createOverlay({
            name: 'simpleAnnotation',
            points: [{ timestamp: d.time * 1000, value: d.price }],
            extendData: d.text,
            styles: { text: { color: d.color }, line: { color: d.color } },
          });
        } else if (d.kind === 'level') {
          id = chart.createOverlay({
            name: 'priceLine',
            points: [{ value: d.price }],
            extendData: d.title,
            styles: { line: { color: d.color, style: 'dashed' }, text: { color: d.color } },
          });
        }

        if (id) ids.push(id);
      } catch { /* one bad overlay shouldn't drop the rest */ }
    }

    aiOverlayIdsRef.current = ids.flat().filter(Boolean);
  }, []);

  // ─── toolbar ──────────────────────────────────────────────────────────────
  function toggleIndicator(id) {
    const chart = chartRef.current;
    if (!chart) return;
    const meta = INDICATORS.find((i) => i.id === id);
    setActiveIndicators((cur) => {
      if (cur.includes(id)) {
        chart.removeIndicator({ name: id });
        return cur.filter((x) => x !== id);
      }
      // Overlay onto the candle pane unless the indicator needs its own scale
      // (MACD/RSI/KDJ/VOL are on wildly different ranges to price).
      chart.createIndicator(
        meta?.pane ? { name: id } : { name: id, paneId: 'candle_pane' },
        !meta?.pane,
      );
      return [...cur, id];
    });
  }

  function applyChartType(id) {
    setChartType(id);
    chartRef.current?.setStyles({ candle: { type: id } });
  }

  /** Enters interactive draw mode — the next click(s) place the overlay. */
  function startDrawing(name) {
    const id = chartRef.current?.createOverlay({ name });
    if (id) userOverlayIdsRef.current.push(id);
    // Reflect the armed tool, so it's obvious the next click will draw.
    setActiveTool(name);
  }

  function undoDrawing() {
    const id = userOverlayIdsRef.current.pop();
    if (id) chartRef.current?.removeOverlay({ id });
  }

  function clearUserDrawings() {
    const chart = chartRef.current;
    if (!chart) return;
    // Wipe everything, then re-apply ours so the AI's structure survives a
    // "clear drawings" click.
    chart.removeOverlay();
    aiOverlayIdsRef.current = [];
    userOverlayIdsRef.current = [];
    setActiveTool(null);
    if (lastDrawingsRef.current) applyDrawings(lastDrawingsRef.current);
  }

  // ─── chat ─────────────────────────────────────────────────────────────────
  const ask = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || thinking || !accessToken) return;

    const next = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setThinking(true);

    try {
      const res = await sendAnalyserChat({ accessToken, symbol, interval: timeframe, messages: next });
      setMessages([...next, { role: 'assistant', content: res?.reply || '(no response)' }]);

      // The AI can switch chart via its switch_chart tool. Follow it, but don't
      // let the symbol/timeframe effect wipe the conversation it just produced —
      // that effect clears messages, so guard it with a ref.
      const switched = (res?.symbol && res.symbol !== symbol) || (res?.interval && res.interval !== timeframe);
      if (switched) {
        aiSwitchRef.current = true;
        if (res.symbol) setSymbol(res.symbol);
        if (res.interval) setTimeframe(res.interval);
      }
      applyDrawings(res?.drawings);
    } catch (e) {
      setMessages([...next, {
        role: 'assistant',
        content: `Couldn't analyse that: ${e?.message || 'unknown error'}`,
        error: true,
      }]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, accessToken, messages, symbol, timeframe, applyDrawings]);

  const selectStyle = {
    backgroundColor: 'var(--dash-bg-input)',
    border: '1px solid var(--dash-border)',
    color: 'var(--dash-text-primary)',
  };

  const btn = (active) => ({
    backgroundColor: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--surface-950, #0d0f14)' : 'var(--dash-text-muted)',
  });
  const barStyle = { backgroundColor: 'var(--dash-bg-input)', border: '1px solid var(--dash-border)' };
  const panelH = 'calc(100vh - 190px)';

  return (
    <div className="w-full">
      {/* Top bar: symbol · timeframe · chart type · indicators · undo/clear */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SymbolPicker value={symbol} onChange={setSymbol} accessToken={accessToken} />

        <div className="flex rounded-lg p-0.5" style={barStyle}>
          {ANALYSER_INTERVALS.map((iv) => (
            <button key={iv.value} type="button" onClick={() => setTimeframe(iv.value)}
              className="rounded px-2 py-1 text-xs font-semibold transition-colors"
              style={btn(timeframe === iv.value)}>{iv.label}</button>
          ))}
        </div>

        <div className="flex rounded-lg p-0.5" style={barStyle}>
          {CHART_TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => applyChartType(t.id)}
              className="rounded px-2 py-1 text-xs font-semibold transition-colors"
              style={btn(chartType === t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Indicators behind one button, like TradingView — 8 inline toggles
            crowded the bar and will only get worse as more are added. */}
        <div className="relative">
          <button type="button" onClick={() => setShowIndicators((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
            style={{ ...barStyle, color: 'var(--dash-text-secondary)' }}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M3 17l5-6 4 4 5-8 4 5" />
            </svg>
            Indicators
            {activeIndicators.length > 0 && (
              <span className="rounded px-1 text-[10px] font-bold"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--surface-950, #0d0f14)' }}>
                {activeIndicators.length}
              </span>
            )}
          </button>

          {showIndicators && (
            <div className="absolute left-0 top-9 z-30 w-44 rounded-xl border p-1 shadow-xl"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
              {INDICATORS.map((i) => (
                <button key={i.id} type="button" onClick={() => toggleIndicator(i.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--dash-bg-card-hover)]"
                  style={{ color: 'var(--dash-text-secondary)' }}>
                  <span>{i.label}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>
                      {i.pane ? 'pane' : 'price'}
                    </span>
                    <span className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: activeIndicators.includes(i.id) ? 'var(--accent)' : 'var(--dash-border)' }} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={undoDrawing} title="Undo last drawing"
          className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ ...barStyle, color: 'var(--dash-text-muted)' }}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h11a5 5 0 010 10h-3" />
          </svg>
        </button>

        {loading && <span className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>Loading…</span>}
        {loadErr && <span className="text-xs text-amber-400">{loadErr}</span>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[auto_1fr_360px] xl:grid-cols-[auto_1fr_420px]">
        {/* Vertical drawing rail — TradingView's layout. */}
        <div className="flex flex-col gap-1 rounded-xl border p-1"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', height: 'fit-content' }}>
          {DRAW_TOOLS.map((t) => (
            <button key={t.id} type="button" onClick={() => startDrawing(t.id)} title={t.label}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--dash-bg-card-hover)]"
              style={{
                backgroundColor: activeTool === t.id ? 'rgba(0,212,170,0.15)' : 'transparent',
                color: activeTool === t.id ? 'var(--accent)' : 'var(--dash-text-muted)',
              }}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={t.d} />
              </svg>
            </button>
          ))}
          <div className="my-0.5 h-px" style={{ backgroundColor: 'var(--dash-border)' }} />
          <button type="button" onClick={clearUserDrawings} title="Clear drawings (keeps AI structure)"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-amber-400 hover:bg-[var(--dash-bg-card-hover)]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" />
            </svg>
          </button>
        </div>

        <div className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <div ref={containerRef} style={{ width: '100%', height: panelH, minHeight: 520 }} />
        </div>

        <div className="flex flex-col rounded-2xl border"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', height: panelH, minHeight: 520 }}>
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--dash-border)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>Chart analyst</p>
            <p className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
              Reads the real candles and marks what it finds. Analysis only — no trade calls.
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                {SUGGESTIONS.map((sg) => (
                  <button key={sg} type="button" onClick={() => ask(sg)}
                    className="block w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--dash-bg-card-hover)]"
                    style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>
                    {sg}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i}
                className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed ${m.role === 'user' ? 'ml-8' : 'mr-2'}`}
                style={{
                  backgroundColor: m.role === 'user' ? 'rgba(0,212,170,0.10)' : 'var(--dash-bg-input)',
                  color: m.error ? '#f59e0b' : 'var(--dash-text-primary)',
                  whiteSpace: 'pre-wrap',
                }}>
                {m.content}
              </div>
            ))}

            {thinking && (
              <div className="mr-2 rounded-xl px-3 py-2 text-[13px]"
                style={{ backgroundColor: 'var(--dash-bg-input)', color: 'var(--dash-text-muted)' }}>
                Reading the chart…
              </div>
            )}
          </div>

          <form className="flex gap-2 border-t p-3" style={{ borderColor: 'var(--dash-border)' }}
            onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this chart…" disabled={thinking}
              className="h-9 flex-1 rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
              style={selectStyle} />
            <button type="submit" disabled={thinking || !input.trim()}
              className="h-9 rounded-lg bg-accent px-4 text-sm font-bold text-surface-950 disabled:opacity-50">
              Ask
            </button>
          </form>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
        Analysis only — not trading advice. Candles are sourced from Binance spot pairs, which track but do not
        exactly match your Delta contract prices.
      </p>
    </div>
  );
}
