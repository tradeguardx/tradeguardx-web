import { registerOverlay } from 'klinecharts';

/**
 * Custom KLineCharts overlays for SMC annotation.
 *
 * KLineCharts ships lines, rays, fib and text annotations but NO rectangle/zone
 * primitive, and order blocks and fair value gaps are zones — so the two shapes
 * the AI needs most are built here from the raw figure types (rect / text /
 * line), which the library does expose.
 *
 * Both read their label and colour from `extendData`, so a caller creates them
 * with real prices and gets the annotation drawn verbatim.
 */

let registered = false;

export function registerSmcOverlays() {
  if (registered) return; // registerOverlay is global; registering twice is wasteful
  registered = true;

  /**
   * Shaded price band extending rightward from the candle it formed on —
   * the order-block / FVG look. Two points define the band (top and bottom);
   * the right edge is always "now", because an unmitigated zone stays live.
   */
  registerOverlay({
    name: 'smcZone',
    totalStep: 3,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      const [a, b] = coordinates;
      if (!a || !b) return [];
      const d = overlay.extendData || {};
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const height = Math.max(Math.abs(b.y - a.y), 2); // keep hairline gaps visible
      const width = Math.max(bounding.width - x, 0);

      const figures = [
        {
          type: 'rect',
          attrs: { x, y, width, height },
          styles: {
            style: 'stroke_fill',
            color: d.fill || 'rgba(148,163,184,0.12)',
            borderColor: d.border || 'rgba(148,163,184,0.35)',
            borderSize: 1,
          },
          ignoreEvent: true,
        },
      ];

      if (d.text) {
        figures.push({
          type: 'text',
          attrs: { x: x + 4, y: y + 2, text: d.text, align: 'left', baseline: 'top' },
          styles: { color: d.textColor || '#94a3b8', size: 10, weight: 'bold' },
          ignoreEvent: true,
        });
      }
      return figures;
    },
  });

  /**
   * Horizontal ray from a swing point to the right edge, with the label sitting
   * at the far end — how swing highs/lows are annotated on a real SMC chart
   * ("LH 63,179"). The built-in horizontalRayLine draws the line but carries no
   * text, which is the whole point of the label.
   */
  registerOverlay({
    name: 'smcRay',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      const a = coordinates[0];
      if (!a) return [];
      const d = overlay.extendData || {};
      const color = d.color || '#94a3b8';

      const figures = [
        {
          type: 'line',
          attrs: { coordinates: [{ x: a.x, y: a.y }, { x: bounding.width, y: a.y }] },
          styles: { style: 'dashed', color, size: 1 },
          ignoreEvent: true,
        },
      ];

      if (d.text) {
        figures.push({
          type: 'text',
          attrs: {
            // Right-aligned near the edge, clear of the price axis.
            x: bounding.width - 6,
            y: a.y - 3,
            text: d.text,
            align: 'right',
            baseline: 'bottom',
          },
          styles: { color, size: 11, weight: 'bold' },
          ignoreEvent: true,
        });
      }
      return figures;
    },
  });
}
