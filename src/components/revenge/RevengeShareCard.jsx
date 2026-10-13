import { forwardRef } from 'react';
import { C, GRADE, shareStats } from './revengeShare';

/**
 * The revenge score as a post: 432 × 540, exported at 2.5× to 1080 × 1350
 * (4:5, the shape every feed shows uncropped).
 *
 * Share art, so the colours are FIXED brand colours, not theme tokens: the
 * image is seen on someone else's phone, in their app's theme, and has to look
 * the same everywhere. Every figure is the server's; nothing is rounded up
 * into a better story.
 *
 * Private by default. Percentages and counts only; money and the trader's
 * name appear only when they switch them on in the share modal.
 */
const RevengeShareCard = forwardRef(function RevengeShareCard({ report, periodLabel, amounts = false, handle = null }, ref) {
  const grade = GRADE[report.grade];
  const tone = C.tone[grade?.tone ?? 'mint'];
  const stats = shareStats(report, { amounts });
  const r = 54;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, report.score ?? 0));
  return (
    <div ref={ref} style={{ width: 432, height: 540, boxSizing: 'border-box', position: 'relative', overflow: 'hidden', padding: '26px 28px 22px', background: `radial-gradient(ellipse 80% 50% at 50% 18%, ${tone}22, transparent 70%), ${C.bg}`, color: C.ink, fontFamily: 'Manrope, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Brand + what this is */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: C.brand, display: 'grid', placeItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#02241d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
        </span>
        <span style={{ font: "700 15px/1 'Space Grotesk', sans-serif", letterSpacing: '-.01em' }}>TradeGuardX</span>
        <span style={{ flex: 1 }} />
        <span style={{ font: "600 9.5px/1 'JetBrains Mono', monospace", letterSpacing: '.14em', color: C.ink3, textTransform: 'uppercase' }}>Revenge score{periodLabel ? ` · ${periodLabel}` : ''}</span>
      </div>

      {/* The number */}
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width="132" height="132" viewBox="0 0 132 132" style={{ flex: 'none' }}>
          <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="11" />
          <circle cx="66" cy="66" r={r} fill="none" stroke={tone} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 66 66)" />
          <text x="66" y="68" textAnchor="middle" style={{ font: "700 42px 'Space Grotesk', sans-serif", fill: C.ink }}>{report.score}</text>
          <text x="66" y="90" textAnchor="middle" style={{ font: "500 10.5px 'JetBrains Mono', monospace", fill: C.ink3, letterSpacing: '.1em' }}>OF 100</text>
        </svg>
        <div style={{ minWidth: 0 }}>
          {grade && <span style={{ display: 'inline-block', padding: '5px 10px', borderRadius: 999, background: `${tone}22`, color: tone, font: "700 10.5px/1.2 'JetBrains Mono', monospace", letterSpacing: '.08em', textTransform: 'uppercase' }}>{grade.label}</span>}
          <div style={{ marginTop: 10, font: "600 21px/1.22 'Space Grotesk', sans-serif", letterSpacing: '-.02em' }}>{report.verdict}</div>
        </div>
      </div>

      {/* Their numbers */}
      <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
        {stats.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.line}` }}>
            <span style={{ flex: 'none', minWidth: 62, font: "700 22px/1 'Space Grotesk', sans-serif", color: C.tone[s.tone], fontVariantNumeric: 'tabular-nums' }}>{s.big}</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.35, color: C.ink2 }}>{s.small}</span>
          </div>
        ))}
      </div>

      <span style={{ flex: 1 }} />

      {/* The ask */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "600 15px/1.25 'Space Grotesk', sans-serif" }}>What's your revenge score?</div>
          <div style={{ marginTop: 4, fontSize: 11.5, color: C.ink3 }}>Free from your own trades · <span style={{ color: C.brand, fontWeight: 700 }}>tradeguardx.com</span></div>
        </div>
        {handle && <span style={{ flex: 'none', fontSize: 11.5, color: C.ink3 }}>{handle}</span>}
      </div>
    </div>
  );
});

export default RevengeShareCard;
