import { useCallback, useRef, useState } from 'react';
import {
  ACHIEVEMENTS_EARNED,
  ACHIEVEMENTS_TOTAL,
  DAY_BARS,
  MONTH_HEAT,
  STRIP_ITEMS,
  STRIP_LOCKED,
  WEEK_BARS,
} from '../../lib/shareCards';

/**
 * "Your cards & achievements" — the strip at the bottom of Overview.
 *
 * Ported from reference/02_overview-share-strip.template.html.
 *
 * TWO PLACES THE PROMPT AND THE REFERENCE DISAGREE, and the handoff's README
 * says the reference wins:
 *
 *   - the heading. The prompt says "Your share cards" / "Made automatically
 *     when a trade, day, week or month closes. Tap one to share it." The
 *     template says "Your cards & achievements" / "A new card drops every time
 *     a trade, day, week or month closes. Keep your rules to unlock the rare
 *     ones." The second is the better promise anyway — it says what earns the
 *     rare ones.
 *   - the measurements. 262px min-height not 176, a 232px grid floor not 210,
 *     gap 16 not 14, hover translateY(-4px) rotate(-.8deg) not -3px/-.6deg.
 *
 * The template also carries two things the prompt never mentions: a 1.5px
 * gradient frame around every card, and a Guardy shield portrait on each.
 *
 * Shown only when the account is connected and protected. A card is a claim
 * that a rule held; on an account with no guard there is nothing to claim.
 */
export default function ShareCardsStrip({ show = true, onOpenShare, items = null, awards = null }) {
  // `items` is this account's real cards (shareBuild.stripItems). Without it
  // the strip falls back to the handoff's demo set, which is only correct on
  // the standalone preview page — on the dashboard it would be a stranger's
  // trades under this user's heading.
  const cards = items ?? STRIP_ITEMS;
  // Same rule for the achievements row: real progress, or the handoff's
  // sample on the preview page. Never the sample on a real account.
  const locked = awards?.rows ?? STRIP_LOCKED;
  const earned = awards?.earned ?? ACHIEVEMENTS_EARNED;
  const total = awards?.total ?? ACHIEVEMENTS_TOTAL;

  /*
   * ON A PHONE THESE ARE A RAIL, NOT A STACK.
   *
   * Four cards at full width is four screens of scrolling to see what you
   * have, and the fourth one is below the "What to do next" fold even after
   * moving the whole section up the page. Side by side is also how they are
   * meant to be read — the point of a set is that you can see the set.
   *
   * So: a horizontal snap rail at ≤700px, each card at 82% of the viewport so
   * the next one PEEKS. The peek is the affordance; a row that happens to be
   * scrollable with nothing hanging off the right edge reads as a row that
   * ends there. Layout is in index.css (.tgx-strip-rail) because the
   * scroll-snap and scrollbar-hiding rules have no inline equivalent.
   *
   * One card is not a rail. It keeps the grid and fills the width, rather
   * than sitting at 82% with a strip of dead space beside it.
   */
  const rail = cards.length > 1;
  const railRef = useRef(null);
  const [at, setAt] = useState(0);

  // Which card is under the middle of the viewport. Measured off the children
  // rather than divided out of scrollWidth: with snap padding and a peek those
  // two disagree, and the dot would land on the wrong card at the ends.
  const onScroll = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    [...el.children].forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    setAt(best);
  }, []);

  const goTo = useCallback((i) => {
    const el = railRef.current;
    const c = el?.children?.[i];
    if (!el || !c) return;
    el.scrollTo({ left: c.offsetLeft - el.clientLeft, behavior: 'smooth' });
  }, []);

  if (!show || cards.length === 0) return null;

  return (
    // It sits between the stat grid and the two-column row now, so it
    // carries a bottom gap as well — it used to be the last thing on the page.
    <section style={{ marginTop: 20, marginBottom: 22, border: '1px solid var(--line)', borderRadius: 18, background: 'var(--surface)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        <span style={{ flex: 'none', position: 'relative', width: 40, height: 40 }}>
          <span style={{ position: 'absolute', left: 12, top: 3, width: 22, height: 29, borderRadius: 6, transform: 'rotate(12deg)', background: 'linear-gradient(160deg,#7c3aed,#3b1d7a)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.25),0 4px 10px -4px rgba(0,0,0,.5)' }} />
          <span style={{ position: 'absolute', left: 5, top: 7, width: 22, height: 29, borderRadius: 6, transform: 'rotate(-8deg)', background: 'linear-gradient(160deg,#5ff2d2,#00a98a)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35),0 6px 14px -5px rgba(0,150,122,.6)', display: 'grid', placeItems: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04140f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
              <path d="M9 12l2.2 2.2L15.5 10" />
            </svg>
          </span>
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ font: "600 15px/1.2 'Space Grotesk',sans-serif", letterSpacing: '-.015em' }}>Your cards &amp; achievements</div>
          <div style={{ marginTop: 3, fontSize: 12, color: 'var(--ink-3)' }}>
            A new card drops every time a trade, day, week or month closes. Keep your rules to unlock the rare ones.
          </div>
        </div>
      </div>

      {/* auto-FILL, not auto-fit, and a ceiling on the column.
          auto-fit collapses empty tracks, so a single card stretched to the
          full 1140px of the panel — a 232px composition blown up five times,
          with its mini-chart bars rendered as 250px-wide stripes. auto-fill
          keeps the tracks, and the max keeps any one card at a size its
          contents were drawn for. */}
      <div
        ref={railRef}
        onScroll={rail ? onScroll : undefined}
        className={rail ? 'tgx-strip-rail' : undefined}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,232px),320px))', gap: 16, padding: '18px 18px 6px' }}
      >
        {cards.map((it) => (
          <div key={it.kind} className="tgx-strip-frame" style={{ padding: 1.5, borderRadius: 20, background: it.frame, boxShadow: '0 18px 40px -22px rgba(0,0,0,.9)', transition: 'transform .22s ease' }}>
            <button
              type="button"
              onClick={() => onOpenShare?.(it.kind)}
              style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 212, padding: '15px 15px 13px', border: 0, borderRadius: 18.5, overflow: 'hidden', background: 'linear-gradient(165deg,#0f1628,#070912)', color: '#fff', textAlign: 'left', cursor: 'pointer' }}
            >
              <span style={{ position: 'absolute', width: 200, height: 200, left: -80, top: -100, borderRadius: '50%', background: `radial-gradient(circle,${it.orb},transparent 66%)`, pointerEvents: 'none' }} />
              <span style={{ position: 'absolute', width: 210, height: 210, right: -100, bottom: -120, borderRadius: '50%', background: `radial-gradient(circle,${it.orb2},transparent 64%)`, pointerEvents: 'none' }} />
              <span style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px)', backgroundSize: '12px 12px', WebkitMaskImage: 'linear-gradient(180deg,#000,transparent 70%)', maskImage: 'linear-gradient(180deg,#000,transparent 70%)', pointerEvents: 'none' }} />
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg,transparent 30%,rgba(255,64,200,.13) 42%,rgba(64,200,255,.17) 50%,rgba(0,255,190,.13) 58%,transparent 70%)', mixBlendMode: 'screen', pointerEvents: 'none' }} />

              <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 8, background: 'rgba(255,255,255,.1)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)', display: 'grid', placeItems: 'center', color: it.accent }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={it.d1} />
                    {it.d2 && <path d={it.d2} />}
                  </svg>
                </span>
                <span style={{ flex: 1, minWidth: 0, font: "600 9px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.66)' }}>{it.k}</span>
                {it.fresh && (
                  <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px', borderRadius: 999, background: '#00d4aa', color: '#02241d', font: "700 8.5px/1 'JetBrains Mono',monospace", letterSpacing: '.08em' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#02241d', animation: 'tgxPulse 1.6s ease-in-out infinite' }} />
                    NEW
                  </span>
                )}
                {/* Earned, or absent. An empty chip was rendering on every
                    card whose trade no rule ever touched. */}
                {it.tier && (
                  <span style={{ flex: 'none', font: "700 8px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', padding: '4px 6px', borderRadius: 5, background: it.tierBg, color: it.tierFg }}>{it.tier}</span>
                )}
              </span>

              <span style={{ position: 'relative', marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', marginTop: 2, font: "700 18px/1.15 'Space Grotesk',sans-serif", letterSpacing: '-.025em', color: '#fff', textWrap: 'balance' }}>{it.ach}</span>
                </span>
                <svg width="46" height="54" viewBox="-120 -140 240 280" style={{ flex: 'none', marginTop: -4, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.5))' }}>
                  <path d="M0 -112 L96 -74 L96 0 C96 62 52 102 0 120 C-52 102 -96 62 -96 0 L-96 -74 Z" fill={it.c2} />
                  <path d="M0 -104 L88 -69 L88 -2 C88 54 48 92 0 108 C-48 92 -88 54 -88 -2 L-88 -69 Z" fill={it.c1} />
                  <path d="M0 -98 L80 -66 L80 -20 C60 -40 -60 -40 -80 -20 L-80 -66 Z" fill="rgba(255,255,255,.28)" />
                  <ellipse cx="-34" cy="-14" rx="21" ry="23" fill="#fff" />
                  <ellipse cx="34" cy="-14" rx="21" ry="23" fill="#fff" />
                  <circle cx="-32" cy="-20" r="10" fill="#0b1220" />
                  <circle cx="36" cy="-20" r="10" fill="#0b1220" />
                  <circle cx="-56" cy="34" r="13" fill="#ff7ab0" opacity=".55" />
                  <circle cx="56" cy="34" r="13" fill="#ff7ab0" opacity=".55" />
                  <path d={it.mood} fill="#0b1220" stroke="#0b1220" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </span>

              {/* No well when there is no chart to put in it. An empty inset
                  box reads as a graphic that failed to load. */}
              {hasChart(it, items === null) && (
                <span style={{ position: 'relative', display: 'block', height: 46, marginTop: 12, padding: '8px 9px', borderRadius: 11, background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.09)' }}>
                  <MiniChart kind={it.kind} series={it.series} demo={items === null} />
                </span>
              )}

              <span style={{ position: 'relative', marginTop: 'auto', paddingTop: 12, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ font: "700 26px/1 'Space Grotesk',sans-serif", letterSpacing: '-.045em', fontVariantNumeric: 'tabular-nums', color: it.accent, textShadow: `0 0 24px ${it.orb}` }}>{it.v}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.72)' }}>{it.vLabel}</span>
              </span>
              <span style={{ position: 'relative', marginTop: 4, fontSize: 11, lineHeight: 1.4, color: 'rgba(255,255,255,.6)' }}>{it.note}</span>

              <span style={{ position: 'relative', marginTop: 11, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1 }} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 999, background: 'rgba(255,255,255,.1)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)', fontSize: 11.5, fontWeight: 700, color: '#fff' }}>
                  Share
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Position in the rail. Only drawn where the rail exists — on a grid
          every card is already visible and a row of dots would be noise. */}
      {rail && (
        <div className="tgx-strip-dots" aria-hidden="true">
          {cards.map((it, i) => (
            <button
              key={it.kind}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              title={it.k}
              style={{
                width: i === at ? 18 : 6,
                height: 6,
                padding: 0,
                border: 0,
                borderRadius: 999,
                background: i === at ? 'var(--ink-3)' : 'var(--line-strong,var(--line))',
                transition: 'width .18s ease, background .18s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}

      <div style={{ padding: '14px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <span style={{ font: "600 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Next to unlock</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            <b style={{ color: 'var(--ink)', fontWeight: 700 }}>{earned}</b> of {total} achievements earned
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 10 }}>
          {locked.map((a) => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', border: '1px solid var(--line)', borderRadius: 13, background: 'var(--surface-2)' }}>
              <span style={{ flex: 'none', width: 36, height: 40, clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)', background: a.gem, display: 'grid', placeItems: 'center', color: '#0b1220' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={a.glyph} /></svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, lineHeight: 1.25 }}>{a.name}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--ink-3)' }}>{a.note}</span>
                {a.locked && (
                  <span style={{ display: 'block', marginTop: 6, height: 4, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: a.pct, borderRadius: 999, background: 'var(--mint-solid)' }} />
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Each card gets the chart its period actually has. */
/** Whether this card has a series worth drawing. Mirrors MiniChart's own
    conditions, so the well and its contents can never disagree. */
function hasChart(it, demo) {
  if (demo) return true;
  return it.kind === 'week' && Boolean(it.series?.length);
}

function MiniChart({ kind, series = null, demo = true }) {
  // A sparkline is a claim too. The trade line shows a price that kept falling
  // after the gold dot and the day bars show a session building to a target —
  // both are specific stories, and drawing them over a user's own card when we
  // have no series for them would be inventing the shape of their day.
  if (!demo && kind !== 'week') return null;
  if (!demo && kind === 'week' && !series?.length) return null;
  if (!demo && kind === 'week') {
    /*
     * Equal blocks, coloured by size — not bars sized by it.
     *
     * A height-encoded chart was tried twice here and failed the same way
     * both times: one day of ₹61,496 beside three of a few rupees leaves
     * every other day a single pixel, whichever scale you pick. Giving every
     * day the same block and putting the magnitude in the colour removes the
     * problem entirely, and matches the calendar the full-size card draws.
     */
    return (
      <span style={{ display: 'flex', gap: 4, height: 30, alignItems: 'stretch' }}>
        {series.map((d) => (
          <span
            key={d.key}
            title={`${d.label} ${d.text}`}
            style={{
              flex: 1,
              position: 'relative',
              borderRadius: 6,
              background: d.flat
                ? 'rgba(255,255,255,.07)'
                : d.up
                  ? `rgba(0,212,170,${0.16 + d.heat * 0.6})`
                  : `rgba(239,68,68,${0.16 + d.heat * 0.6})`,
              boxShadow: `inset 0 0 0 1px ${d.flat ? 'rgba(255,255,255,.12)' : d.up ? 'rgba(95,242,210,.4)' : 'rgba(255,138,128,.4)'}`,
            }}
          >
            {d.guarded && (
              <span style={{ position: 'absolute', left: '50%', top: '50%', width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5, borderRadius: '50%', background: '#f0b429', boxShadow: '0 0 6px rgba(240,180,41,.9)' }} />
            )}
          </span>
        ))}
      </span>
    );
  }
  if (kind === 'trade') {
    return (
      <svg viewBox="0 0 200 30" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 30 }}>
        <line x1="0" x2="200" y1="14" y2="14" stroke="rgba(255,122,112,.6)" strokeWidth="1.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <polyline points="0,6 14,4 26,3 40,6 54,8 66,7 80,10 94,12 108,11 120,14" fill="none" stroke="#ff7a70" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <polyline points="120,14 134,17 146,16 160,21 172,23 186,26 200,29" fill="none" stroke="#8794a8" strokeWidth="1.6" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        {/* The gold dot is where the rule fired. Everything right of it is the
            path the trade did not take. */}
        <circle cx="120" cy="14" r="3.4" fill="#f0b429" />
      </svg>
    );
  }
  if (kind === 'day') {
    return (
      <span style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 30 }}>
        {DAY_BARS.map((h, i) => (
          <span key={i} style={{ flex: 1, height: h, borderRadius: '3px 3px 1px 1px', background: 'linear-gradient(180deg,#ffe28a,#e09a00)' }} />
        ))}
        <span style={{ flex: 'none', width: 22, height: 22, marginLeft: 3, borderRadius: 7, background: 'rgba(240,180,41,.2)', display: 'grid', placeItems: 'center', color: '#fbc94f' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 11V8a5 5 0 0110 0v3" /><path d="M5 11h14v9H5z" />
          </svg>
        </span>
      </span>
    );
  }
  if (kind === 'week') {
    return (
      <span style={{ display: 'flex', gap: 7, height: 30 }}>
        {WEEK_BARS.map((b, i) => (
          <span key={i} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ height: 21, display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,.28)' }}>
              <span style={{ width: '100%', height: b.hu, borderRadius: '3px 3px 0 0', background: '#2fe3bd' }} />
            </span>
            {/* Red days hang BELOW the baseline, which is the whole point of
                this chart: a down day is visibly a different direction. */}
            <span style={{ height: 9 }}>
              <span style={{ display: 'block', width: '100%', height: b.hd, borderRadius: '0 0 3px 3px', background: '#ff7a70' }} />
            </span>
            {b.g && <span style={{ position: 'absolute', left: '50%', top: 26, width: 9, height: 9, margin: '-4.5px 0 0 -4.5px', borderRadius: '50%', background: '#f0b429', boxShadow: '0 0 8px rgba(240,180,41,.8)' }} />}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span style={{ display: 'grid', gridTemplateColumns: 'repeat(11,minmax(0,1fr))', gap: 3, height: 30, alignContent: 'center' }}>
      {MONTH_HEAT.map((c, i) => (
        <span key={i} style={{ aspectRatio: '1', borderRadius: 2.5, background: c.bg }} />
      ))}
    </span>
  );
}
