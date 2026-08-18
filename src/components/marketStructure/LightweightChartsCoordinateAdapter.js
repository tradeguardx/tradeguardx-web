/**
 * Same public contract as KLineChartsCoordinateAdapter — the ONLY module in
 * the Market Structure feature that imports/knows about lightweight-charts.
 * annotationViewModel.js / buildVisionAnnotationViewModel.js / the SVG
 * renderer are unchanged by this swap; they only ever talk to this contract.
 *
 * Units: this adapter's PUBLIC interface always speaks MILLISECONDS (the
 * real-world unit both candle data and the vision-pipeline's findings
 * already use) — lightweight-charts itself is SECONDS-native (`UTCTimestamp`),
 * so the ms→s conversion happens internally here, once, rather than leaking
 * into every caller.
 */
export class LightweightChartsCoordinateAdapter {
  constructor(chart, series) {
    this.chart = chart;
    this.series = series;
    this._bounds = { width: 0, height: 0 };
  }

  timeToX(timestampMs) {
    if (!this.chart) return null;
    const coord = this.chart.timeScale().timeToCoordinate(Math.floor(timestampMs / 1000));
    return typeof coord === "number" ? coord : null;
  }

  priceToY(price) {
    if (!this.series) return null;
    const coord = this.series.priceToCoordinate(price);
    return typeof coord === "number" ? coord : null;
  }

  xToTime(x) {
    if (!this.chart) return null;
    const t = this.chart.timeScale().coordinateToTime(x);
    return typeof t === "number" ? t * 1000 : null;
  }

  yToPrice(y) {
    if (!this.series) return null;
    const price = this.series.coordinateToPrice(y);
    return typeof price === "number" ? price : null;
  }

  pointToCoordinate(timestampMs, price) {
    return { x: this.timeToX(timestampMs), y: this.priceToY(price) };
  }

  /** lightweight-charts has no batch conversion API — same per-point cost either way, kept for interface parity with the KLineCharts adapter. */
  batchPointsToCoordinates(points) {
    return points.map((p) => this.pointToCoordinate(p.timestampMs, p.price));
  }

  /** Bar-index range — same shape/semantics as KLineChartsCoordinateAdapter's, feeds §41 viewport filtering / zoom density. */
  getVisibleRange() {
    if (!this.chart) return null;
    const range = this.chart.timeScale().getVisibleLogicalRange();
    if (!range) return null;
    return { from: range.from, to: range.to, realFrom: range.from, realTo: range.to };
  }

  getChartBounds() {
    return this._bounds;
  }

  setChartBounds(bounds) {
    this._bounds = bounds;
  }
}
