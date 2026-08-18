import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts';
import { useAuth } from '../context/AuthContext';
import { useDashboardTheme } from '../context/DashboardThemeContext';
import SymbolPicker from '../components/dashboard/SymbolPicker';
import {
  fetchAnalyserCandles,
  sendAnalyserChat,
  startVisionAnalysis,
  getVisionAnalysisStatus,
  ANALYSER_INTERVALS,
  VISION_ANALYSIS_TIMEFRAMES,
} from '../api/analyserApi';
import { LightweightChartsCoordinateAdapter } from '../components/marketStructure/LightweightChartsCoordinateAdapter';
import { buildVisionAnnotationViewModel } from '../components/marketStructure/buildVisionAnnotationViewModel';
import { captureMultiTimeframeScreenshots } from '../components/marketStructure/captureMultiTimeframeScreenshots';
import { MarketStructureCanvasPrimitive } from '../components/marketStructure/MarketStructureCanvasPrimitive';
import { AiActivityTimeline, AiCompletedSummary } from '../components/marketStructure/AiAnalysisPanelParts';
import { ChatMessage, ThinkingIndicator } from '../components/marketStructure/ChatMessage';

/** Structure overlay categories — keys match `buildVisionAnnotationViewModel`'s `visibleCategories` contract exactly. */
const STRUCTURE_CATEGORIES = [
  { key: 'levels', label: 'Structure' },
  { key: 'events', label: 'BOS · CHoCH' },
  { key: 'liquidity', label: 'Liquidity' },
  { key: 'orderBlocks', label: 'Order Blocks' },
  { key: 'fvg', label: 'Fair Value Gaps' },
  { key: 'swings', label: 'Swing Points' },
  { key: 'volume', label: 'Volume Confirmation' },
];

/**
 * Draw, don't tell: these no longer ask the AI to write a paragraph — they
 * spotlight the matching layer on the chart (hide everything else) and
 * center the view on the single most relevant finding for it, sourced
 * straight from the already-validated "Analyze with AI" result.
 */
const SPOTLIGHT_ACTIONS = [
  {
    key: 'swings', label: 'Swing Structure', icon: 'M4 17l5-6 4 4 5-8 4 5',
    pick: (r) => [...(r.swings || [])].sort((a, b) => b.timestamp - a.timestamp)[0],
  },
  {
    key: 'events', label: 'Recent Events', icon: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
    pick: (r) => [...(r.events || [])].sort((a, b) => b.timestamp - a.timestamp)[0],
  },
  {
    key: 'liquidity', label: 'Liquidity', icon: 'M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0',
    pick: (r) => [...(r.liquiditySweeps || [])].sort((a, b) => b.timestamp - a.timestamp)[0] ?? (r.liquidity || [])[0],
  },
  {
    key: 'orderBlocks', label: 'Order Blocks', icon: 'M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8',
    pick: (r) => [...(r.orderBlocks || [])].sort((a, b) => (b.importance || 0) - (a.importance || 0))[0],
  },
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

function candlesToSeriesData(candles) {
  return candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));
}

function candlesToVolumeData(candles) {
  return candles.map((c) => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
  }));
}

/** Candles visible by default — a readable recent zoom, not the whole ~2-month load. */
const DEFAULT_VISIBLE_BARS = 120;

/** fitContent() would zoom out to show all 1500-candle history at once; this
 *  keeps the full range loaded (scrollable back) but starts zoomed into the
 *  recent window, like any real chart's default. */
function showRecentWindow(chart, candleCount) {
  if (!chart || candleCount === 0) return;
  chart.timeScale().setVisibleLogicalRange({
    from: Math.max(0, candleCount - DEFAULT_VISIBLE_BARS),
    to: candleCount - 1,
  });
}

/**
 * AI Chart Analyser — chart is the hero, structure panel is compact and secondary.
 *
 * All chart annotations come from a validated AI Market Analyzer session (real
 * vision + reasoning over real screenshots, cross-checked against candle data)
 * — nothing is shown on the chart or in the panel until that analysis
 * completes. There is no manual drawing tool and no placeholder/fake data —
 * TradeGuardX is not a charting application.
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
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // ─── Market Structure annotations — on by default, curated content only ──
  const [structureVisibleCategories, setStructureVisibleCategories] = useState({
    levels: true, events: true, liquidity: true, orderBlocks: true, fvg: true, swings: true, volume: true,
    // Not a toggleable chart-annotation category like the others — the entry/SL/TP
    // lines and recommendation card stay on regardless of which single category
    // is spotlighted below (see `spotlightCategory`).
    tradeSetup: true,
  });
  const [showStructureMenu, setShowStructureMenu] = useState(false);
  const coordinateAdapterRef = useRef(null);
  /** Draws annotations directly onto the chart's own canvas (lightweight-charts
   *  primitives API) — no separate SVG/DOM layer to keep in sync. */
  const structurePrimitiveRef = useRef(null);

  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  /** Set when the AI (not the user) changed symbol/timeframe, so the reset
   *  effect keeps the chat instead of clearing it mid-conversation. */
  const aiSwitchRef = useRef(false);
  const chatScrollRef = useRef(null);

  // ─── "Analyze with AI" — one click = one AnalysisSession ─────────────────
  // phase: 'idle' | 'capturing' | 'processing' | 'completed' | 'error'
  const [aiAnalysis, setAiAnalysis] = useState({
    phase: 'idle', captureEvents: [], sessionId: null, serverEvents: [], result: null, errorMessage: null,
  });
  const pollTimerRef = useRef(null);
  const pollingSessionIdRef = useRef(null);

  useEffect(() => () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  }, []);

  // ─── chart lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight || 520,
      layout: {
        background: { type: 'solid', color: isDark ? '#0d0f14' : '#ffffff' },
        textColor: isDark ? '#9ca3af' : '#6b7280',
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.18 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55eaa', wickDownColor: '#ef4444aa',
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const adapter = new LightweightChartsCoordinateAdapter(chart, candleSeries);
    coordinateAdapterRef.current = adapter;

    // Attached to the candle series itself — draws on the SAME canvas the
    // candles use, in the same render pass. draw() resolves every position
    // fresh from this adapter's live state on every call, so pan/zoom/resize
    // need no explicit wiring here at all — the chart already calls draw()
    // for those on its own, and each call re-reads current coordinates
    // instead of replaying something computed earlier. setModel() is only
    // for when the underlying DATA changes (new analysis, category toggle,
    // timeframe switch), never for repositioning.
    const primitive = new MarketStructureCanvasPrimitive(adapter);
    candleSeries.attachPrimitive(primitive);
    structurePrimitiveRef.current = primitive;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      chart.resize(width, height);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      coordinateAdapterRef.current = null;
      structurePrimitiveRef.current = null;
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [isDark]);

  // ─── candles ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return undefined;
    const ctrl = new AbortController();
    setLoading(true);
    setLoadErr('');

    // 1500 candles gives at least ~2 months of history on the default 1h
    // timeframe (1440 candles = 60 days) and proportionally more on coarser
    // ones — 500 was only ~3 weeks on 1h, which read as "no old data".
    fetchAnalyserCandles({ accessToken, symbol, interval: timeframe, limit: 1500, signal: ctrl.signal })
      .then((d) => setCandles(d?.candles || []))
      .catch((e) => {
        if (e?.name !== 'AbortError') setLoadErr(e?.message || 'Could not load candles');
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [accessToken, symbol, timeframe]);

  // Push candles into the chart. Backend sends `time` in SECONDS — the same
  // unit lightweight-charts is natively built around, so no conversion here
  // (contrast the coordinate adapter, which converts ms↔s at its boundary for
  // the vision pipeline's millisecond timestamps).
  useEffect(() => {
    const series = candleSeriesRef.current;
    const volSeries = volumeSeriesRef.current;
    if (!series || candles.length === 0) return;

    const precision = pricePrecisionFor(candles[candles.length - 1]?.close);
    series.applyOptions({ priceFormat: { type: 'price', precision, minMove: 10 ** -precision } });

    series.setData(candlesToSeriesData(candles));
    volSeries?.setData(candlesToVolumeData(candles));
    showRecentWindow(chartRef.current, candles.length);
  }, [candles, symbol, timeframe]);

  // Purely logical (timestamp/price, no pixels) — recomputes only when the
  // underlying DATA changes (new analysis, category toggle, timeframe
  // switch), never on pan/zoom/resize. The canvas primitive resolves this to
  // screen coordinates itself, fresh on every frame it draws. Nothing is
  // shown until a real "Analyze with AI" session completes — no placeholder.
  const structureViewModel = useMemo(() => {
    if (aiAnalysis.phase !== 'completed' || !aiAnalysis.result) return null;
    return buildVisionAnnotationViewModel(aiAnalysis.result, {
      activeTimeframe: timeframe,
      visibleCategories: structureVisibleCategories,
    });
  }, [aiAnalysis, structureVisibleCategories, timeframe]);

  // Feed the latest LOGICAL model to the canvas primitive. Pan/zoom/resize
  // need no call here at all — draw() re-resolves pixel positions itself,
  // every frame; this only fires when the data actually changed.
  useEffect(() => {
    structurePrimitiveRef.current?.setModel(structureViewModel, timeframe);
  }, [structureViewModel, timeframe]);

  const timeframeLabel = useMemo(
    () => ANALYSER_INTERVALS.find((iv) => iv.value === timeframe)?.label ?? timeframe,
    [timeframe],
  );

  // Changing symbol/timeframe invalidates the conversation, unless the AI itself drove the switch.
  useEffect(() => {
    if (aiSwitchRef.current) {
      aiSwitchRef.current = false; // AI-driven switch: keep the conversation
      return;
    }
    setMessages([]);
  }, [symbol, timeframe]);

  // Keep the chat thread pinned to the newest message/analysis update, like any chat UI.
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, aiAnalysis.phase, aiAnalysis.captureEvents, aiAnalysis.serverEvents]);

  // ─── "Analyze with AI" ──────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollingSessionIdRef.current = null;
  }, []);

  // A completed analysis' findings carry no symbol field — only timeframe —
  // so switching to a DIFFERENT symbol must drop it, or its prices would
  // render as if they belonged to the new chart. Timeframe alone must NOT
  // trigger this: the whole point of one multi-timeframe session is that
  // switching 4h/1h/15m/5m re-filters the SAME result, never re-fetches it.
  const lastAnalyzedSymbolRef = useRef(symbol);
  useEffect(() => {
    if (lastAnalyzedSymbolRef.current === symbol) return;
    lastAnalyzedSymbolRef.current = symbol;
    stopPolling();
    setAiAnalysis({ phase: 'idle', captureEvents: [], sessionId: null, serverEvents: [], result: null, errorMessage: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stopPolling is stable (empty deps); only symbol should trigger this
  }, [symbol]);

  const pollSession = useCallback((sessionId) => {
    pollingSessionIdRef.current = sessionId;
    const poll = async () => {
      // A newer session may have started (Analyze Again) — abandon a stale poll.
      if (pollingSessionIdRef.current !== sessionId) return;
      try {
        const status = await getVisionAnalysisStatus({ accessToken, sessionId });
        if (pollingSessionIdRef.current !== sessionId) return;
        setAiAnalysis((cur) => ({
          ...cur,
          serverEvents: status.events || [],
          result: status.result,
          errorMessage: status.errorMessage,
        }));
        if (status.status === 'COMPLETED') {
          stopPolling();
          // Stay on whatever timeframe the user already has selected — every
          // timeframe was analyzed and has its own structure/findings, so
          // there's no reason to jump the chart to the AI's own arbitrary
          // "primaryTimeframe" pick out from under the user.
          setAiAnalysis((cur) => ({ ...cur, phase: 'completed' }));
        } else if (status.status === 'ERROR') {
          stopPolling();
          setAiAnalysis((cur) => ({ ...cur, phase: 'error', errorMessage: status.errorMessage || 'Analysis failed' }));
        }
      } catch {
        // Transient poll failure — try again on the next tick rather than aborting the session.
      }
    };
    poll();
    pollTimerRef.current = setInterval(poll, 1500);
  }, [accessToken, stopPolling]);

  const runAiAnalysis = useCallback(async () => {
    if (!accessToken || !chartRef.current || !candleSeriesRef.current || aiAnalysis.phase === 'capturing' || aiAnalysis.phase === 'processing') return;
    stopPolling();
    setAiAnalysis({ phase: 'capturing', captureEvents: [], sessionId: null, serverEvents: [], result: null, errorMessage: null });

    const originalSymbol = symbol;

    try {
      const screenshots = await captureMultiTimeframeScreenshots({
        chart: chartRef.current,
        candleSeries: candleSeriesRef.current,
        symbol: originalSymbol,
        timeframes: VISION_ANALYSIS_TIMEFRAMES,
        fetchCandles: ({ symbol: sym, interval }) => fetchAnalyserCandles({ accessToken, symbol: sym, interval, limit: 200 }),
        onProgress: (tf, phase, extra) => {
          setAiAnalysis((cur) => ({
            ...cur,
            captureEvents: [
              ...cur.captureEvents,
              {
                type: 'TIMEFRAME_CAPTURE', timeframe: tf, status: phase,
                message: phase === 'started' ? `Preparing ${tf} chart` : `${tf} captured`,
                thumbnailUrl: extra?.dataUrl, timestamp: Date.now(),
              },
            ],
          }));
        },
      });

      // Capture drove the chart through every timeframe directly (bypassing
      // React state) — restore it to what state still says is current before
      // handing off to the (much longer) background analysis wait.
      const precision = pricePrecisionFor(candles[candles.length - 1]?.close);
      candleSeriesRef.current.applyOptions({ priceFormat: { type: 'price', precision, minMove: 10 ** -precision } });
      candleSeriesRef.current.setData(candlesToSeriesData(candles));
      volumeSeriesRef.current?.setData(candlesToVolumeData(candles));
      showRecentWindow(chartRef.current, candles.length);

      setAiAnalysis((cur) => ({ ...cur, phase: 'processing' }));
      const started = await startVisionAnalysis({ accessToken, symbol: originalSymbol, screenshots });
      setAiAnalysis((cur) => ({ ...cur, sessionId: started.sessionId }));
      pollSession(started.sessionId);
    } catch (e) {
      setAiAnalysis((cur) => ({ ...cur, phase: 'error', errorMessage: e?.message || 'Analysis failed' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- aiAnalysis.phase read only as a guard; including it would re-create this on every progress tick
  }, [accessToken, symbol, candles, pollSession, stopPolling]);

  /** A clicked finding: switch to its timeframe, wait for the candle load, then center on it. */
  const navigateToFinding = useCallback((finding) => {
    if (!finding?.timeframe) return;
    if (finding.timeframe !== timeframe) {
      aiSwitchRef.current = true;
      setTimeframe(finding.timeframe);
    }
    const centerTimestampMs = finding.timestamp ?? finding.startTimestamp;
    if (centerTimestampMs != null) {
      const centerTimeSec = Math.floor(centerTimestampMs / 1000);
      // Give the candle-load effect a moment to land before re-centering.
      setTimeout(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const visible = chart.timeScale().getVisibleRange();
        const halfWindowSec = visible ? (visible.to - visible.from) / 2 : 43_200; // 12h fallback
        chart.timeScale().setVisibleRange({ from: centerTimeSec - halfWindowSec, to: centerTimeSec + halfWindowSec });
      }, 400);
    }
  }, [timeframe]);

  /** Pill switch in the completed summary: same analysis session, different timeframe's structure plotted. */
  const switchAnalysisTimeframe = useCallback((tf) => {
    if (tf === timeframe) return;
    aiSwitchRef.current = true;
    setTimeframe(tf);
  }, [timeframe]);

  /** A SPOTLIGHT_ACTIONS click: isolate one layer on the chart and jump to its most relevant finding — no chat round-trip. */
  const spotlightCategory = useCallback((key, pick) => {
    setStructureVisibleCategories({ levels: false, events: false, liquidity: false, orderBlocks: false, fvg: false, swings: false, volume: false, tradeSetup: true, [key]: true });
    const finding = aiAnalysis.result ? pick(aiAnalysis.result) : null;
    if (finding) navigateToFinding(finding);
  }, [aiAnalysis.result, navigateToFinding]);

  // ─── chat ─────────────────────────────────────────────────────────────────
  const ask = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || thinking || !accessToken) return;

    const next = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setThinking(true);

    try {
      // Ground the answer in the SAME validated analysis the chart is drawing
      // from, when one exists for this symbol — never a separate re-analysis
      // that could disagree with what's on screen.
      const groundingSessionId = aiAnalysis.phase === 'completed' ? aiAnalysis.sessionId : undefined;
      const res = await sendAnalyserChat({ accessToken, symbol, interval: timeframe, messages: next, sessionId: groundingSessionId });
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
    } catch (e) {
      setMessages([...next, {
        role: 'assistant',
        content: `Couldn't analyse that: ${e?.message || 'unknown error'}`,
        error: true,
      }]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, accessToken, messages, symbol, timeframe, aiAnalysis.phase, aiAnalysis.sessionId]);

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
      {/* Top bar: symbol · timeframe · structure */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SymbolPicker value={symbol} onChange={setSymbol} accessToken={accessToken} />

        <div className="flex rounded-lg p-0.5" style={barStyle}>
          {ANALYSER_INTERVALS.map((iv) => (
            <button key={iv.value} type="button" onClick={() => setTimeframe(iv.value)}
              className="rounded px-2 py-1 text-xs font-semibold transition-colors"
              style={btn(timeframe === iv.value)}>{iv.label}</button>
          ))}
        </div>

        {/* Market Structure — automatically generated annotations, curated by
            default. No manual drawing tools; this is the only annotation
            control on the page. */}
        <div className="relative">
          <button type="button" onClick={() => setShowStructureMenu((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
            style={{ ...barStyle, color: 'var(--dash-text-secondary)' }}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 17l5-9 4 5 3-4 4 8" />
            </svg>
            Structure
          </button>

          {showStructureMenu && (
            <div className="absolute left-0 top-9 z-30 w-48 rounded-xl border p-2 shadow-xl"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--dash-text-faint)' }}>
                Market Structure
              </p>
              {STRUCTURE_CATEGORIES.map(({ key, label }) => (
                <button key={key} type="button"
                  onClick={() => setStructureVisibleCategories((cur) => ({ ...cur, [key]: !cur[key] }))}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-[var(--dash-bg-card-hover)]"
                  style={{ color: 'var(--dash-text-secondary)' }}>
                  <span>{label}</span>
                  <span className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
                    style={{ backgroundColor: structureVisibleCategories[key] ? 'var(--accent)' : 'var(--dash-border)' }}>
                    <span className="absolute h-3 w-3 rounded-full bg-white transition-transform"
                      style={{ transform: structureVisibleCategories[key] ? 'translateX(14px)' : 'translateX(2px)' }} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <span className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>Loading…</span>}
        {loadErr && <span className="text-xs text-amber-400">{loadErr}</span>}
      </div>

      {/* Chart is the hero (~78% desktop); the analysis panel is compact and secondary (~22%). */}
      <div
        className={`grid gap-3 transition-[grid-template-columns] duration-200 ${
          chatCollapsed ? 'lg:grid-cols-[1fr_44px]' : 'lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px]'
        }`}
      >
        <div className="relative rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <div ref={containerRef} style={{ width: '100%', height: panelH, minHeight: 520 }} />
        </div>

        <div className="flex flex-col rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', height: panelH, minHeight: 520 }}>
          {chatCollapsed ? (
            <button type="button" onClick={() => setChatCollapsed(false)} title="Expand"
              className="flex h-full w-full flex-col items-center gap-3 pt-4 transition-colors hover:bg-[var(--dash-bg-card-hover)]">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                style={{ color: 'var(--dash-text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M20 19l-7-7 7-7" />
              </svg>
              <span className="text-[11px] font-bold tracking-wide" style={{ writingMode: 'vertical-rl', color: 'var(--dash-text-secondary)' }}>
                Market Structure
              </span>
            </button>
          ) : (
          <>
          <div className="flex items-start justify-between gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--dash-border)' }}>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>Market Structure</p>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--dash-text-muted)' }}>{symbol} · {timeframeLabel}</p>
            </div>
            <button type="button" onClick={() => setChatCollapsed(true)} title="Collapse"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--dash-bg-card-hover)]"
              style={{ color: 'var(--dash-text-muted)' }}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M4 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="border-b p-2.5" style={{ borderColor: 'var(--dash-border)' }}>
            <button type="button"
              disabled={aiAnalysis.phase === 'capturing' || aiAnalysis.phase === 'processing'}
              onClick={runAiAnalysis}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--surface-950, #0d0f14)' }}>
              <span>✦</span>
              {aiAnalysis.phase === 'capturing' && 'Capturing charts…'}
              {aiAnalysis.phase === 'processing' && 'Analyzing…'}
              {(aiAnalysis.phase === 'idle') && 'Analyze with AI'}
              {aiAnalysis.phase === 'completed' && 'Analyze Again'}
              {aiAnalysis.phase === 'error' && 'Try Again'}
            </button>
          </div>

          {/* Outer div scrolls; inner flex column pins content to the BOTTOM
              (justify-end + min-h-full) so a short/empty conversation sits
              just above the input like any chat app, instead of floating at
              the top with dead space below it. Long threads still scroll
              normally — min-h-full is a floor, not a fixed height. */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3">
          <div className="flex min-h-full flex-col justify-end space-y-3">
            {(aiAnalysis.phase === 'capturing' || aiAnalysis.phase === 'processing') && (
              <AiActivityTimeline captureEvents={aiAnalysis.captureEvents} serverEvents={aiAnalysis.serverEvents} timeframes={VISION_ANALYSIS_TIMEFRAMES} />
            )}

            {aiAnalysis.phase === 'error' && (
              <div className="rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                Unable to complete analysis. {aiAnalysis.errorMessage || ''}
              </div>
            )}

            {aiAnalysis.phase === 'completed' && aiAnalysis.result && (
              <AiCompletedSummary
                result={aiAnalysis.result}
                activeTimeframe={timeframe}
                onNavigate={navigateToFinding}
                analyzedTimeframes={VISION_ANALYSIS_TIMEFRAMES}
                onSwitchTimeframe={switchAnalysisTimeframe}
              />
            )}

            {aiAnalysis.phase === 'idle' && messages.length === 0 && (
              <div className="rounded-xl border px-3 py-4 text-center" style={{ borderColor: 'var(--dash-border)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--dash-text-secondary)' }}>No analysis yet</p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
                  Click &ldquo;Analyze with AI&rdquo; above to run a full multi-timeframe structure scan on {symbol}, or ask a question below.
                </p>
              </div>
            )}

            {/* Full chat thread — every turn stays visible, like any AI chat panel. */}
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} error={m.error} />
            ))}
            {thinking && <ThinkingIndicator />}
          </div>
          </div>

          {/* Spotlight actions — draw, don't tell: isolate one layer + jump to it.
              Only shown once a real analysis exists to be contextual to — no
              predefined actions floating in front of an empty chart. */}
          {aiAnalysis.phase === 'completed' && (
            <div className="grid grid-cols-2 gap-1.5 border-t p-2.5" style={{ borderColor: 'var(--dash-border)' }}>
              {SPOTLIGHT_ACTIONS.map((a) => (
                <button key={a.key} type="button"
                  onClick={() => spotlightCategory(a.key, a.pick)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-opacity hover:bg-[var(--dash-bg-card-hover)]"
                  style={{
                    border: structureVisibleCategories[a.key] ? '1px solid var(--accent)' : '1px solid var(--dash-border)',
                    color: structureVisibleCategories[a.key] ? 'var(--accent)' : 'var(--dash-text-secondary)',
                  }}>
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d={a.icon} />
                  </svg>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <form className="flex gap-2 border-t p-2.5" style={{ borderColor: 'var(--dash-border)' }}
            onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this chart…" disabled={thinking}
              className="h-9 min-w-0 flex-1 rounded-lg px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
              style={selectStyle} />
            <button type="submit" disabled={thinking || !input.trim()} title="Ask"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-surface-950 disabled:opacity-50">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
          </>
          )}
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
        Structure analysis is descriptive and historical only. Not investment advice. Not a trade signal.
        TradeGuardX does not recommend entries, exits, or positions.
      </p>
    </div>
  );
}
