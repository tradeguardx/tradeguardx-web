import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Guardy from './Guardy';
import PriceChart from './PriceChart';
import SavedCard from './SavedCard';
import WeekBars from './WeekBars';
import { M, at, bump, clamp, colourFor, interpolate, money, split, tw, usd } from '../../../lib/reelMotion';
import { CUES, FONT_B, FONT_D, FONT_M, RULES, STORIES, dayVal, yRange } from '../../../lib/reelStories';

const W = 1080;
const H = 1920;
const { S, Tr, G, C, END } = CUES;

/**
 * The TradeGuardX share reel: 1080×1920, 17.6s, looping.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY IT SCALES RATHER THAN REFLOWS
 *
 * This has to render on the marketing site and inside the dashboard, on a
 * desktop and on a phone — and it also has to export to MP4 at exactly
 * 1080×1920. Those are the same requirement only if the layout never reflows:
 * every element is positioned in design pixels on a fixed stage, and the whole
 * stage is scaled by one factor to fit whatever box it is given.
 *
 * A responsive layout would be the normal answer and is the wrong one here. It
 * would mean the phone preview and the exported video are different
 * compositions, so what a user sees before sharing is not what they share.
 * ──────────────────────────────────────────────────────────────────────────
 */
export default function ShareReel({
  story: storyId = 'trade',
  /** The account's own story. Falls back to the demo set only when absent,
      which on the dashboard never happens — the modal hides the Reel format
      for a tab it has no real story for. */
  data = null,
  id,
  color,
  captions = true,
  handle,
  referral,
  /** Plain strings for the end card's chip row. */
  rules,
  /** {k, v, c} for the rail of rule blocks. A different shape from `rules`. */
  ruleBlocks = null,
  /**
   * The account's settlement symbol. Every figure in the reel is drawn from
   * the account's own ledger, so a hard-coded '$' renders a Shark trader's
   * rupees as dollars — the same figure, off by roughly eighty to one, on the
   * artefact they post publicly.
   */
  sym = '$',
  /**
   * The venue the trade happened on, as venueMark() describes it. The reel
   * had Delta's name and orange dot hard-coded in two places — the header and
   * the end card — so a Shark trade's reel announced the wrong exchange
   * twice, in a video the user posts under their own name.
   */
  venue = null,
  className,
  style,
}) {
  const story = data ?? STORIES[storyId] ?? STORIES.trade;
  const { P, A } = story;
  const { HI, LO0, LO1 } = yRange(story);
  const XN = P.length - 1;
  const XA = A.length - 1;

  // One pick per mount when there is no id, never per frame — a colour that
  // changed mid-reel would be a different character every second. A lazy state
  // initialiser rather than a ref: it runs once, outside render, which is both
  // what we want and what keeps the render pure.
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  const body = color || colourFor(id, seed);

  const hostRef = useRef(null);
  const [scale, setScale] = useState(0);
  const [T, setT] = useState(0);
  const reduced = usePrefersReducedMotion();
  // Reduced motion gets the final frame and a play button; the reel is
  // decorative until someone asks for it.
  const [playing, setPlaying] = useState(!reduced);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setScale(Math.min(r.width / W, r.height / H));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Paused while off screen. On a phone this is the difference between a
  // marketing page that scrolls smoothly and one running a 30fps render
  // nobody is looking at.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => setVisible(entries[0]?.isIntersecting ?? true), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return undefined;
    let raf = 0;
    // Wall-clock, not an accumulator: a dropped frame must skip ahead rather
    // than stretch the reel, so the music of it stays the same length.
    const t0 = performance.now() / 1000 - T;
    const tick = () => {
      setT(((performance.now() / 1000 - t0) % END + END) % END);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // T is deliberately omitted: including it would restart the loop every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, visible]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return (
    <div
      ref={hostRef}
      className={className}
      onClick={toggle}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '9 / 16',
        overflow: 'hidden',
        background: '#05070d',
        cursor: 'pointer',
        ...style,
      }}
    >
      {scale > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: W,
            height: H,
            transform: `translate(-50%,-50%) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <Frame
            T={reduced && !playing ? END - 0.5 : T}
            story={story}
            P={P}
            A={A}
            XN={XN}
            XA={XA}
            HI={HI}
            LO0={LO0}
            LO1={LO1}
            body={body}
            captions={captions}
            handle={handle}
            referral={referral}
            rules={rules}
            ruleBlocks={ruleBlocks}
            sym={sym}
            venue={venue}
          />
        </div>
      )}
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '18%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', backdropFilter: 'blur(4px)' }}>
            <svg viewBox="0 0 24 24" fill="#fff" style={{ width: '42%' }}><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = (e) => setReduced(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Everything below is a pure function of T. No state, no effects, no clock. */
function Frame({ T, story, P, A, XN, XA, HI, LO0, LO1, body, captions, handle, referral, rules, ruleBlocks, sym = '$', venue = null }) {
  const K = story.k;
  const WIN = story.win;

  const drawP = tw(0, 1, Tr + 0.7, G, M.glide)(T);
  const afterP = tw(0, 1, G + 1.1, G + 2.8, M.glide)(T);
  // The week counts up as its bars land; everything else reads a point off
  // the drawn path.
  const live = story.days
    ? story.days.reduce((sum, d, i) => sum + dayVal(d, i, T, Tr), 0)
    : at(P, drawP);
  const savedNow = story.saved * afterP;

  const liveMood = live >= 0 ? clamp(live / (40 * K), 0, 1) : clamp(live / (140 * K), -1, 0);
  const toLive = tw(0, 1, Tr, Tr + 0.7)(T);
  let mood = 0.6 + (liveMood - 0.6) * toLive;
  // Shock, then relief, then joy. The loss story earns its ending; the win
  // story is already there and only widens.
  if (T >= G) {
    mood = WIN
      ? interpolate([G, G + 0.4, G + 2.6], [0.7, 1, 1], M.glide)(T)
      : interpolate([G, G + 0.25, G + 0.8, G + 2.6], [-1, -0.6, 0.3, 1], M.glide)(T);
  }

  // The user's own rules when we have them. The rail is the part of the reel
  // that says "these are the limits I wrote", so the demo set here would be a
  // claim about rules this account never had.
  const railBlocks = ruleBlocks?.length ? ruleBlocks : RULES;
  const launches = railBlocks.map((_, i) => S + 0.8 + i * 0.45);
  // An account with no rules on has no blocks, and Math.max of nothing is
  // -Infinity, which propagates into Guardy's arm transform as NaN.
  let arms = (launches.length ? Math.max(...launches.map((l) => bump(T, l, 0.3))) : 0) * 0.9;
  if (T >= Tr && T < G) arms = clamp((live - 18 * K) / (25 * K), 0, 1);
  if (T >= G) arms = WIN ? tw(0.4, 1, G, G + 0.4, M.pop)(T) : tw(0, 1, G + 2, G + 2.6, M.pop)(T);
  const wave = T >= C + 0.8 ? Math.max(0, Math.sin((T - C) * 9)) * 0.35 : 0;
  const sweat = T < G ? clamp((-live - 120 * K) / (80 * K), 0, 1) : WIN ? 0 : tw(1, 0, G + 0.3, G + 1)(T);
  const ph = T % 2.9;
  const blink = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
  const bounce = -Math.abs(Math.sin(T * 8.5)) * 26 * (clamp(mood - 0.3, 0, 0.7) / 0.7);

  const gx = interpolate([Tr - 0.2, Tr + 0.6, C, C + 0.8], [540, 540, 540, 880], M.glide)(T);
  const gyBase = interpolate([0, 0.6, Tr - 0.2, Tr + 0.6, C, C + 0.8], [1300, 1250, 1250, 1590, 1590, 1640], M.glide)(T);
  const gs = interpolate([0, 0.6, Tr - 0.2, Tr + 0.6, C, C + 0.8], [0, 1.45, 1.45, 1.05, 1.05, 0.82], M.pop)(T);
  const lookY = T >= Tr && T < C ? -9 : 0;
  const lookX = T >= Tr && T < G ? (drawP - 0.5) * 12 : 0;

  const grid = [[100, 540], [580, 540], [100, 740], [580, 740]];
  const rail = (i) => [80 + i * 232, 1235];
  const shake = !WIN && T > G && T < G + 0.45 ? Math.sin((T - G) * 70) * 14 * (1 - (T - G) / 0.45) : 0;
  const panelO = tw(0, 1, Tr, Tr + 0.6, M.enter)(T) * tw(1, 0, C, C + 0.5, M.enter)(T);
  const panelS = 0.96 + 0.04 * tw(0, 1, Tr, Tr + 0.6, M.enter)(T);
  // The reveal: the chart widens past the close and drops its floor, bringing
  // the path the trade did not take into frame.
  const xMax = tw(XN, story.mode === 'parallel' ? XN : XN + XA, G + 0.7, G + 1.7)(T);
  const lo = tw(LO0, LO1, G + 0.7, G + 1.7)(T);
  const flash = T >= G ? tw(1, 0, G, G + 0.6, M.enter)(T) : 0;
  const stampS = tw(0, 1, G + 0.08, G + 0.45, M.pop)(T);
  const stampO = stampS > 0 ? Math.min(1, stampS) * tw(1, 0, G + 2.6, G + 3, M.enter)(T) : 0;
  const lossLit = story.limitLabel
    ? T < G
      ? story.near(live)
      : tw(1, 0.35, G + 0.5, G + 1.5)(T)
    : 0;

  const pnlO = tw(0, 1, Tr + 0.2, Tr + 0.8, M.enter)(T) * tw(1, 0, G + 1.0, G + 1.3, M.enter)(T);
  const savO = tw(0, 1, G + 1.15, G + 1.5, M.enter)(T) * tw(1, 0, C, C + 0.45, M.enter)(T);
  const [pm, pd] = split(money(live, sym));
  /*
   * THE REVEAL FIGURE CARRIES ITS SIGN.
   *
   * Unsigned is right for a SAVING — "you avoided ₹921.80" is a positive
   * amount however the trade itself went. It is wrong when the reveal is the
   * trade's own result: a ₹5.97 loss arrived as a bare "₹5.97", in mint,
   * under a label that scrolls past in half a second. `savedNeg` is set by
   * the story that knows which of the two this is.
   */
  const revealMag = Math.max(0, savedNow);
  const [sm, sd] = split(story.savedNeg ? money(-revealMag, sym) : usd(revealMag, sym));
  const savedC = story.savedC ?? '#2fe3bd';
  const savedGlow = savedC === '#2fe3bd' ? 'rgba(0,212,170,.45)' : 'rgba(239,68,68,.42)';
  const headerO = tw(1, 0, C, C + 0.5, M.enter)(T);

  const cardP = tw(0, 1, C + 0.35, C + 1.25, M.pop)(T);
  const cardO = tw(0, 1, C + 0.35, C + 0.8, M.enter)(T);
  const sheen = tw(0, 100, C + 1.2, C + 2.5)(T).toFixed(1) + '% 50%';
  const tagO = tw(0, 1, C + 1.4, C + 1.9, M.enter)(T);
  // Black at both ends so the loop closes without a cut.
  const black = Math.max(tw(1, 0, 0, 0.45, M.enter)(T), tw(0, 1, END - 0.45, END, M.enter)(T));

  const CX = 130;
  const CY = 600;
  const CW = 820;
  const CH = 560;
  const Xc = (i) => CX + (i / xMax) * CW;
  const Yc = (v) => CY + (1 - (v - lo) / (HI - lo)) * CH;

  const shieldPath = 'M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'linear-gradient(170deg,#0b1220 0%,#05070d 70%)', fontFamily: FONT_B, color: '#f6f9fc' }}>
      <div style={{ position: 'absolute', width: 1100, height: 1100, left: -420, top: -460, borderRadius: '50%', background: `radial-gradient(circle,rgba(0,212,170,${0.22 + 0.12 * clamp(liveMood, 0, 1)}),transparent 64%)` }} />
      <div style={{ position: 'absolute', width: 1200, height: 1200, right: -560, bottom: -520, borderRadius: '50%', background: `radial-gradient(circle,rgba(${T < G && live < -100 * K ? '239,68,68' : '124,58,237'},.24),transparent 62%)` }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.035) 2px,transparent 2px)', backgroundSize: '72px 72px', WebkitMaskImage: 'radial-gradient(ellipse at 50% 35%,#000 15%,transparent 75%)', maskImage: 'radial-gradient(ellipse at 50% 35%,#000 15%,transparent 75%)' }} />

      <div style={{ position: 'absolute', left: 80, right: 80, top: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: headerO }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(145deg,#00d4aa,#00a98a)', display: 'grid', placeItems: 'center' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#04140f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d={shieldPath} /><path d="M9 12l2.2 2.2L15.5 10" />
            </svg>
          </div>
          <div style={{ font: `700 36px/1 ${FONT_D}`, letterSpacing: '-.02em' }}>TradeGuard<span style={{ color: '#00d4aa' }}>X</span></div>
        </div>
        {venue && (
          <div style={{ boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 22px 10px 10px', borderRadius: 999, background: 'rgba(255,255,255,.06)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.1)' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: venue.bg, color: venue.fg, display: 'grid', placeItems: 'center', font: `800 22px/1 ${FONT_D}` }}>{venue.mark}</div>
            <span style={{ fontSize: 26, fontWeight: 700 }}>{venue.name}</span>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 80, right: 80, top: 250, opacity: pnlO }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ font: `700 38px/1 ${FONT_D}` }}>{story.sym}</span>
          <span style={{ boxSizing: 'border-box', font: `700 22px/1 ${FONT_M}`, letterSpacing: '.1em', padding: '10px 14px', borderRadius: 10, background: 'rgba(0,212,170,.16)', color: '#2fe3bd' }}>{story.tag}</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, font: `600 22px/1 ${FONT_M}`, letterSpacing: '.14em', color: '#8794a8' }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: '#ff7a70', opacity: 0.5 + 0.5 * Math.abs(Math.sin(T * 4)) }} />
            {story.liveLabel}
          </span>
        </div>
        <div style={{ marginTop: 26, font: `700 150px/1 ${FONT_D}`, letterSpacing: '-.055em', fontVariantNumeric: 'tabular-nums', color: live >= 0 ? '#2fe3bd' : '#ff7a70', textShadow: `0 0 70px ${live >= 0 ? 'rgba(0,212,170,.4)' : 'rgba(239,68,68,.4)'}` }}>
          {pm}<span style={{ fontSize: '.5em', opacity: 0.6 }}>{pd}</span>
        </div>
      </div>

      {/*
        The reveal figure.

        Mint is right when the number is a SAVING — the rule was worth that
        much. It is wrong on a reel whose reveal is the trade's own result and
        that result was a loss: the figure the whole second act builds to
        would arrive in the colour of a win. `savedC` lets the story say.
      */}
      <div style={{ position: 'absolute', left: 80, right: 80, top: 250, opacity: savO }}>
        <div style={{ font: `600 24px/1 ${FONT_M}`, letterSpacing: '.16em', color: '#8794a8' }}>{story.savedLabel}</div>
        <div style={{ marginTop: 26, font: `700 150px/1 ${FONT_D}`, letterSpacing: '-.055em', fontVariantNumeric: 'tabular-nums', color: savedC, textShadow: `0 0 70px ${savedGlow}` }}>
          {sm}<span style={{ fontSize: '.5em', opacity: 0.6 }}>{sd}</span>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 80, top: 520, width: 920, height: 680, borderRadius: 44, background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.09), inset 0 2px 0 rgba(255,255,255,.1)', opacity: panelO, transform: `translateX(${shake}px) scale(${panelS})` }} />

      {story.days && <WeekBars T={T} Tr={Tr} G={G} o={panelO} story={story} sym={sym} />}

      {/* Kept mounted at opacity 0 for the bar stories rather than unmounted:
          the chart owns the SVG gradient and clip ids the card's mini chart
          also references. */}
      <div style={{ position: 'absolute', left: CX, top: CY, width: CW, height: CH, opacity: story.days ? 0 : panelO, transform: `translateX(${shake}px)` }}>
        <PriceChart id="pc" story={story} P={P} A={A} w={CW} h={CH} xMax={xMax} lo={lo} hi={HI} drawP={drawP} afterP={afterP} />
      </div>

      {/* The week's stamp sits at the top-left of the panel: there is no line
          end to hang it off, and the bars occupy the middle. */}
      {story.days && (
        <div style={{ position: 'absolute', left: 140, top: 630, transform: `scale(${stampS})`, transformOrigin: '0 50%', opacity: stampO * panelO }}>
          <div style={{ boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderRadius: 18, background: '#00c49d', color: '#02241d', font: `800 28px/1 ${FONT_B}`, whiteSpace: 'nowrap', boxShadow: '0 16px 40px -10px rgba(0,212,170,.7)' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d={shieldPath} /><path d="M9 12l2.2 2.2L15.5 10" />
            </svg>
            {story.stamp}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', left: Xc(XN), top: WIN ? Yc(P[XN]) + 34 : Yc(P[XN]) - 34, transform: `translate(-86%,${WIN ? '0' : '-100%'}) scale(${stampS})`, transformOrigin: WIN ? '86% 0' : '86% 100%', opacity: story.days ? 0 : stampO * panelO }}>
        <div style={{ boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderRadius: 18, background: '#00c49d', color: '#02241d', font: `800 28px/1 ${FONT_B}`, whiteSpace: 'nowrap', boxShadow: '0 16px 40px -10px rgba(0,212,170,.7)' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={shieldPath} /><path d="M9 12l2.2 2.2L15.5 10" />
          </svg>
          {story.stamp}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 130, top: 1150, opacity: story.days ? 0 : tw(0, 1, G + 2.6, G + 3, M.enter)(T) * panelO, font: `600 26px/1.3 ${FONT_B}`, color: '#a3b0c2' }}>
        {story.heldPre}<b style={{ color: '#ff7a70' }}>{story.held}</b>
      </div>

      {railBlocks.map((r, i) => {
        const l = launches[i];
        const p = tw(0, 1, l, l + 0.55, M.pop)(T);
        const toRail = tw(0, 1, Tr - 0.25, Tr + 0.6)(T);
        const [rx, ry] = rail(i);
        const [x1, y1] = grid[i];
        const x0 = 340;
        const y0 = 1150;
        const x = toRail > 0 ? x1 + (rx - x1) * toRail : x0 + (x1 - x0) * p;
        const y = toRail > 0 ? y1 + (ry - y1) * toRail : y0 + (y1 - y0) * p;
        const s = toRail > 0 ? 1 + (0.54 - 1) * toRail : 0.3 + 0.7 * p;
        // Only the rule that fires lights up. Lighting them all would say the
        // guard did everything, when one specific rule did one specific thing.
        const lit = i === story.lit ? lossLit : 0;
        return (
          <RuleBlock key={r.k} r={r} x={x} y={y} s={s} o={Math.min(1, p * 2) * tw(1, 0, C, C + 0.45, M.enter)(T)} lit={lit} />
        );
      })}

      <div style={{ boxSizing: 'border-box', position: 'absolute', left: '50%', top: 935, transform: `translateX(-50%) scale(${tw(0, 1, S + 2.65, S + 3.0, M.pop)(T)})`, opacity: tw(1, 0, Tr - 0.3, Tr + 0.2, M.enter)(T), display: 'flex', alignItems: 'center', gap: 14, padding: '16px 28px', borderRadius: 999, background: 'rgba(240,180,41,.16)', boxShadow: 'inset 0 0 0 2px rgba(240,180,41,.5)', color: '#fbc94f', font: `800 30px/1 ${FONT_B}`, whiteSpace: 'nowrap' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 11V8a5 5 0 0110 0v3" /><path d="M5 11h14v9H5z" />
        </svg>
        Locked for 7 days
      </div>

      <div style={{ position: 'absolute', left: 108, top: 250, width: 432, height: 540, transform: `translateY(${(1 - cardP) * 260}px) scale(${2 * (0.9 + 0.1 * cardP)}) rotate(${(1 - cardP) * -4}deg)`, transformOrigin: '0 0', opacity: cardO }}>
        <SavedCard story={story} P={P} A={A} HI={HI} LO1={LO1} handle={handle} referral={referral} rules={rules} sheen={sheen} sym={sym} venue={venue} />
      </div>

      <div style={{ position: 'absolute', left: 80, right: 80, top: 1410, textAlign: 'center', opacity: tagO }}>
        <div style={{ font: `700 64px/1.1 ${FONT_D}`, letterSpacing: '-.035em' }}>Your rules. <span style={{ color: '#2fe3bd' }}>Enforced.</span></div>
        <div style={{ marginTop: 18, font: `600 30px/1 ${FONT_M}`, color: '#a3b0c2' }}>tradeguardx.com</div>
      </div>

      <Guardy x={gx} y={gyBase + bounce} s={gs} mood={mood} arms={arms} sweat={sweat} blink={blink} look={{ x: lookX, y: lookY }} wave={wave} color={body} />

      <div style={{ position: 'absolute', inset: 0, background: WIN ? '#00d4aa' : '#ef4444', opacity: flash * (WIN ? 0.16 : 0.22), pointerEvents: 'none' }} />

      {captions && <Captions T={T} items={story.caps} />}

      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: black, pointerEvents: 'none' }} />
    </div>
  );
}

function RuleBlock({ r, x, y, s, o, lit }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 400, height: 150, transform: `scale(${s})`, transformOrigin: '0 0', opacity: o }}>
      <div style={{ boxSizing: 'border-box', width: '100%', height: '100%', borderRadius: 26, padding: '24px 28px', background: `rgba(255,255,255,${0.06 + lit * 0.08})`, boxShadow: `inset 0 0 0 2px ${lit > 0.05 ? r.c : 'rgba(255,255,255,.12)'}, 0 0 ${40 * lit}px ${r.c}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: r.c }} />
          <span style={{ font: `600 22px/1 ${FONT_M}`, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a3b0c2' }}>{r.k}</span>
        </div>
        <div style={{ font: `700 58px/1 ${FONT_D}`, letterSpacing: '-.03em', color: '#f6f9fc' }}>{r.v}</div>
      </div>
    </div>
  );
}

/**
 * One caption at a time, crossfading.
 *
 * Each stays until the next begins, so there is never a silent frame in the
 * middle of the reel — the captions carry the story for the (many) viewers
 * watching with the sound off, which on Instagram and WhatsApp is most of them.
 */
const CAP_AT = [S + 0.5, S + 2.6, Tr + 0.6, Tr + 3.4, G + 0.15, G + 1.6];
const CAP_UNTIL = [null, null, null, null, null, C];
const FADE = 0.25;

function Captions({ T, items }) {
  return (
    <div style={{ position: 'absolute', left: '7%', right: '7%', bottom: '3.2%', textAlign: 'center', pointerEvents: 'none' }}>
      {items.map((text, i) => {
        const start = CAP_AT[i];
        const end = CAP_UNTIL[i] ?? (i + 1 < CAP_AT.length ? CAP_AT[i + 1] : END);
        const o = tw(0, 1, start, start + FADE, M.enter)(T) * tw(1, 0, end, end + FADE, M.enter)(T);
        if (o <= 0.001) return null;
        return (
          <div key={text} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, opacity: o, font: `700 40px/1.25 ${FONT_B}`, color: '#f6f9fc' }}>
            {text}
          </div>
        );
      })}
    </div>
  );
}
