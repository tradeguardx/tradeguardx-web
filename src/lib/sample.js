/**
 * How many closed trades a statistic needs before it means anything.
 *
 * There are two kinds of number on these screens and they are not the same
 * thing:
 *
 *   FACTS      net P&L, trade count, rule breaks, average hold. True at any
 *              sample size. One trade has a P&L; five trades have a total.
 *
 *   INFERENCES win rate, profit factor, expectancy, average R:R. These are
 *              estimates of an edge, and on a small sample they are noise
 *              wearing a percentage sign. "Win rate 20%" on five trades moves
 *              to 33% with one more win — a thirteen-point swing from a single
 *              outcome, shown to the user as though it described them.
 *
 * Twenty is the bar the discipline score already used ("scored after ~20
 * trades"); this puts the rest of the inferences behind the same line rather
 * than having one honest statistic sitting beside six that are not.
 *
 * It is deliberately not a confidence interval. The point is to stop the
 * product making a claim it cannot support, and a plain "needs 15 more trades"
 * does that in language a trader reads without stopping.
 */
export const MIN_SAMPLE = 20;

/** True once an inference drawn from `n` closed trades is worth showing. */
export function enoughSample(n) {
  return Number.isFinite(n) && n >= MIN_SAMPLE;
}

/** How many more are needed. Zero once the bar is met. */
export function sampleGap(n) {
  return Math.max(0, MIN_SAMPLE - (Number.isFinite(n) ? n : 0));
}

/** The note under a statistic that is still waiting for a sample. */
export function sampleNote(n) {
  const gap = sampleGap(n);
  if (gap === 0) return '';
  if (!Number.isFinite(n) || n <= 0) return `needs ${MIN_SAMPLE} closed trades`;
  return `needs ${gap} more ${gap === 1 ? 'trade' : 'trades'}`;
}

/**
 * An inference, or the honest absence of one.
 *
 * Returns `{ v, note, ready }` so a caller can render the same card either
 * way without an if-statement at every call site.
 */
export function inference(n, value, note, { format = (x) => String(x) } = {}) {
  if (!enoughSample(n) || value == null) {
    return { v: '—', note: sampleNote(n) || note, ready: false };
  }
  return { v: format(value), note, ready: true };
}
