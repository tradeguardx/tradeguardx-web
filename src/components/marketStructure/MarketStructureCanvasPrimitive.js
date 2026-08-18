import { resolveLabelCollisions } from "./annotationCollision";
import { ANNOTATION_PRIORITY, applyDensityFilter, densityForVisibleRange, effectivePriority } from "./annotationVisibility";

/**
 * Draws the market-structure annotations directly onto the chart's OWN
 * canvas via lightweight-charts' native primitives API — no separate SVG/DOM
 * overlay layer, no independent coordinate system to drift out of sync.
 *
 * CRITICAL: every pixel position is resolved from timestamp/price FRESH on
 * every single draw() call — never cached. draw() is invoked synchronously
 * by the chart on every pan/zoom/resize frame, so recomputing here (instead
 * of precomputing in React and pushing the result in) is what keeps
 * annotations perfectly glued to their candle mid-gesture, not just after
 * React catches up a frame or two later.
 *
 * Same categorical palette as before — never red/green, never keyed to
 * bullish/bearish.
 */
const COLORS = {
  BOS: "#00d4aa",
  CHOCH: "#f59e0b",
  LEVEL: "#38bdf8",
  LIQUIDITY: "#818cf8",
  SWEEP: "#e879f9",
  ORDER_BLOCK: "#a78bfa",
  SWING: "#22d3ee",
  FVG: "#facc15",
  VOLUME: "#2dd4bf",
};

/**
 * Unlike everything above (deliberately neutral so structure never reads as
 * a buy/sell signal), the trade-setup card IS an explicit directional call —
 * conventional green/red/accent coloring here is intentional, not a
 * violation of that convention, and stays scoped to just this one feature.
 */
const TRADE_SETUP_COLORS = { ENTRY: "#38bdf8", STOP_LOSS: "#f87171", TAKE_PROFIT: "#34d399" };

const TIMEFRAME_MS = {
  "1m": 60_000, "5m": 5 * 60_000, "15m": 15 * 60_000,
  "1h": 3_600_000, "4h": 4 * 3_600_000, "1d": 86_400_000,
};

function estimateLabelWidth(text) {
  return Math.max(24, (text?.length ?? 2) * 6 + 8);
}

function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function pillLabel(ctx, { x, y, text, color, align = "center", fontWeight = "700" }) {
  ctx.font = `${fontWeight} 10px Inter, -apple-system, sans-serif`;
  const textW = ctx.measureText(text).width;
  const w = textW + 14;
  const h = 15;
  const boxX = align === "right" ? x - w : align === "left" ? x : x - w / 2;
  roundRectPath(ctx, boxX, y, w, h, 4);
  ctx.fillStyle = `${color}29`; // ~16% alpha
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, boxX + w / 2, y + h / 2 + 0.5);
  return { width: w, height: h };
}

/** Same gradient-filled-zone language as order blocks, dashed border keeps it visually distinct as a liquidity pool rather than a traded range. */
function drawLiquidityPools(ctx, pools) {
  for (const p of pools) {
    const x1 = Math.min(p.x1, p.x2);
    const x2 = Math.max(p.x1, p.x2);
    const yTop = Math.min(p.yTop, p.yBottom);
    const yBottom = Math.max(p.yTop, p.yBottom);
    const w = Math.max(10, x2 - x1);
    const h = Math.max(4, yBottom - yTop);
    ctx.save();
    ctx.globalAlpha = p.active ? 0.9 : 0.3;
    const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
    grad.addColorStop(0, `${COLORS.LIQUIDITY}30`);
    grad.addColorStop(1, `${COLORS.LIQUIDITY}08`);
    roundRectPath(ctx, x1, yTop, w, h, 4);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = COLORS.LIQUIDITY;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const label = p.label + (!p.active ? " · swept" : "");
    pillLabel(ctx, { x: x1, y: yTop - 20, text: label, color: COLORS.LIQUIDITY, align: "left" });
  }
}

function drawOrderBlocks(ctx, blocks) {
  for (const ob of blocks) {
    const x = Math.min(ob.x1, ob.x2);
    const y = Math.min(ob.yTop, ob.yBottom);
    const w = Math.max(10, Math.abs(ob.x2 - ob.x1));
    const h = Math.max(4, Math.abs(ob.yBottom - ob.yTop));
    ctx.save();
    ctx.globalAlpha = ob.mitigated ? 0.3 : 0.9;
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, `${COLORS.ORDER_BLOCK}38`);
    grad.addColorStop(1, `${COLORS.ORDER_BLOCK}0c`);
    roundRectPath(ctx, x, y, w, h, 4);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = COLORS.ORDER_BLOCK;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    const icon = ob.direction === "BULLISH" ? "▲" : "▽";
    roundRectPath(ctx, x + 4, y + 4, 34, 14, 4);
    ctx.fillStyle = `${COLORS.ORDER_BLOCK}eb`;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 8.5px Inter, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${icon} OB`, x + 21, y + 11.5);
    ctx.restore();
  }
}

/** Deliberately the subtlest zone on the chart — a flat, low-opacity fill and no badge, per "do not fill the chart with tiny gaps." */
function drawFairValueGaps(ctx, gaps) {
  for (const g of gaps) {
    const x = Math.min(g.x1, g.x2);
    const y = Math.min(g.yTop, g.yBottom);
    const w = Math.max(8, Math.abs(g.x2 - g.x1));
    const h = Math.max(3, Math.abs(g.yBottom - g.yTop));
    ctx.save();
    ctx.fillStyle = `${COLORS.FVG}22`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `${COLORS.FVG}66`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.restore();
  }
}

/**
 * Deliberately NOT a connected trendline through every swing — decorative
 * connector lines between HH/HL/LH/LL points are exactly what a "technical
 * analysis diagram" look means and were explicitly ruled out; each swing is
 * an independent, small label anchored to its own candle, nothing more.
 */
function drawSwings(ctx, swings) {
  for (const s of swings) {
    const isPeak = s.kind === "peak";
    ctx.save();
    ctx.shadowColor = COLORS.SWING;
    ctx.shadowBlur = 4;
    ctx.fillStyle = COLORS.SWING;
    ctx.beginPath();
    if (isPeak) {
      ctx.moveTo(s.x, s.y - 5); ctx.lineTo(s.x - 4.5, s.y + 2); ctx.lineTo(s.x + 4.5, s.y + 2);
    } else {
      ctx.moveTo(s.x, s.y + 5); ctx.lineTo(s.x - 4.5, s.y - 2); ctx.lineTo(s.x + 4.5, s.y - 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    pillLabel(ctx, { x: s.x, y: isPeak ? s.y - 18 : s.y + 6, text: s.label, color: COLORS.SWING, fontWeight: "700" });
    ctx.restore();
  }
}

function drawLevels(ctx, levels, mediaWidth) {
  const labelMargin = 8;
  for (const l of levels) {
    // Reason-tagged labels ("64,400 · Major swing high") vary a lot in
    // length, so the dashed line's stop point is measured, not a fixed guess.
    ctx.font = "700 10px Inter, -apple-system, sans-serif";
    const pillWidth = ctx.measureText(l.label).width + 14;

    ctx.save();
    ctx.strokeStyle = COLORS.LEVEL;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = 0.65;
    ctx.shadowColor = COLORS.LEVEL;
    ctx.shadowBlur = 3;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(0, l.y);
    ctx.lineTo(mediaWidth - pillWidth - labelMargin - 4, l.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
    pillLabel(ctx, { x: mediaWidth - labelMargin, y: l.y - 7.5, text: l.label, color: COLORS.LEVEL, align: "right", fontWeight: "700" });
  }
}

/** A light confirmation tag, not a headline element — a small bar-chart glyph, no shadow, no line connector. */
function drawVolumeFindings(ctx, findings) {
  for (const v of findings) {
    ctx.save();
    ctx.fillStyle = COLORS.VOLUME;
    ctx.globalAlpha = 0.85;
    const barW = 2.5;
    const heights = v.direction === "BULLISH" ? [4, 7, 10] : [10, 7, 4];
    heights.forEach((h, i) => {
      ctx.fillRect(v.x - 6 + i * (barW + 1.5), v.y - h / 2, barW, h);
    });
    ctx.restore();
    pillLabel(ctx, { x: v.x + 10, y: v.y - 7.5, text: v.label, color: COLORS.VOLUME, align: "left", fontWeight: "700" });
  }
}

/**
 * Entry/SL/TP as horizontal price lines, reusing `drawLevels`'s line
 * approach — the one place on the chart deliberately using conventional
 * green/red coloring, since this card is an explicit directional call.
 */
function drawTradeSetup(ctx, setup, mediaWidth) {
  if (!setup || setup.direction === "neutral") return;
  const lines = [
    setup.entry != null && { y: setup.entryY, price: setup.entry, label: `Entry ${setup.entry}`, color: TRADE_SETUP_COLORS.ENTRY },
    setup.stopLoss != null && { y: setup.stopLossY, price: setup.stopLoss, label: `SL ${setup.stopLoss}`, color: TRADE_SETUP_COLORS.STOP_LOSS },
    ...(setup.takeProfit ?? []).map((tp, i) => ({ y: setup.takeProfitY[i], price: tp, label: `TP${i + 1} ${tp}`, color: TRADE_SETUP_COLORS.TAKE_PROFIT })),
  ].filter(Boolean);

  for (const line of lines) {
    if (line.y == null) continue;
    ctx.font = "700 10px Inter, -apple-system, sans-serif";
    const pillWidth = ctx.measureText(line.label).width + 14;
    ctx.save();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(0, line.y);
    ctx.lineTo(mediaWidth - pillWidth - 12, line.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
    pillLabel(ctx, { x: mediaWidth - 8, y: line.y - 7.5, text: line.label, color: line.color, align: "right", fontWeight: "700" });
  }
}

function drawEvents(ctx, events) {
  for (const e of events) {
    const isChoch = e.type === "CHOCH_MARKER";
    const isSweep = e.type === "SWEEP_MARKER";
    const color = isChoch ? COLORS.CHOCH : isSweep ? COLORS.SWEEP : COLORS.BOS;
    const labelY = e.y - 24;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y - 4);
    ctx.lineTo(e.x, labelY + 15);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    pillLabel(ctx, { x: e.x, y: labelY, text: e.label, color, fontWeight: "700" });
  }
}

/** Bullish/bearish/ranging conveyed by icon SHAPE only, never by color — color-coding direction reads as a buy/sell signal. */
function drawTrendIcon(ctx, cx, cy, type, color) {
  const s = 5;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (type === "bullish") {
    ctx.moveTo(cx - s, cy + s * 0.6); ctx.lineTo(cx, cy - s * 0.2); ctx.lineTo(cx + s, cy - s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s - 4, cy - s); ctx.lineTo(cx + s, cy - s); ctx.lineTo(cx + s, cy - s + 4);
    ctx.stroke();
  } else if (type === "bearish") {
    ctx.moveTo(cx - s, cy - s * 0.6); ctx.lineTo(cx, cy + s * 0.2); ctx.lineTo(cx + s, cy + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s - 4, cy + s); ctx.lineTo(cx + s, cy + s); ctx.lineTo(cx + s, cy + s - 4);
    ctx.stroke();
  } else {
    ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s - 4, cy - 3); ctx.lineTo(cx + s, cy); ctx.lineTo(cx + s - 4, cy + 3);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The ONE thing always visible at a glance without opening the chat panel —
 * a fixed badge in the corner, never a chart annotation that can scroll out
 * of view. Translucent accent tint (not a solid fill) so it reads correctly
 * on both light and dark themes without the primitive needing to know which.
 */
function drawStructureBadge(ctx, structure) {
  if (!structure) return;
  const accent = COLORS.BOS;
  const label = `${structure.timeframe.toUpperCase()} STRUCTURE · ${structure.type.toUpperCase()}`;
  const x = 12;
  const y = 12;
  const iconSpace = 22;
  ctx.font = "700 10.5px Inter, -apple-system, sans-serif";
  const textW = ctx.measureText(label).width;
  const w = textW + iconSpace + 16;
  const h = 24;

  ctx.save();
  roundRectPath(ctx, x, y, w, h, 6);
  ctx.fillStyle = `${accent}1f`;
  ctx.fill();
  ctx.strokeStyle = `${accent}55`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  drawTrendIcon(ctx, x + 16, y + h / 2, structure.type, accent);
  ctx.fillStyle = accent;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + iconSpace + 4, y + h / 2 + 0.5);
}

/**
 * Resolves the LOGICAL model (timestamp/price only) to screen pixels using
 * the adapter's CURRENT state, then runs density filtering + label-collision
 * resolution on those fresh positions. Called from inside draw(), every frame.
 */
function resolvePositioned(adapter, model, activeTimeframe) {
  const nowMs = Date.now();
  const barMs = TIMEFRAME_MS[activeTimeframe] ?? 3_600_000;
  const ageBarsFor = (timestampMs) => Math.max(0, Math.round((nowMs - timestampMs) / barMs));

  const pointAnnotations = [];
  for (const e of model.events ?? []) {
    const x = adapter.timeToX(e.timestamp);
    const y = adapter.priceToY(e.price);
    if (x == null || y == null) continue;
    pointAnnotations.push({ ...e, x, y, priority: effectivePriority(e.type, ageBarsFor(e.timestamp)) });
  }
  for (const s of model.sweeps ?? []) {
    const x = adapter.timeToX(s.timestamp);
    const y = adapter.priceToY(s.price);
    if (x == null || y == null) continue;
    pointAnnotations.push({ ...s, x, y, priority: effectivePriority(s.type, ageBarsFor(s.timestamp)) });
  }
  for (const s of model.swings ?? []) {
    const x = adapter.timeToX(s.timestamp);
    const y = adapter.priceToY(s.price);
    if (x == null || y == null) continue;
    pointAnnotations.push({ ...s, x, y, priority: effectivePriority(s.type, ageBarsFor(s.timestamp)) });
  }
  for (const v of model.volumeFindings ?? []) {
    const x = adapter.timeToX(v.timestamp);
    const y = adapter.priceToY(v.price);
    if (x == null || y == null) continue;
    pointAnnotations.push({ ...v, x, y, priority: effectivePriority(v.type, ageBarsFor(v.timestamp)) });
  }

  const density = densityForVisibleRange(adapter.getVisibleRange());
  const filteredPoints = applyDensityFilter(pointAnnotations, density);
  const collisionBoxes = filteredPoints.map((a) => ({
    id: a.id,
    x: a.x,
    y: a.y,
    width: a.type === "SWING_MARKER" ? estimateLabelWidth(a.label) - 6 : estimateLabelWidth(a.label),
    height: 16,
    priority: a.priority,
  }));
  const resolved = resolveLabelCollisions(collisionBoxes);
  const positioned = filteredPoints
    .map((a) => {
      const pos = resolved.get(a.id);
      if (!pos?.visible) return null;
      return { ...a, y: pos.y };
    })
    .filter(Boolean);

  const swings = positioned.filter((a) => a.type === "SWING_MARKER").sort((a, b) => a.x - b.x);
  const events = positioned.filter((a) => a.type === "BOS_MARKER" || a.type === "CHOCH_MARKER" || a.type === "SWEEP_MARKER");
  const volumeFindings = positioned.filter((a) => a.type === "VOLUME_MARKER").sort((a, b) => a.x - b.x);

  const levels = (model.levels ?? [])
    .map((l) => {
      const y = adapter.priceToY(l.price);
      if (y == null) return null;
      return { ...l, y, priority: ANNOTATION_PRIORITY.LEVEL };
    })
    .filter(Boolean);

  const orderBlocks = (model.orderBlocks ?? [])
    .map((ob) => {
      const x1 = adapter.timeToX(ob.startTimestamp);
      const x2 = adapter.timeToX(ob.endTimestamp);
      const yTop = adapter.priceToY(ob.high);
      const yBottom = adapter.priceToY(ob.low);
      if ([x1, x2, yTop, yBottom].some((v) => v == null)) return null;
      return { ...ob, x1, x2, yTop, yBottom };
    })
    .filter(Boolean);

  const liquidityPools = (model.liquidityPools ?? [])
    .map((p) => {
      const x1 = adapter.timeToX(p.startTimestamp);
      const x2 = adapter.timeToX(p.endTimestamp);
      const yTop = adapter.priceToY(p.high);
      const yBottom = adapter.priceToY(p.low);
      if ([x1, x2, yTop, yBottom].some((v) => v == null)) return null;
      return { ...p, x1, x2, yTop, yBottom };
    })
    .filter(Boolean);

  const fairValueGaps = (model.fairValueGaps ?? [])
    .map((g) => {
      const x1 = adapter.timeToX(g.startTimestamp);
      const x2 = adapter.timeToX(g.endTimestamp);
      const yTop = adapter.priceToY(g.high);
      const yBottom = adapter.priceToY(g.low);
      if ([x1, x2, yTop, yBottom].some((v) => v == null)) return null;
      return { ...g, x1, x2, yTop, yBottom };
    })
    .filter(Boolean);

  // Entry/SL/TP are single prices, not ranges — same resolution as a level,
  // just resolved once here rather than treated as chart "levels" (different
  // color convention, see TRADE_SETUP_COLORS).
  const tradeSetup = model.tradeSetup && model.tradeSetup.direction !== "neutral"
    ? {
        ...model.tradeSetup,
        entryY: model.tradeSetup.entry != null ? adapter.priceToY(model.tradeSetup.entry) : null,
        stopLossY: model.tradeSetup.stopLoss != null ? adapter.priceToY(model.tradeSetup.stopLoss) : null,
        takeProfitY: (model.tradeSetup.takeProfit ?? []).map((tp) => adapter.priceToY(tp)),
      }
    : null;

  return { levels, orderBlocks, fairValueGaps, liquidityPools, events, swings, volumeFindings, tradeSetup };
}

function drawAnnotations(ctx, mediaSize, adapter, model, activeTimeframe) {
  if (!model || !adapter) return;
  ctx.clearRect(0, 0, mediaSize.width, mediaSize.height);
  const positioned = resolvePositioned(adapter, model, activeTimeframe);
  drawLiquidityPools(ctx, positioned.liquidityPools);
  drawFairValueGaps(ctx, positioned.fairValueGaps);
  drawOrderBlocks(ctx, positioned.orderBlocks);
  drawSwings(ctx, positioned.swings);
  drawVolumeFindings(ctx, positioned.volumeFindings);
  drawLevels(ctx, positioned.levels, mediaSize.width);
  drawEvents(ctx, positioned.events);
  drawTradeSetup(ctx, positioned.tradeSetup, mediaSize.width);
  drawStructureBadge(ctx, model.structure);
}

class MarketStructurePaneRenderer {
  constructor(getState, adapter) {
    this._getState = getState;
    this._adapter = adapter;
  }

  draw(target) {
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      const { model, activeTimeframe } = this._getState();
      drawAnnotations(context, mediaSize, this._adapter, model, activeTimeframe);
    });
  }
}

class MarketStructurePaneView {
  constructor(getState, adapter) {
    this._renderer = new MarketStructurePaneRenderer(getState, adapter);
  }

  zOrder() {
    return "top";
  }

  renderer() {
    return this._renderer;
  }
}

/**
 * Attach once via `series.attachPrimitive(new MarketStructureCanvasPrimitive(adapter))`,
 * then call `setModel(model, activeTimeframe)` whenever the LOGICAL data
 * changes (new analysis result, category toggle, timeframe switch). Pan/zoom/
 * resize need no explicit call at all — draw() re-resolves positions from
 * the adapter's live state every time the chart repaints, which already
 * happens automatically on those.
 */
export class MarketStructureCanvasPrimitive {
  constructor(adapter) {
    this._model = null;
    this._activeTimeframe = null;
    this._requestUpdate = null;
    this._paneView = new MarketStructurePaneView(() => ({ model: this._model, activeTimeframe: this._activeTimeframe }), adapter);
  }

  attached({ requestUpdate }) {
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._requestUpdate = null;
  }

  setModel(model, activeTimeframe) {
    this._model = model;
    this._activeTimeframe = activeTimeframe;
    this._requestUpdate?.();
  }

  updateAllViews() {}

  paneViews() {
    return [this._paneView];
  }
}
