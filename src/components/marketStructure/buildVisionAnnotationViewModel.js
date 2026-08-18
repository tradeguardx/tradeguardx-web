function formatPrice(price) {
  const a = Math.abs(price);
  if (a >= 100) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (a >= 1) return price.toFixed(4);
  if (a === 0) return "0";
  return price.toFixed(Math.min(Math.ceil(-Math.log10(a)) + 3, 10));
}

/**
 * Builds a PURELY LOGICAL annotation model — timestamp + price only, never a
 * screen coordinate. `MarketStructureCanvasPrimitive` resolves each item to
 * pixels itself, FRESH on every single draw() call (which the chart invokes
 * synchronously on every pan/zoom/resize frame). Precomputing x/y here and
 * caching it would go stale the instant the user starts a zoom/pan gesture —
 * the chart's own candles reposition on every frame of the gesture, but a
 * value pushed through React only updates asynchronously, one or more frames
 * behind. That mismatch is exactly what "annotations drift out of sync
 * during zoom" looks like from the outside.
 *
 * Only findings belonging to the currently active timeframe are included —
 * a 15m finding must never render while the chart shows 1h.
 */
export function buildVisionAnnotationViewModel(validated, { activeTimeframe, visibleCategories }) {
  if (!validated) {
    return {
      levels: [], orderBlocks: [], fairValueGaps: [], liquidityPools: [], events: [], sweeps: [], swings: [],
      volumeFindings: [], structure: null, tradeSetup: null,
    };
  }

  // Case/whitespace-insensitive: the model is told to echo back the exact
  // timeframe string it was given ("4h", "1h", …), but free-text generation
  // occasionally "normalizes" it (e.g. "4H") — an exact-match filter would
  // silently drop that timeframe's entire finding set on the next switch.
  const normalizeTimeframe = (tf) => (tf || "").trim().toLowerCase();
  const activeTimeframeNormalized = normalizeTimeframe(activeTimeframe);
  const belongsToActiveTimeframe = (f) => normalizeTimeframe(f.timeframe) === activeTimeframeNormalized;

  const events = visibleCategories.events
    ? (validated.events ?? []).filter(belongsToActiveTimeframe).map((e) => ({
        id: `${e.type === "BOS" ? "BOS_MARKER" : "CHOCH_MARKER"}_${e.id}`,
        type: e.type === "BOS" ? "BOS_MARKER" : "CHOCH_MARKER",
        sourceId: e.id,
        timestamp: e.timestamp,
        price: e.price,
        label: e.type,
        direction: e.direction === "bullish" ? "BULLISH" : "BEARISH",
        importance: e.importance ?? 0,
      }))
    : [];

  const sweeps = visibleCategories.liquidity
    ? (validated.liquiditySweeps ?? []).filter(belongsToActiveTimeframe).map((s) => ({
        id: `SWEEP_MARKER_${s.id}`,
        type: "SWEEP_MARKER",
        sourceId: s.id,
        timestamp: s.timestamp,
        price: s.price,
        label: "Sweep",
        importance: s.importance ?? 0,
      }))
    : [];

  const swings = visibleCategories.swings
    ? (validated.swings ?? []).filter(belongsToActiveTimeframe).map((s) => {
        const isPeak = s.type === "HH" || s.type === "LH";
        return {
          id: `SWING_MARKER_${s.id}`,
          type: "SWING_MARKER",
          sourceId: s.id,
          timestamp: s.timestamp,
          price: s.price,
          label: s.type,
          kind: isPeak ? "peak" : "trough",
          importance: s.importance ?? 0,
        };
      })
    : [];

  const levels = visibleCategories.levels
    ? (validated.levels ?? []).filter(belongsToActiveTimeframe).map((l) => {
        // WHY the level matters, not a blind rank — "major swing high",
        // "previous BOS" reads as a reasoned pick rather than R1/R2/S1/S2.
        const reason = (l.reason || "").trim() || (l.type === "resistance" ? "Resistance" : "Support");
        return {
          id: `LEVEL_${l.id}`,
          type: "LEVEL",
          sourceId: l.id,
          price: l.price,
          label: `${formatPrice(l.price)} · ${reason}`,
          importance: l.importance ?? 0,
        };
      })
    : [];

  const orderBlocks = visibleCategories.orderBlocks
    ? (validated.orderBlocks ?? []).filter(belongsToActiveTimeframe).map((ob) => ({
        id: `ORDER_BLOCK_${ob.id}`,
        type: "ORDER_BLOCK",
        sourceId: ob.id,
        startTimestamp: ob.startTimestamp,
        endTimestamp: ob.endTimestamp,
        high: ob.high,
        low: ob.low,
        direction: ob.type === "bullish" ? "BULLISH" : "BEARISH",
        mitigated: false,
        label: "OB",
      }))
    : [];

  const fairValueGaps = visibleCategories.fvg
    ? (validated.fairValueGaps ?? []).filter(belongsToActiveTimeframe).map((f) => ({
        id: `FVG_${f.id}`,
        type: "FVG",
        sourceId: f.id,
        startTimestamp: f.startTimestamp,
        endTimestamp: f.endTimestamp,
        high: f.high,
        low: f.low,
        direction: f.type === "bullish" ? "BULLISH" : "BEARISH",
        label: "FVG",
      }))
    : [];

  const volumeFindings = visibleCategories.volume
    ? (validated.volumeFindings ?? []).filter(belongsToActiveTimeframe).map((v) => ({
        id: `VOLUME_MARKER_${v.id}`,
        type: "VOLUME_MARKER",
        sourceId: v.id,
        timestamp: v.timestamp,
        price: v.price,
        direction: v.direction === "bullish" ? "BULLISH" : "BEARISH",
        label: "Vol",
        importance: v.importance ?? 0,
      }))
    : [];

  const liquidityPools = visibleCategories.liquidity
    ? (validated.liquidity ?? []).filter(belongsToActiveTimeframe).map((p) => ({
        id: `LIQUIDITY_POOL_${p.id}`,
        type: "LIQUIDITY_POOL",
        sourceId: p.id,
        startTimestamp: p.startTimestamp,
        endTimestamp: p.endTimestamp,
        high: p.high,
        low: p.low,
        active: true,
        label: p.type === "equal_highs" ? "Equal Highs" : "Equal Lows",
      }))
    : [];

  // On-chart trend badge — the ONE thing that should always be visible at a
  // glance without opening the chat panel, so switching timeframes never
  // leaves the chart silent about which state it's in.
  const structureEntry = (validated.structure ?? []).find(belongsToActiveTimeframe) ?? null;
  const structure = structureEntry ? { timeframe: activeTimeframe, type: structureEntry.type } : null;

  // One `tradeSetup` per timeframe already comes back from the backend
  // (derived from already-validated findings, never a raw AI number) — just
  // pick out the one matching whichever timeframe the chart currently shows.
  const tradeSetup = visibleCategories.tradeSetup
    ? (validated.tradeSetups ?? []).find((t) => normalizeTimeframe(t.timeframe) === activeTimeframeNormalized) ?? null
    : null;

  return { levels, orderBlocks, fairValueGaps, liquidityPools, events, sweeps, swings, volumeFindings, structure, tradeSetup };
}
