import { at } from '../../../lib/reelMotion';
import { FONT_M } from '../../../lib/reelStories';

/**
 * The P&L line, and the line it did not take.
 *
 * Two paths: `P`, what actually happened up to the close, and `A`, what the
 * price did afterwards expressed as P&L if the position had been held. The
 * area between them is the reel's whole argument, so it is filled rather than
 * left as two lines a viewer has to compare.
 *
 * WHY THE LINE IS DRAWN TWICE. One polyline clipped above the zero line in
 * mint, the same polyline clipped below it in red. A single stroke that
 * changes colour at a point needs a gradient with a stop computed per frame,
 * and on a path that crosses zero several times that produces a smear. Two
 * clipped copies give a hard, correct edge exactly at zero, which is the one
 * place on this chart where the colour has to be right.
 */
export default function PriceChart({
  id,
  story,
  P,
  A,
  w,
  h,
  xMax,
  lo,
  hi,
  drawP,
  afterP,
  sw = 6,
  labels = true,
  limitO = 1,
}) {
  const XN = P.length - 1;
  const XA = A.length - 1;
  const X = (i) => (i / xMax) * w;
  const Y = (v) => (1 - (v - lo) / (hi - lo)) * h;

  // The drawn head is interpolated, not snapped to the nearest sample — the
  // line has to grow smoothly, and at 30fps a snapped head visibly steps.
  const pts = [];
  const di = drawP * XN;
  const n = Math.floor(di);
  for (let i = 0; i <= Math.min(n, XN); i += 1) pts.push([X(i), Y(P[i])]);
  if (n < XN) pts.push([X(di), Y(at(P, drawP))]);

  const ap = [];
  if (afterP > 0) {
    const ai = afterP * XA;
    const an = Math.floor(ai);
    // 'after' continues past the close; 'parallel' overlays from the start.
    const off = story.mode === 'parallel' ? 0 : XN;
    for (let i = 0; i <= Math.min(an, XA); i += 1) ap.push([X(off + i), Y(A[i])]);
    if (an < XA) ap.push([X(off + ai), Y(at(A, afterP))]);
  }

  const f = (a) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const y0 = Y(0);
  const last = pts[pts.length - 1];
  const yl = Y(story.limit);
  const area = f(pts.concat([[last[0], y0], [0, y0]]));
  const saved = !ap.length
    ? ''
    : story.mode === 'parallel'
      ? f(ap.concat(ap.slice().reverse().map((p) => [p[0], Y(at(P, ((p[0] / w) * xMax) / XN))])))
      : f(ap.concat([[ap[ap.length - 1][0], Y(P[XN])]]));

  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        {/* Generous bounds: the line is stroked, so a clip tight to the plot
            would shave the cap where it meets zero. */}
        <clipPath id={id + 'u'}>
          <rect x="-40" y="-4000" width={w + 80} height={y0 + 4000} />
        </clipPath>
        <clipPath id={id + 'd'}>
          <rect x="-40" y={y0} width={w + 80} height="8000" />
        </clipPath>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map((k) => (
        <line key={k} x1="0" x2={w} y1={h * k} y2={h * k} stroke="rgba(255,255,255,.05)" strokeWidth="2" />
      ))}
      <line
        x1="0"
        x2={w}
        y1={y0}
        y2={y0}
        stroke="rgba(255,255,255,.35)"
        strokeWidth={sw * 0.4}
        strokeDasharray={`${sw * 1.4} ${sw * 1.6}`}
      />
      <g opacity={story.limitLabel ? limitO : 0}>
        <line
          x1="0"
          x2={w}
          y1={yl}
          y2={yl}
          stroke={story.limitC}
          strokeWidth={sw * 0.45}
          strokeDasharray={`${sw * 2} ${sw * 1.5}`}
          opacity=".8"
        />
        {labels && (
          <text
            x={8}
            y={yl - 14}
            textAnchor="start"
            fill={story.limitC}
            style={{ font: `700 24px ${FONT_M}`, letterSpacing: '.06em' }}
          >
            {story.limitLabel}
          </text>
        )}
      </g>
      {saved && <polygon points={saved} fill="rgba(0,212,170,.16)" />}
      <polygon points={area} fill="rgba(0,212,170,.20)" clipPath={`url(#${id}u)`} />
      <polygon points={area} fill="rgba(239,68,68,.20)" clipPath={`url(#${id}d)`} />
      {ap.length > 0 && (
        <polyline
          points={f(ap)}
          fill="none"
          stroke="#8794a8"
          strokeWidth={sw * 0.7}
          strokeDasharray={`${sw * 1.6} ${sw * 1.4}`}
          strokeLinejoin="round"
        />
      )}
      <polyline
        points={f(pts)}
        fill="none"
        stroke="#2fe3bd"
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
        clipPath={`url(#${id}u)`}
      />
      <polyline
        points={f(pts)}
        fill="none"
        stroke="#ff7a70"
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
        clipPath={`url(#${id}d)`}
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={sw * 1.6}
        fill={at(P, drawP) >= 0 ? '#2fe3bd' : '#ff7a70'}
        stroke="rgba(255,255,255,.9)"
        strokeWidth={sw * 0.5}
      />
    </svg>
  );
}
