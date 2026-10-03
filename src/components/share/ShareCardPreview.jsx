import { DEFAULT_RULE_CHIPS } from '../../lib/shareCards';

/**
 * The 4:5 share card, as it appears in the modal and as it is exported to PNG.
 *
 * Ported verbatim from reference/01_share-modal.template.html. Every radius,
 * orb, gradient and font size is the handoff's — this is the artefact a user
 * posts publicly, so "close enough" is not a thing it can be.
 *
 * The PNG export renders this same component at 1080×1350 rather than a second
 * implementation. Two implementations of one card is how the thing someone
 * previews stops being the thing they share.
 */
export default function ShareCardPreview({
  card,
  pillBg,
  pillFg,
  rulesOn = true,
  rules = DEFAULT_RULE_CHIPS,
  handle = '@arjun.trades',
  referral = 'ARJUN14',
  isReel = false,
  onWatchReel,
  /** The PNG export freezes the sheen and renders at a fixed width. */
  width,
}) {
  const chipStyle = {
    padding: '3px 6px',
    borderRadius: 999,
    background: 'rgba(255,255,255,.05)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.15)',
    fontSize: 8.5,
    fontWeight: 700,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: width ?? '100%',
        maxWidth: width ?? 310,
        aspectRatio: '4/5',
        borderRadius: 22,
        overflow: 'hidden',
        background: 'linear-gradient(160deg,#0d1324,#080a14)',
        color: '#fff',
        fontFamily: 'Manrope,sans-serif',
        boxShadow: '0 30px 70px -25px rgba(0,0,0,.9)',
      }}
    >
      <div style={{ position: 'absolute', width: 300, height: 300, left: -110, top: -130, borderRadius: '50%', background: 'radial-gradient(circle,rgba(122,215,255,.30),transparent 66%)' }} />
      <div style={{ position: 'absolute', width: 330, height: 330, right: -150, bottom: -150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,122,217,.28),transparent 64%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg,transparent 22%,rgba(255,64,200,.18) 36%,rgba(64,200,255,.22) 46%,rgba(0,255,190,.2) 56%,transparent 74%)', mixBlendMode: 'screen' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 22, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16),inset 0 1px 0 rgba(255,255,255,.26)' }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '17px 17px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(145deg,#00d4aa,#00a98a)', display: 'grid', placeItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04140f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
                <path d="M9 12l2.2 2.2L15.5 10" />
              </svg>
            </div>
            <span style={{ font: "700 11.5px/1 'Space Grotesk',sans-serif" }}>
              TradeGuard<span style={{ color: '#00d4aa' }}>X</span>
            </span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 3px', borderRadius: 999, background: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.15)', fontSize: 9, fontWeight: 700 }}>
            <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#fd7d02', display: 'grid', placeItems: 'center', font: "800 8.5px/1 'Space Grotesk',sans-serif" }}>Δ</span>
            Delta Exchange
          </span>
        </div>

        {/* The rules are what make the number believable, which is why the
            toggle that hides them defaults to on. */}
        {rulesOn && (
          <div style={{ marginTop: 9, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {rules.map((r) => (
              <span key={r} style={chipStyle}>{r}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 9, flex: 1, display: 'flex', flexDirection: 'column', padding: '13px 13px 11px', borderRadius: 15, background: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ font: "700 12.5px/1 'Space Grotesk',sans-serif" }}>{card.sym}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#c9d2e0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.meta}</span>
            <span style={{ flex: 1 }} />
            <span style={{ flex: 'none', font: "700 7.5px/1 'JetBrains Mono',monospace", letterSpacing: '.1em', textTransform: 'uppercase', padding: '4px 6px', borderRadius: 5, background: 'rgba(0,212,170,.16)', color: '#3ff0c8' }}>
              {card.badge}
            </span>
          </div>
          <div style={{ marginTop: 13, font: "600 7.5px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', textTransform: 'uppercase', color: '#9aa6ba' }}>{card.label}</div>
          <div style={{ marginTop: 6, font: "700 40px/1 'Space Grotesk',sans-serif", letterSpacing: '-.055em', color: '#3ff0c8', textShadow: '0 0 30px rgba(0,212,170,.35)' }}>
            {card.hero}
            <span style={{ fontSize: '.5em', opacity: 0.6 }}>{card.dec}</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 7px', borderRadius: 999, background: pillBg, color: pillFg, font: "700 10px/1 'Space Grotesk',sans-serif" }}>{card.pill}</span>
            <span style={{ fontSize: 9, color: '#c9d2e0' }}>{card.pillText}</span>
          </div>
          <svg viewBox="0 0 260 60" preserveAspectRatio="none" style={{ flex: 1, width: '100%', minHeight: 40, marginTop: 10 }}>
            <line x1="0" x2="260" y1="16" y2="16" stroke="rgba(255,255,255,.3)" strokeWidth="1" strokeDasharray="3 4" />
            <polyline points="0,16 14,13 26,11 38,15 52,18 66,21 78,19 92,25 106,28 118,26 132,30 146,33 160,31 172,34" fill="none" stroke="#ff7a70" strokeWidth="2.2" strokeLinejoin="round" />
            {/* The dashed grey tail is the path not taken — the whole claim. */}
            <polyline points="172,34 186,38 198,37 210,44 222,47 234,52 246,51 260,58" fill="none" stroke="#8794a8" strokeWidth="1.6" strokeDasharray="4 3" />
          </svg>
        </div>

        <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px 7px 7px', borderRadius: 12, background: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.15)' }}>
          <span style={{ flex: 'none', width: 24, height: 24, borderRadius: '50%', background: 'conic-gradient(from 210deg,#ff7ad9,#7ad7ff,#7affd4,#ffe27a,#ff7ad9)' }} />
          <span style={{ flex: 1, minWidth: 0, font: "700 10px/1.2 'Space Grotesk',sans-serif" }}>{card.ach}</span>
          <span style={{ flex: 'none', font: "600 7px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', padding: '3px 5px', borderRadius: 4, background: 'rgba(122,215,255,.2)', color: '#7ad7ff' }}>{card.tier}</span>
        </div>

        <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 8.5, color: '#9aa6ba' }}>
          <span>
            <b style={{ color: '#c9d2e0' }}>{handle}</b> · {card.date}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 4px 3px 7px', borderRadius: 6, background: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.15)' }}>
            <b style={{ color: '#fff' }}>Would yours hold?</b>
            <span style={{ font: "700 7.5px/1 'JetBrains Mono',monospace", padding: '3px 4px', borderRadius: 4, background: '#00d4aa', color: '#04140f' }}>{referral}</span>
          </span>
        </div>
      </div>

      {isReel && (
        <button
          type="button"
          onClick={onWatchReel}
          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(3,5,10,.45)', border: 0, cursor: 'pointer' }}
        >
          <span style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
            <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.92)', display: 'grid', placeItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#05070d"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span style={{ font: '700 12px/1 Manrope,sans-serif', color: '#fff' }}>Watch the reel · 18 s</span>
          </span>
        </button>
      )}
    </div>
  );
}
