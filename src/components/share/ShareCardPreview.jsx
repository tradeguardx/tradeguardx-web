import { BRAND } from '../../lib/shareCards';

/**
 * The 4:5 share card, as it appears in the modal and as it is exported to PNG.
 *
 * The reference puts a play overlay on this card in Reel format, linking to a
 * reel page. We do not: the modal mounts ShareReel in this slot instead, so
 * pressing play never costs you the modal. The overlay is gone with it.
 *
 * Ported verbatim from reference/01_share-modal.template.html. Every radius,
 * orb, gradient and font size is the handoff's — this is the artefact a user
 * posts publicly, so "close enough" is not a thing it can be.
 *
 * The PNG export renders this same component at 1080×1350 rather than a second
 * implementation. Two implementations of one card is how the thing someone
 * previews stops being the thing they share.
 *
 * ONE SHAPE. There was a Post / Story / Square picker and three sets of type
 * sizes behind it. 4:5 is what every platform in the Share-to row takes
 * as-is, so the other two were a choice between the shape that always works
 * and two that sometimes do — see SHARE_SIZE in shareCards.js.
 */
/**
 * The three points on a trade's curve that are worth a marker.
 *
 * `exit` is the loud one — it is where the rule fired, or where the user got
 * out. `held` only exists on a card that shows an after-path, and it is where
 * the position would have ended.
 */
const DOTS = {
  entry: { r: 3.5, bg: '#e8eefc', ring: 3, halo: 'rgba(232,238,252,.22)' },
  exit: { r: 4.5, bg: '#f0b429', ring: 3.5, halo: 'rgba(240,180,41,.30)' },
  held: { r: 3.5, bg: '#ff7a70', ring: 3, halo: 'rgba(255,122,112,.26)' },
};

export default function ShareCardPreview({
  card,
  rulesOn = true,
  /*
   * NO DEMO DEFAULT.
   *
   * This defaulted to DEFAULT_RULE_CHIPS — '−$220 max loss', '+$400 target'
   * and two more from the handoff's demo account. The real host always passes
   * an array, so it never fired; it was one missing prop away from printing
   * four rules this user never set onto the artefact they publish under their
   * own name. The same shape of default has already shipped '@arjun.trades',
   * 'ARJUN14' and 'Delta Exchange' onto real cards. No rules means no chips.
   */
  rules = [],
  handle,
  referral,
  /** The PNG export freezes the sheen and renders at a fixed width. */
  width,
}) {
  /*
   * The card's accent follows the OUTCOME, not the template.
   *
   * Every figure and badge on here was hard-coded mint, so a trade the user
   * had just lost money on arrived as a large green number under a green
   * badge. The colour is the first thing read and it was telling the opposite
   * of the truth.
   */
  const TONES = {
    mint: {
      fg: '#3ff0c8', glow: 'rgba(0,212,170,.45)', tint: 'rgba(0,212,170,.16)', chip: '#3ff0c8',
      line: '#2fe3bd', orbA: 'rgba(0,212,170,.42)', orbB: 'rgba(122,215,255,.34)', wash: 'rgba(0,255,190,.20)',
    },
    red: {
      fg: '#ff8a80', glow: 'rgba(239,68,68,.42)', tint: 'rgba(239,68,68,.16)', chip: '#ff9b93',
      line: '#ff7a70', orbA: 'rgba(239,68,68,.38)', orbB: 'rgba(255,122,217,.30)', wash: 'rgba(255,64,140,.18)',
    },
    amber: {
      fg: '#fbc94f', glow: 'rgba(240,180,41,.42)', tint: 'rgba(240,180,41,.16)', chip: '#fbc94f',
      line: '#f0b429', orbA: 'rgba(240,180,41,.38)', orbB: 'rgba(255,122,217,.26)', wash: 'rgba(255,200,97,.18)',
    },
  };
  const tone = TONES[card.tone] ?? TONES.mint;

  // The badge means something now that tiers are earned, so it should not look
  // the same on a COMMON card as on a LEGENDARY one.
  const TIERS = {
    COMMON: { bg: 'rgba(255,255,255,.12)', fg: '#c9d2e0' },
    RARE: { bg: 'rgba(122,215,255,.2)', fg: '#7ad7ff' },
    EPIC: { bg: 'rgba(177,145,251,.24)', fg: '#c4b0ff' },
    LEGENDARY: { bg: 'rgba(240,180,41,.24)', fg: '#ffe28a' },
  };
  /*
   * No tier chip unless one was earned. See tierFor() in shareBuild.js: a
   * trade the user closed themselves is "Closed green" and nothing more, and
   * the chip means something again on the cards that do carry it.
   */
  const tier = card.tier ? TIERS[card.tier] ?? TIERS.RARE : null;

  /*
   * The tiles under the chart, from the card.
   *
   * "Mine / If I'd held" is a comparison, and it only exists where there is
   * something to compare against — an after-path the guard created by closing
   * the position. Without one the row used to disappear entirely, taking the
   * two facts a stranger actually wants with it. buildTradeCard supplies the
   * right trio per outcome; the fallback keeps the handoff's demo cards and
   * the older tests rendering what they always did.
   */
  const tiles = card.tiles ?? (card.chart?.gap
    ? [
        { k: 'Mine', v: card.pill, c: 'tone', dot: 'tone' },
        { k: 'If I\u2019d held', v: card.heldLabel, c: '#ff9b93', dot: '#ff7a70' },
      ]
    : []);
  // 'tone' means "whatever colour this card's outcome is", resolved here
  // because the builder has no business knowing the palette.
  const col = (c) => (c === 'tone' ? tone.fg : c ?? '#fff');
  const dotCol = (c) => (c === 'tone' ? tone.line : c ?? 'rgba(255,255,255,.35)');

  // Shared by the two mounted copies (preview and the off-screen export), and
  // identical in both, so a collision would be a no-op.
  const gid = `tgx-${card.tone ?? 'mint'}`;

  const chipStyle = {
    padding: '4px 8px',
    borderRadius: 999,
    background: 'linear-gradient(165deg,rgba(255,255,255,.1),rgba(255,255,255,.035))',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.17),inset 0 1px 0 rgba(255,255,255,.22)',
    fontSize: 9.5,
    fontWeight: 700,
    color: '#d7e0ec',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: width ?? '100%',
        maxWidth: width ?? 310,
        aspectRatio: '4 / 5',
        borderRadius: 22,
        overflow: 'hidden',
        background: 'linear-gradient(160deg,#16244a 0%,#0c1226 48%,#05070f 100%)',
        color: '#fff',
        fontFamily: 'Manrope,sans-serif',
        boxShadow: '0 30px 70px -25px rgba(0,0,0,.9)',
      }}
    >
      <div style={{ position: 'absolute', width: 360, height: 360, left: -130, top: -160, borderRadius: '50%', background: `radial-gradient(circle,${tone.orbA},transparent 62%)` }} />
      <div style={{ position: 'absolute', width: 380, height: 380, right: -170, bottom: -180, borderRadius: '50%', background: `radial-gradient(circle,${tone.orbB},transparent 60%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg,transparent 20%,${tone.wash} 44%,rgba(255,255,255,.09) 52%,transparent 76%)`, mixBlendMode: 'screen' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.45, backgroundImage: 'radial-gradient(rgba(255,255,255,.06) 0.5px,transparent 0.5px)', backgroundSize: '3px 3px' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 22, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2),inset 0 1.5px 0 rgba(255,255,255,.38),inset 0 -40px 60px -40px rgba(0,0,0,.8)' }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 17px 14px' }}>
        {/*
          EVERY SIZE ON THIS CARD WENT UP, AND THE ACHIEVEMENT ROW CAME OFF.

          The card had eighteen elements and all but two of them were 7–10px
          grey on near-black. At a glance it read as one bright number floating
          on noise, and a reposted screenshot lost the rest entirely. Nothing
          here is below 9px now, every label is a readable grey, and the tier
          moved into the badge so a whole row could go.
        */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(145deg,#00d4aa,#00a98a)', display: 'grid', placeItems: 'center', boxShadow: '0 5px 14px -4px rgba(0,212,170,.8),inset 0 1px 0 rgba(255,255,255,.45)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#04140f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
                <path d="M9 12l2.2 2.2L15.5 10" />
              </svg>
            </div>
            <span style={{ display: 'grid', gap: 3 }}>
              <span style={{ font: "700 15px/1 'Space Grotesk',sans-serif", letterSpacing: '-.015em' }}>
                TradeGuard<span style={{ color: '#00d4aa' }}>X</span>
              </span>
              <span style={{ font: '700 9px/1 Manrope,sans-serif', color: '#8fe9d4', whiteSpace: 'nowrap' }}>
                {BRAND.tagline}
              </span>
            </span>
          </div>
          {/* The venue the trade actually happened on. This was hard-coded to
              Delta, logo and orange dot and all, so a Shark account's card
              told the world the trade happened somewhere it did not. */}
          {card.venue && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 11px 4px 4px', borderRadius: 999, background: 'linear-gradient(165deg,rgba(255,255,255,.16),rgba(255,255,255,.06))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22),inset 0 1px 0 rgba(255,255,255,.28)', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
              <span style={{ width: 21, height: 21, borderRadius: '50%', background: card.venue.bg, color: card.venue.fg, display: 'grid', placeItems: 'center', font: "800 11px/1 'Space Grotesk',sans-serif", boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45)' }}>{card.venue.mark}</span>
              {card.venue.name}
            </span>
          )}
        </div>

        <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ font: `700 19px/1 'Space Grotesk',sans-serif`, letterSpacing: '-.025em' }}>{card.sym}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#d7e0ec' }}>{card.meta}</span>
          <span style={{ flex: 1 }} />
          {/* Tier folded in here, so the old achievement row could go. */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 'none', font: `700 8.5px/1 'JetBrains Mono',monospace`, letterSpacing: '.1em', textTransform: 'uppercase', padding: '5px 8px', borderRadius: 7, background: tone.tint, color: tone.chip, boxShadow: `inset 0 0 0 1px ${tone.tint}` }}>
            {card.badge}
            {tier && (
              <span style={{ padding: '2px 4px', borderRadius: 4, background: tier.bg, color: tier.fg, letterSpacing: '.08em' }}>{card.tier}</span>
            )}
          </span>
        </div>

        <div style={{ marginTop: 10, font: `800 13.5px/1.3 'Space Grotesk',sans-serif`, letterSpacing: '-.015em', color: '#fff', textWrap: 'balance' }}>
          {card.headline ?? card.label}
        </div>

        <div style={{ marginTop: 5, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ font: `700 50px/1 'Space Grotesk',sans-serif`, letterSpacing: '-.06em', color: tone.fg, textShadow: `0 0 40px ${tone.glow}` }}>
            {card.hero}
            <span style={{ fontSize: '.44em', opacity: 0.68 }}>{card.dec}</span>
          </span>
          {card.heroNote && (
            <span style={{ font: "700 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', textTransform: 'uppercase', color: tone.chip }}>{card.heroNote}</span>
          )}
        </div>

        {/*
          The saving, under the figure rather than instead of it.

          The hero used to BE the saving, which is a modelled number — the
          realised P&L minus the worst point the price reached afterwards. On
          a trade that banked ₹61,496.54 the card led with ₹72,716.96 and the
          only possible reaction was "where did 72 come from?". The number
          people can check leads; this is the context for it.
        */}
        {card.heroSub && (
          <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 6, font: "700 10px/1.3 Manrope,sans-serif", color: '#9fb3cc' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff7a70', flex: 'none' }} />
            {card.heroSub}
          </div>
        )}

        {/*
          THE CHART KEEPS ITS SHAPE.

          Outer box takes the leftover height; the inner one is locked to 3:1
          and centred in it. `aspect-ratio` with `max-height:100%` means the
          chart narrows rather than squashing when the column runs short — the
          curve is the card's actual claim, so nothing above it is allowed to
          change its shape by taking a line more or less than expected.
        */}
        <div style={{ position: 'relative', marginTop: 15, flex: '1 1 auto', minHeight: 60, display: 'flex' }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 1', maxHeight: '100%', margin: 'auto', borderRadius: 14, overflow: 'hidden', background: 'linear-gradient(165deg,rgba(255,255,255,.11),rgba(255,255,255,.03))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18),inset 0 1px 0 rgba(255,255,255,.28)' }}>
            {/* Behind the data, not over it — he used to sit on top of the
                marker at the close and hide it. */}
            {!card.calendar && (
              <span style={{ position: 'absolute', right: 8, bottom: 6, width: 58, height: 66, filter: 'drop-shadow(0 7px 14px rgba(0,0,0,.6))' }}>
                <Guardy tone={card.tone} />
              </span>
            )}

            {card.chart ? (
              <>
                <svg viewBox={`0 0 ${card.chart.w} ${card.chart.h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id={`${gid}-area`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={tone.line} stopOpacity="0.48" />
                      <stop offset="100%" stopColor={tone.line} stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={`${gid}-gap`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff5f57" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#ff5f57" stopOpacity="0.42" />
                    </linearGradient>
                  </defs>
                  <polygon points={card.chart.area} fill={`url(#${gid}-area)`} />
                  {/* Break-even, which is the entry. Labelled in HTML below:
                      text inside a preserveAspectRatio="none" viewBox is text
                      at the wrong width. */}
                  {card.chart.zeroY != null && (
                    <line x1={card.chart.padX} x2={card.chart.w - card.chart.padX} y1={card.chart.zeroY} y2={card.chart.zeroY} stroke="rgba(255,255,255,.26)" strokeWidth="0.7" strokeDasharray="3 4" />
                  )}
                  {card.chart.gap && <polygon points={card.chart.gap} fill={`url(#${gid}-gap)`} />}
                  {/*
                    ONE stroke.

                    It was three stacked on each other — a 7px ghost, a 3px
                    line and the marker's halo — which at card size reads as a
                    band rather than a curve and buries the shape of the move
                    it is drawing. A single thin line with one glow under it
                    says the same thing and lets you see the data.
                  */}
                  <polyline
                    points={card.chart.line}
                    fill="none"
                    stroke={tone.line}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${tone.line})` }}
                  />
                  {card.chart.tail && (
                    <polyline points={card.chart.tail} fill="none" stroke="#ff7a70" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" />
                  )}
                </svg>

                {/* An unlabelled dotted line is decoration. There were two of
                    them, and neither said what it was. */}
                {card.chart.zeroPct != null && (
                  <span style={{ position: 'absolute', left: 10, top: `${card.chart.zeroPct}%`, marginTop: -5, font: "700 9px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#8fa7c4' }}>ENTRY</span>
                )}

                {/* Round dots, as HTML, because the SVG they sit over is
                    stretched to the panel and a stretched circle is an
                    ellipse. See chartGeometry's px/py note. */}
                {(card.chart.dots ?? []).map((d) => {
                  const k = DOTS[d.id] ?? DOTS.entry;
                  return (
                    <span
                      key={d.id}
                      style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, width: k.r * 2, height: k.r * 2, marginLeft: -k.r, marginTop: -k.r, borderRadius: '50%', background: k.bg, boxShadow: `0 0 0 ${k.ring}px ${k.halo}` }}
                    />
                  );
                })}
              </>
            ) : card.calendar ? (
              /* A week is a calendar, not a curve. Every day is the same tile and
                 carries its own figure, so a quiet day stays legible next to one
                 that made the week — depth of colour stands in for size. */
              <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${card.calendar.length},1fr)`, gap: 5, padding: 9 }}>
                {card.calendar.map((d) => (
                  <span
                    key={d.key}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      borderRadius: 10,
                      background: d.flat
                        ? 'rgba(255,255,255,.05)'
                        : d.up
                          ? `rgba(0,212,170,${0.1 + d.heat * 0.42})`
                          : `rgba(239,68,68,${0.1 + d.heat * 0.42})`,
                      boxShadow: `inset 0 0 0 1px ${d.flat ? 'rgba(255,255,255,.1)' : d.up ? 'rgba(95,242,210,.34)' : 'rgba(255,138,128,.34)'}`,
                    }}
                  >
                    <span style={{ font: "700 8.5px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#b3c1d6' }}>{d.label}</span>
                    <span style={{ font: "700 12px/1 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: d.flat ? '#9fb0c8' : d.up ? '#5ff2d2' : '#ff9b93' }}>{d.text}</span>
                    {/* The days a rule stepped in. */}
                    {d.guarded && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f0b429" strokeWidth="2.6" strokeLinejoin="round" style={{ position: 'absolute', top: 4, right: 4 }}>
                        <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
                      </svg>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              /* No priced path — an exotic pair, or a trade that closed where it
                 opened. The panel used to be a large empty frame with one grey
                 line in the middle of it; the trade's own facts fill it honestly
                 instead. */
              <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, padding: 10 }}>
                {(card.facts ?? []).map((f) => (
                  <span key={f.k} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>
                    <span style={{ font: "700 8.5px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', textTransform: 'uppercase', color: '#b3c1d6' }}>{f.k}</span>
                    <span style={{ font: "700 13px/1 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: f.c ?? '#fff' }}>{f.v}</span>
                  </span>
                ))}
              </div>
            )}

          </div>
        </div>

        {tiles.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            {tiles.map((f) => (
              <span key={f.k} style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 12, background: 'linear-gradient(165deg,rgba(255,255,255,.12),rgba(255,255,255,.04))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, font: `700 8.5px/1 'JetBrains Mono',monospace`, letterSpacing: '.12em', textTransform: 'uppercase', color: '#b3c1d6' }}>
                  {f.dot && <span style={{ width: 9, height: 2.5, borderRadius: 2, background: dotCol(f.dot) }} />}
                  {f.k}
                </span>
                <span style={{ display: 'block', marginTop: 5, font: `700 15px/1 'Space Grotesk',sans-serif`, letterSpacing: '-.02em', color: col(f.c) }}>{f.v}</span>
              </span>
            ))}
          </div>
        )}

        {rulesOn && rules.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {rules.map((r) => (
              <span key={r} style={chipStyle}>{r}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 11, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid rgba(255,255,255,.14)' }}>
          {/*
            The venue list came off.

            "Live on Delta · CoinDCX · Shark" was a claim about the product
            printed on an artefact the USER publishes under their own name,
            and it has to be re-verified every time a venue's status changes.
            The tagline at the top already says what this is; the footer's job
            is whose trade it was and the ask.
          */}
          <span style={{ minWidth: 0 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#d7e0ec', whiteSpace: 'nowrap' }}>
              {/* No handle means no handle. '@arjun.trades' is the handoff's
                  demo account, and putting it under someone else's trade is
                  attributing their result to a stranger. */}
              {[handle, card.date].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 8px 7px 12px', borderRadius: 999, background: 'linear-gradient(145deg,#00e8bb,#00a98a)', color: '#02241d', fontSize: 11, fontWeight: 800, boxShadow: '0 6px 18px -6px rgba(0,212,170,.9)', whiteSpace: 'nowrap' }}>
            Would yours hold?
            {referral && <span style={{ font: "800 9px/1 'JetBrains Mono',monospace", padding: '3px 5px', borderRadius: 5, background: 'rgba(2,36,29,.24)' }}>{referral}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Guardy, at card size.
 *
 * The reel's Guardy is a rig with moods, arms, sweat and blinks. This is one
 * still of him, which is all a card needs — but it is the same shield, so the
 * character a user meets in the reel is the one on the thing they post.
 */
function Guardy({ tone = 'mint' }) {
  const BODY = {
    mint: ['#5ff2d2', '#00b893'],
    red: ['#ffb3ad', '#d63a2f'],
    amber: ['#ffe28a', '#e09a00'],
  };
  const [c1, c2] = BODY[tone] ?? BODY.mint;
  // Pleased when the rule paid off, level when it merely held.
  const mouth = tone === 'red' ? 'M-26 36 Q0 46 26 36 Q0 38 -26 36' : 'M-30 34 Q0 64 30 34 Q0 40 -30 34';

  return (
    <svg viewBox="-120 -140 240 280" style={{ width: '100%', height: '100%' }}>
      <path d="M0 -112 L96 -74 L96 0 C96 62 52 102 0 120 C-52 102 -96 62 -96 0 L-96 -74 Z" fill={c2} />
      <path d="M0 -104 L88 -69 L88 -2 C88 54 48 92 0 108 C-48 92 -88 54 -88 -2 L-88 -69 Z" fill={c1} />
      <path d="M0 -98 L80 -66 L80 -20 C60 -40 -60 -40 -80 -20 L-80 -66 Z" fill="rgba(255,255,255,.28)" />
      <ellipse cx="-34" cy="-14" rx="21" ry="23" fill="#fff" />
      <ellipse cx="34" cy="-14" rx="21" ry="23" fill="#fff" />
      <circle cx="-32" cy="-20" r="10" fill="#0b1220" />
      <circle cx="36" cy="-20" r="10" fill="#0b1220" />
      <circle cx="-56" cy="34" r="13" fill="#ff7ab0" opacity=".5" />
      <circle cx="56" cy="34" r="13" fill="#ff7ab0" opacity=".5" />
      <path d={mouth} fill="#0b1220" stroke="#0b1220" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
