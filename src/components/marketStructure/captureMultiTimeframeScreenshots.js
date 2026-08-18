/**
 * Switches the SAME chart the user is already looking at through each
 * requested timeframe, capturing a real screenshot at each step — the spec's
 * own requirement that "the user should be able to see this process," not a
 * hidden off-screen render.
 *
 * @param {object} params
 * @param {object} params.chart - the live lightweight-charts chart instance
 * @param {object} params.candleSeries - the candlestick series on that chart
 * @param {string} params.symbol
 * @param {string[]} params.timeframes - e.g. VISION_ANALYSIS_TIMEFRAMES
 * @param {(args: {symbol: string, interval: string}) => Promise<{candles: any[]}>} params.fetchCandles
 * @param {(timeframe: string, phase: 'started'|'completed', extra?: {dataUrl?: string}) => void} [params.onProgress]
 * @returns {Promise<Record<string, {imageBase64: string, mimeType: 'image/png'}>>}
 */
export async function captureMultiTimeframeScreenshots({
  chart,
  candleSeries,
  symbol,
  timeframes,
  fetchCandles,
  onProgress,
}) {
  const screenshots = {};

  for (const timeframe of timeframes) {
    onProgress?.(timeframe, 'started');

    const { candles } = await fetchCandles({ symbol, interval: timeframe });
    if (!candles || candles.length === 0) {
      throw new Error(`No candles available for ${symbol} on ${timeframe}`);
    }

    candleSeries.setData(
      candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })),
    );
    chart.timeScale().fitContent();

    // Two animation frames is enough for lightweight-charts to actually paint
    // the new data before we read the canvas.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const canvas = chart.takeScreenshot(false, false);
    const dataUrl = canvas.toDataURL('image/png');
    screenshots[timeframe] = { imageBase64: dataUrl.replace(/^data:image\/png;base64,/, ''), mimeType: 'image/png' };

    // Real thumbnail, not a fabricated preview — the same image just captured.
    onProgress?.(timeframe, 'completed', { dataUrl });
  }

  return screenshots;
}
