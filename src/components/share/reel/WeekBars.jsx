import { Fragment } from 'react';
import { M, money, tw } from '../../../lib/reelMotion';
import { FONT_B, FONT_D, FONT_M, dayT0, dayVal } from '../../../lib/reelStories';

/**
 * The week story's bar race, in place of the price chart.
 *
 * Ported from reference/07_share-reel.reference.jsx. Five bars land one a
 * second; the two red ones plunge and then snap back to the limit line, with a
 * gold shield coin landing where they were stopped. At the reveal the chart
 * zooms out and the ghost bars — where those days were actually heading —
 * unfold underneath in dashed red.
 *
 * That is the whole argument of the week story, made per day rather than
 * once: it is not that the week was green, it is that two specific days were
 * going to be catastrophic and were not allowed to be.
 *
 * A pure function of T, like every other layer in the reel. `story` is passed
 * rather than read from a module-level variable as the reference does — the
 * reference mutates a global `ST` on every story change, which would make two
 * reels on one page fight over which story they are both rendering.
 */
// The tallest bar is drawn this many pixels from the baseline. Both scales
// are derived so that whatever is tallest at that moment lands exactly here.
const REACH = 220;

export default function WeekBars({ T, Tr, G, o, story, sym = '$' }) {
  const days = story.days;

  /*
   * The scale is derived, not fixed.
   *
   * The reference hard-codes 220/887.4 then 0.115, which are that demo's own
   * figures: 887.4 was its biggest day and 1913.4 its deepest ghost. On a real
   * week those constants are meaningless — a trader whose best day is ₹61,000
   * gets a bar seventy times the height of the stage, which is exactly what it
   * drew. Deriving from the data reproduces the reference's numbers on the
   * reference's data and stays on the stage for everyone else.
   */
  const peakBar = Math.max(...days.map((d) => Math.abs(d.v)), 1);
  const peakAll = Math.max(...days.map((d) => Math.max(Math.abs(d.v), Math.abs(d.ghost ?? 0))), 1);

  // Baseline, and the zoom-out at the reveal that brings the ghosts into frame.
  const Yz = 860;
  const sc = tw(REACH / peakBar, REACH / peakAll, G + 0.7, G + 1.7)(T);

  // The limit line is the user's own daily loss rule. Without one there is no
  // line to draw and nothing for the shield coins to land on.
  const limit = Math.abs(story.limitAbs ?? 0) || null;
  const yl = limit ? Yz + limit * sc : null;

  const ghostP = tw(0, 1, G + 0.9, G + 1.9)(T);
  const ghostO = tw(0, 1, G + 1.6, G + 2.1, M.enter)(T);

  // A day counts towards the chips once its bar has settled, not when it
  // starts — otherwise the red days are counted as wins for 0.45s while they
  // are still falling.
  const shown = days.map((d, i) => T >= dayT0(Tr, i) + 0.3);
  const nUp = days.filter((d, i) => shown[i] && d.v >= 0).length;
  const nDn = days.filter((d, i) => shown[i] && d.v < 0).length;
  const nG = days.filter((d, i) => d.ghost != null && T >= dayT0(Tr, i) + 0.45).length;

  const chip = (bg, ring, c, icon, n, label) => (
    <div style={{ boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px 10px 12px', borderRadius: 999, background: bg, boxShadow: `inset 0 0 0 2px ${ring}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 15, background: c, display: 'grid', placeItems: 'center' }}>{icon}</div>
      <span style={{ font: `700 30px/1 ${FONT_D}`, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>{n}</span>
      <span style={{ font: `600 22px/1 ${FONT_B}`, color: '#c9d2e0' }}>{label}</span>
    </div>
  );

  const shieldPath = 'M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z';
  // The reference prints the day figures without decimals; money() always
  // carries them.
  const whole = (v) => money(v, sym).replace(/\.\d+$/, '');

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', left: 130, top: 548, display: 'flex', gap: 14 }}>
        {chip('rgba(0,212,170,.12)', 'rgba(0,212,170,.4)', '#00c49d', <svg width="16" height="16" viewBox="0 0 24 24" fill="#02241d"><path d="M12 5l8 12H4z" /></svg>, nUp, 'green')}
        {chip('rgba(239,68,68,.12)', 'rgba(239,68,68,.4)', '#ef4444', <svg width="16" height="16" viewBox="0 0 24 24" fill="#2a0806"><path d="M12 19L4 7h16z" /></svg>, nDn, 'red')}
        {chip('rgba(240,180,41,.12)', 'rgba(240,180,41,.45)', '#f0b429', <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2a1a00" strokeWidth="2.6" strokeLinejoin="round"><path d={shieldPath} /></svg>, nG, 'guarded')}
      </div>

      <div style={{ position: 'absolute', left: 130, width: 820, top: Yz - 1, height: 2, background: 'rgba(255,255,255,.3)' }} />
      {yl != null && (
        <>
          <div style={{ position: 'absolute', left: 130, width: 820, top: yl - 1, height: 0, borderTop: '3px dashed rgba(240,180,41,.75)' }} />
          <div style={{ position: 'absolute', right: 130, textAlign: 'right', top: yl + 8, font: `700 20px/1 ${FONT_M}`, letterSpacing: '.08em', color: '#fbc94f', opacity: 1 - ghostO }}>
            {story.limitLabel || `\u2212${sym}${limit.toLocaleString('en-US')} DAILY LIMIT`}
          </div>
        </>
      )}

      {days.map((d, i) => {
        const t0 = dayT0(Tr, i);
        const v = dayVal(d, i, T, Tr);
        const up = d.v >= 0;
        const h = Math.abs(v) * sc;
        const cx = 130 + i * 164 + 82;
        const top = v >= 0 ? Yz - h : Yz;
        const vis = T >= t0 ? 1 : 0;
        const slam = d.ghost != null ? tw(0, 1, t0 + 0.42, t0 + 0.7, M.pop)(T) : 0;
        const gv = d.ghost != null ? d.v + (d.ghost - d.v) * ghostP : 0;
        const gh = Math.abs(gv) * sc;
        const lblO = tw(0, 1, t0 + 0.35, t0 + 0.7, M.enter)(T);
        const hasGhost = d.ghost != null;
        // The day currently landing glows harder than the ones behind it.
        const now = T >= t0 && T < t0 + 1.05 && T < G;

        return (
          <Fragment key={d.d}>
            {d.ghost != null && ghostP > 0 && (
              /* A daily-target lock on a GREEN day has a ghost that is still
                 positive — the day would have given some back, not gone red.
                 Drawing every ghost downward from the baseline would show that
                 day as a loss it never had. */
              <div style={{ boxSizing: 'border-box', position: 'absolute', left: cx - 50, top: gv >= 0 ? Yz - gh : Yz, width: 100, height: gh, borderRadius: gv >= 0 ? '16px 16px 4px 4px' : '4px 4px 16px 16px', border: `3px dashed ${gv >= 0 ? 'rgba(95,242,210,.5)' : 'rgba(255,122,112,.65)'}`, background: gv >= 0 ? 'rgba(0,212,170,.06)' : 'rgba(239,68,68,.07)' }} />
            )}
            {d.ghost != null && (
              <div style={{ position: 'absolute', left: cx, top: d.ghost >= 0 ? Yz - Math.abs(d.ghost) * sc - 64 : Yz + Math.abs(d.ghost) * sc + 10, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap', opacity: ghostO }}>
                <div style={{ font: `700 22px/1 ${FONT_D}`, color: d.ghost >= 0 ? '#2fe3bd' : '#ff7a70' }}>{whole(d.ghost)}</div>
                <div style={{ marginTop: 4, font: `600 15px/1 ${FONT_M}`, letterSpacing: '.1em', color: '#8794a8' }}>NO GUARD</div>
              </div>
            )}

            <div style={{ position: 'absolute', left: cx - 50, top, width: 100, height: h, opacity: vis, borderRadius: up ? '16px 16px 4px 4px' : '4px 4px 16px 16px', background: up ? 'linear-gradient(180deg,#5ff2d2,#00a98a)' : 'linear-gradient(0deg,#ff8a80,#d63a2f)', boxShadow: `0 0 ${now ? 46 : 22}px -6px ${up ? 'rgba(0,212,170,.8)' : 'rgba(239,68,68,.8)'}` }} />

            {d.ghost != null && slam > 0 && (
              <div style={{ position: 'absolute', left: cx, top: yl ?? (v >= 0 ? top : top + h), transform: `translate(-50%,-50%) scale(${slam})`, width: 50, height: 50, borderRadius: 25, background: '#f0b429', display: 'grid', placeItems: 'center', boxShadow: '0 0 30px rgba(240,180,41,.8)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2a1a00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d={shieldPath} /><path d="M9 12l2.2 2.2L15.5 10" />
                </svg>
              </div>
            )}

            <div style={{ position: 'absolute', left: cx, top: up ? top - 40 : (d.ghost && yl != null ? yl + 34 : top + h + 12), transform: 'translateX(-50%)', whiteSpace: 'nowrap', opacity: lblO * (hasGhost ? 1 - ghostO : 1), font: `700 26px/1 ${FONT_D}`, fontVariantNumeric: 'tabular-nums', color: up ? '#2fe3bd' : '#ff7a70' }}>
              {whole(d.v)}
            </div>
            <div style={{ position: 'absolute', left: cx, top: 1142, transform: 'translateX(-50%)', font: `700 22px/1 ${FONT_M}`, letterSpacing: '.14em', color: vis ? (up ? '#2fe3bd' : '#ff7a70') : '#5b687d' }}>
              {d.d}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
