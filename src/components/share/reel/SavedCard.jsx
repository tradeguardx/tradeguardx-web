import PriceChart from './PriceChart';
import { split, usd } from '../../../lib/reelMotion';
import { FONT_B, FONT_D, FONT_M, RED } from '../../../lib/reelStories';

/**
 * The share card: 432×540, rendered at 2× in the reel and also exported alone
 * as the static PNG.
 *
 * EVERY PADDED BOX SETS box-sizing: border-box. Without it the bottom row —
 * the handle, the date and the referral code — is pushed past the card's
 * height and clipped. That row is the only thing on the card that brings
 * anyone back, so it is the one that must never be the thing that falls off.
 *
 * The rules row and the venue pill come from the user's real account in
 * production. They are what makes the card evidence rather than decoration:
 * anyone can post a green number, and the claim here is that a rule set
 * beforehand is what produced it.
 */
export default function SavedCard({ story, P, A, HI, LO1, handle = '@arjun.trades', referral = 'ARJUN14', rules, sheen }) {
  const glass = 'rgba(255,255,255,.07)';
  const line = 'rgba(255,255,255,.15)';
  const [bm, bd] = split(usd(story.saved));
  const cd = story.card;
  const XN = P.length - 1;
  const XA = A.length - 1;
  const chips = rules ?? ['−$220 max loss', '+$400 target', '6 trades/day', '1% risk'];

  return (
    <div
      style={{
        position: 'relative',
        width: 432,
        height: 540,
        borderRadius: 28,
        overflow: 'hidden',
        background: 'linear-gradient(160deg,#0d1324,#080a14)',
        color: '#fff',
        fontFamily: FONT_B,
        boxShadow: '0 40px 90px -30px rgba(0,0,0,.8)',
      }}
    >
      <div style={{ position: 'absolute', width: 420, height: 420, left: -150, top: -170, borderRadius: '50%', background: 'radial-gradient(circle,rgba(122,215,255,.30),transparent 66%)' }} />
      <div style={{ position: 'absolute', width: 460, height: 460, right: -210, bottom: -200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,122,217,.28),transparent 64%)' }} />
      {/* The holographic sweep. Its position is the only animated thing on the
          card, so the PNG export can freeze it at 50% 50% and look deliberate. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(115deg,transparent 18%,rgba(255,64,200,.22) 32%,rgba(64,200,255,.26) 42%,rgba(0,255,190,.24) 52%,rgba(255,226,64,.2) 62%,transparent 78%)',
          backgroundSize: '260% 260%',
          backgroundPosition: sheen,
          mixBlendMode: 'screen',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 28, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16), inset 0 1px 0 rgba(255,255,255,.26)' }} />

      <div style={{ boxSizing: 'border-box', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(145deg,#00d4aa,#00a98a)', display: 'grid', placeItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#04140f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
                <path d="M9 12l2.2 2.2L15.5 10" />
              </svg>
            </div>
            <div style={{ font: `700 15px/1 ${FONT_D}`, letterSpacing: '-.02em' }}>
              TradeGuard<span style={{ color: '#00d4aa' }}>X</span>
            </div>
          </div>
          <div style={{ boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', borderRadius: 999, background: glass, boxShadow: `inset 0 0 0 1px ${line}` }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fd7d02', display: 'grid', placeItems: 'center', font: `800 11px/1 ${FONT_D}` }}>Δ</div>
            <span style={{ fontSize: 11.5, fontWeight: 700 }}>Delta Exchange</span>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2.2">
            <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
          </svg>
          {chips.map((t) => (
            <span key={t} style={{ boxSizing: 'border-box', height: 22, padding: '0 7px', display: 'flex', alignItems: 'center', borderRadius: 999, background: 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${line}`, fontSize: 10.5, fontWeight: 700 }}>
              {t}
            </span>
          ))}
        </div>

        <div style={{ boxSizing: 'border-box', marginTop: 12, flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 18px 14px', borderRadius: 20, background: glass, boxShadow: `inset 0 0 0 1px ${line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ font: `700 17px/1 ${FONT_D}` }}>{cd.sym}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#c9d2e0' }}>{cd.meta}</span>
            <span style={{ flex: 1 }} />
            <span style={{ boxSizing: 'border-box', font: `700 10px/1 ${FONT_M}`, letterSpacing: '.1em', textTransform: 'uppercase', padding: '5px 8px', borderRadius: 6, background: 'rgba(0,212,170,.16)', color: '#3ff0c8' }}>
              {cd.badge}
            </span>
          </div>
          <div style={{ marginTop: 16, font: `600 9.5px/1 ${FONT_M}`, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9aa6ba' }}>{cd.label}</div>
          <div style={{ marginTop: 8, font: `700 54px/1 ${FONT_D}`, letterSpacing: '-.055em', color: '#3ff0c8', textShadow: '0 0 40px rgba(0,212,170,.35)' }}>
            {bm}
            <span style={{ fontSize: '.5em', opacity: 0.6 }}>{bd}</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ boxSizing: 'border-box', padding: '5px 9px', borderRadius: 999, background: cd.pillC === RED ? 'rgba(239,68,68,.16)' : 'rgba(0,212,170,.16)', color: cd.pillC === RED ? '#ff8a80' : '#3ff0c8', font: `700 12.5px/1 ${FONT_D}` }}>
              {cd.pill}
            </span>
            <span style={{ fontSize: 11.5, color: '#c9d2e0' }}>{cd.pillText}</span>
          </div>
          <div style={{ flex: 1, marginTop: 14, position: 'relative' }}>
            <PriceChart
              id="cc"
              story={story}
              P={P}
              A={A}
              w={360}
              h={96}
              xMax={story.mode === 'parallel' ? XN : XN + XA}
              lo={LO1}
              hi={HI}
              drawP={1}
              afterP={1}
              sw={2.4}
              labels={false}
              limitO={0.7}
            />
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
            {cd.tiles.map(([k, v, c]) => (
              <div key={k} style={{ boxSizing: 'border-box', padding: '9px 10px', borderRadius: 12, background: 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 1px ${line}` }}>
                <div style={{ font: `600 8.5px/1 ${FONT_M}`, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9aa6ba' }}>{k}</div>
                <div style={{ marginTop: 6, font: `600 13.5px/1 ${FONT_D}`, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ boxSizing: 'border-box', marginTop: 12, display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px 9px 9px', borderRadius: 15, background: glass, boxShadow: `inset 0 0 0 1px ${line}` }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'conic-gradient(from 210deg,#ff7ad9,#7ad7ff,#7affd4,#ffe27a,#ff7ad9)', display: 'grid', placeItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0b1220" strokeWidth="2.1" strokeLinecap="round">
              <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ font: `700 12.5px/1 ${FONT_D}` }}>{cd.ach}</span>
              <span style={{ boxSizing: 'border-box', font: `600 8.5px/1 ${FONT_M}`, letterSpacing: '.12em', padding: '3px 6px', borderRadius: 5, background: 'rgba(122,215,255,.2)', color: '#7ad7ff' }}>
                {cd.tier}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#c9d2e0', marginTop: 4 }}>{cd.achText}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#9aa6ba' }}>
          <span>
            <b style={{ color: '#c9d2e0' }}>{handle}</b> · {cd.date}
          </span>
          <span style={{ boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 7, padding: '5px 6px 5px 9px', borderRadius: 8, background: glass, boxShadow: `inset 0 0 0 1px ${line}` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>Would yours hold?</span>
            <span style={{ boxSizing: 'border-box', font: `700 10px/1 ${FONT_M}`, padding: '4px 6px', borderRadius: 5, background: '#00d4aa', color: '#04140f' }}>{referral}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
