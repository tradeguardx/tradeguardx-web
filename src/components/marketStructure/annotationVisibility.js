/**
 * Priority + zoom-density rules (§31/§32/§40). Pure functions — no chart, no
 * DOM, no analysis-domain knowledge beyond the annotation `type` string.
 */

/** Base priority per §32's hierarchy: recent BOS/CHoCH > ranked levels > liquidity > order blocks > historical/swings. */
export const ANNOTATION_PRIORITY = {
  CHOCH_MARKER: 95,
  BOS_MARKER: 90,
  LEVEL: 80,
  SWEEP_MARKER: 65,
  LIQUIDITY_POOL: 60,
  ORDER_BLOCK: 50,
  SWING_MARKER: 35,
  VOLUME_MARKER: 30,
  LABEL: 10,
};

/**
 * Older objects fade in priority so a fresh BOS always outranks a stale one
 * of the same type, without ever dropping below half the type's base weight
 * purely from age (an old CHoCH still outranks a fresh swing marker).
 */
export function effectivePriority(type, ageBars) {
  const base = ANNOTATION_PRIORITY[type] ?? 0;
  const decay = Math.max(0, 1 - Math.max(0, ageBars) / 200);
  return base * (0.5 + 0.5 * decay);
}

/** More visible candles (zoomed out) → lower density: fewer labels, higher priority floor. */
export function densityForVisibleRange(visibleRange) {
  if (!visibleRange) return "medium";
  const span = visibleRange.to - visibleRange.from;
  if (span <= 60) return "high";
  if (span <= 200) return "medium";
  return "low";
}

export const DENSITY_LIMITS = {
  high: { maxLabels: 40, minPriority: 0 },
  medium: { maxLabels: 20, minPriority: 30 },
  low: { maxLabels: 10, minPriority: 60 },
};

/** Only the underlying analysis density changes visualization; it never re-triggers detection (§27/§61). */
export function applyDensityFilter(annotations, density) {
  const limits = DENSITY_LIMITS[density] ?? DENSITY_LIMITS.medium;
  return annotations
    .filter((a) => a.priority >= limits.minPriority)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limits.maxLabels);
}
