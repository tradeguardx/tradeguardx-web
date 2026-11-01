import { useEffect, useRef } from 'react';
import './diwaliSky.css';

/*
 * Rockets: x position, how high they climb (px), loop length and offset.
 * Staggered so at most one or two are bursting at once. The two at the
 * edges burst clear of the centred phone layout; the middle two (desktop
 * only) burst in the gap between the headline and the code.
 */
const ROCKETS = [
  { x: '4%', rise: 50, dur: 4.8, delay: 0.2, r: 40, wide: false },
  { x: '43%', rise: 58, dur: 5.6, delay: 1.5, r: 46, wide: true },
  { x: '53%', rise: 44, dur: 5.2, delay: 3.4, r: 38, wide: true },
  { x: '96%', rise: 48, dur: 5.0, delay: 2.4, r: 36, wide: false },
];
const SPARK_COLORS = ['#fcd34d', '#f472b6', '#2dd4bf', '#fb923c', '#fde68a', '#c084fc'];
const SPARKS = Array.from({ length: 12 }, (_, i) => ({ a: i * 30, c: SPARK_COLORS[i % SPARK_COLORS.length] }));
const GLITTER = Array.from({ length: 6 }, (_, i) => ({ a: i * 60 + 30 }));

const TWINKLES = [
  { l: '12%', t: '30%', d: 2.4, delay: 0 },
  { l: '24%', t: '70%', d: 3.1, delay: 0.8 },
  { l: '37%', t: '22%', d: 2.7, delay: 1.6 },
  { l: '48%', t: '62%', d: 3.4, delay: 0.4 },
  { l: '63%', t: '28%', d: 2.5, delay: 1.2 },
  { l: '74%', t: '74%', d: 2.9, delay: 2.0 },
  { l: '86%', t: '38%', d: 3.2, delay: 0.6 },
  { l: '91%', t: '80%', d: 2.6, delay: 1.9 },
];

/**
 * The night sky behind a theme 'diwali' offer strip: lamplight glow, a
 * marigold toran, twinkling stars and rockets that burst into sparks. Pure
 * CSS animation (diwaliSky.css), under the text, paused when off-screen or
 * the tab is hidden.
 */
export default function DiwaliSky() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let onScreen = true;
    const sync = () => {
      if (onScreen && !document.hidden) el.removeAttribute('data-paused');
      else el.setAttribute('data-paused', '');
    };
    let io;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); });
      io.observe(el);
    }
    document.addEventListener('visibilitychange', sync);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return (
    <div ref={ref} className="dw-sky" aria-hidden data-diwali-sky>
      <div className="dw-toran" />
      {TWINKLES.map((t) => (
        <span key={`${t.l}${t.t}`} className="dw-twinkle" style={{ left: t.l, top: t.t, '--d': `${t.d}s`, '--delay': `${t.delay}s` }} />
      ))}
      {ROCKETS.map((r) => (
        <span
          key={r.x}
          className={`dw-rocket${r.wide ? ' dw-rocket-wide' : ''}`}
          style={{ '--x': r.x, '--rise': `${r.rise}px`, '--dur': `${r.dur}s`, '--delay': `${r.delay}s`, '--r': `${r.r}px` }}
        >
          <span className="dw-trail" />
          <span className="dw-burst">
            <span className="dw-flash" />
            {SPARKS.map((s) => (
              <span key={s.a} className="dw-spark" style={{ '--a': `${s.a}deg`, '--c': s.c }} />
            ))}
            {GLITTER.map((g) => (
              <span key={g.a} className="dw-glitter" style={{ '--a': `${g.a}deg` }} />
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}
