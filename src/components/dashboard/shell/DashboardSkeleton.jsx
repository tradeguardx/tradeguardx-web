import { sx } from './sx';

/**
 * What the dashboard shows while it works out what to show.
 *
 * One neutral page shape — title, hero, four figures, two panels — rather
 * than any real page's best guess. It says nothing about protection, plan or
 * setup, because none of that is known yet, and it is replaced exactly once
 * by the real page (see `ready` in GuardContext).
 *
 * The shimmer is a single sweep across each block, not a pulse on every
 * element, so the screen reads as one calm surface loading rather than a
 * dozen things blinking. Reduced motion: no sweep at all.
 */

function Block({ h, w = '100%', r = 12, style }) {
  return (
    <div
      className="tgx-skel"
      aria-hidden="true"
      style={sx('position:relative;overflow:hidden;background:var(--surface-2)', { height: h, width: w, borderRadius: r, ...style })}
    >
      <span className="tgx-skel__sweep" />
    </div>
  );
}

const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card)';

export default function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" style={sx('animation:tgxSlide .22s ease-out')}>
      <span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Loading your dashboard…</span>

      <Block h={26} w="min(220px,60%)" r={8} />
      <Block h={12} w="min(420px,85%)" r={6} style={{ marginTop: 12 }} />

      <section style={sx(`margin-top:22px;padding:28px;${CARD};display:flex;gap:28px;align-items:center;flex-wrap:wrap`)}>
        <div style={sx('flex:1;min-width:min(280px,100%)')}>
          <Block h={22} w={120} r={999} />
          <Block h={30} w="min(360px,90%)" r={8} style={{ marginTop: 18 }} />
          <Block h={12} w="min(460px,95%)" r={6} style={{ marginTop: 14 }} />
          <Block h={12} w="min(380px,80%)" r={6} style={{ marginTop: 8 }} />
        </div>
        <Block h={150} w={150} r={999} style={{ flex: 'none', margin: '0 auto' }} />
      </section>

      <div style={sx('margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px')}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={sx(`padding:18px;${CARD}`)}>
            <Block h={10} w="45%" r={5} />
            <Block h={28} w="60%" r={7} style={{ marginTop: 16 }} />
            <Block h={10} w="80%" r={5} style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>

      <div style={sx('margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:18px')}>
        {[0, 1].map((i) => (
          <div key={i} style={sx(`padding:20px;${CARD}`)}>
            <Block h={14} w="40%" r={6} />
            {[0, 1, 2].map((j) => (
              <div key={j} style={sx('display:flex;gap:12px;align-items:center;margin-top:18px')}>
                <Block h={28} w={28} r={8} style={{ flex: 'none' }} />
                <div style={{ flex: 1 }}>
                  <Block h={11} w="70%" r={5} />
                  <Block h={9} w="45%" r={5} style={{ marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
