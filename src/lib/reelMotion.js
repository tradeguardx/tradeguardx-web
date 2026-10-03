/**
 * Motion primitives for the share reel.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE: every visual value is a pure
 * function of T, the time in seconds. No CSS transitions, no setTimeout
 * choreography, no state that advances on its own. render(T) must give the
 * same frame every time it is called.
 *
 * That is not a style preference. It is what makes the reel scrub, loop
 * without a seam, and export to MP4 frame by frame — a renderer asks for
 * T = 4.1333 and must get exactly the frame the preview showed at 4.1333. The
 * moment one value depends on "how long since the last paint", the export
 * drifts from the preview and neither can be trusted.
 */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

/** enter = arrivals, glide = movement, pop = anything that lands with weight. */
export const M = { enter: easeOutCubic, glide: easeInOutCubic, pop: easeOutBack };

/**
 * tw(from, to, start, end, ease)(T)
 *
 * Clamped at both ends on purpose: before `start` it is `from`, after `end` it
 * is `to`. Layers are written as a product of tweens — an element that fades
 * in and later out is `tw(0,1,a,b)(T) * tw(1,0,c,d)(T)` — and that only works
 * if each factor settles rather than continuing past its window.
 */
export const tw =
  (from, to, start, end, ease = M.glide) =>
  (T) => {
    if (T <= start) return from;
    if (T >= end) return to;
    return from + (to - from) * ease((T - start) / (end - start));
  };

/** Piecewise tween over matching times/values arrays, same ease per segment. */
export const interpolate =
  (times, values, ease = M.glide) =>
  (T) => {
    if (T <= times[0]) return values[0];
    const last = times.length - 1;
    if (T >= times[last]) return values[last];
    let i = 0;
    while (i < last && T > times[i + 1]) i += 1;
    const span = times[i + 1] - times[i];
    const p = span === 0 ? 1 : (T - times[i]) / span;
    return values[i] + (values[i + 1] - values[i]) * ease(p);
  };

/** A soft peak at `c`, zero outside ±w. Used for the rule-throw gestures. */
export const bump = (t, c, w) => {
  const d = Math.abs(t - c) / w;
  return d >= 1 ? 0 : Math.sin(((1 - d) * Math.PI) / 2);
};

/** Sample an array at progress p ∈ [0,1], interpolating between points. */
export const at = (arr, p) => {
  const f = clamp(p, 0, 1) * (arr.length - 1);
  const n = Math.floor(f);
  return n >= arr.length - 1 ? arr[arr.length - 1] : arr[n] + (arr[n + 1] - arr[n]) * (f - n);
};

/**
 * Money, with a REAL minus sign (U+2212) rather than a hyphen.
 *
 * A hyphen is a different glyph with a different width, and in tabular-nums at
 * 150px the difference is visible as the number animates. The threshold is
 * −0.004 rather than 0 so a value that rounds to 0.00 is never shown as
 * "−$0.00", which reads as a loss of nothing.
 */
export const money = (v, sym = '$') =>
  (v < -0.004 ? '−' : '+') +
  sym +
  Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The same, unsigned — for amounts whose sign is already implied by the label. */
export const usd = (v, sym = '$') =>
  sym + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Split at the last dot so the decimals can be rendered smaller. */
export const split = (s) => {
  const i = s.lastIndexOf('.');
  return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i)];
};

/**
 * FNV-1a. Stable across machines, runs and reloads.
 *
 * Guardy's colour is picked from the trade id, not at random, so the preview,
 * the downloaded MP4 and any later re-render all agree. A user who shares a
 * reel and then opens it again must not find a different character — the
 * colour is part of what they shared.
 */
export const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(s).length; i += 1) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

export const BODY_COLOURS = ['mint', 'violet', 'gold'];

/** Deterministic from an id; falls back to a single random pick per mount. */
export const colourFor = (id, fallbackSeed) =>
  BODY_COLOURS[hash(id ?? fallbackSeed ?? 'demo') % BODY_COLOURS.length];
