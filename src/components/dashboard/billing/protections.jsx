/**
 * The pieces each protection card is built from.
 *
 * Proof panels are pinned to the bottom (`margin-top:auto`) so they line up
 * across a row whatever the copy above them does — the thing that makes five
 * cards read as one set rather than five unrelated boxes.
 */

export function Glyph({ d, size = 19, width = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.map((p) => <path key={p} d={p} />)}
    </svg>
  );
}

export function IconTile({ gradient, color, d, size = 38, radius = 12, glyph = 19, stroke = 2 }) {
  return (
    <span aria-hidden style={{ flex: 'none', width: size, height: size, borderRadius: radius, background: gradient, display: 'grid', placeItems: 'center', color }}>
      <Glyph d={d} size={glyph} width={stroke} />
    </span>
  );
}

export function CardHead({ tile, kicker, title, titleSize = 18 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      {tile}
      <div>
        <div style={{ font: "600 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', textTransform: 'uppercase', color: '#7f8ca0' }}>
          {kicker}
        </div>
        <h2 style={{ margin: '6px 0 0', font: `600 ${titleSize}px/1.2 'Space Grotesk',sans-serif`, letterSpacing: '-.02em' }}>{title}</h2>
      </div>
    </div>
  );
}

/** Inline "Pain: … / Fix: …", the form cards 2–5 use. */
export function PainFix({ pain, fix }) {
  return (
    <>
      <p style={{ margin: '16px 0 0', fontSize: 13.5, lineHeight: 1.55, color: '#a3b0c2' }}>
        <b style={{ color: '#ff8178', fontWeight: 700 }}>Pain:</b> {pain}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: '#f6f9fc' }}>
        <b style={{ color: '#2fe3bd', fontWeight: 700 }}>Fix:</b> {fix}
      </p>
    </>
  );
}

/** Pinned to the bottom so proof panels align across a row. */
export function Proof({ children, padding = 14, ring = 'rgba(255,255,255,.07)', style }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 18 }}>
      <div style={{ padding, borderRadius: 16, background: '#070a12', boxShadow: `inset 0 0 0 1px ${ring}`, overflow: 'hidden', ...style }}>
        {children}
      </div>
    </div>
  );
}
