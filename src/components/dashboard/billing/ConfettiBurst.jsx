import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A burst of paper confetti from a point on screen — the moment an offer goes
 * on should feel like getting something (owner, 12 Nov 2026: "like on a
 * birthday when the cake is cut").
 *
 * Pure decoration: fixed to the viewport so it can fly past the panel's edges,
 * no pointer events, and gone after LIFE_MS. Each piece gets its own
 * direction, spin and size through CSS variables; the motion is in index.css
 * (.bs-confetti), which also turns it off for reduced motion.
 */

const COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#A855F7', '#EC4899', '#FACC15', '#22D3EE'];
const COUNT = 64;
const LIFE_MS = 2600;

function makePieces() {
  return Array.from({ length: COUNT }, (_, i) => {
    // Mostly upward, fanned out to both sides.
    const angle = ((-90 + (Math.random() * 150 - 75)) * Math.PI) / 180;
    const speed = 140 + Math.random() * 240;
    return {
      dx: Math.round(Math.cos(angle) * speed),
      dy: Math.round(Math.sin(angle) * speed),
      fall: 260 + Math.round(Math.random() * 220),
      spin: Math.round(Math.random() * 900 - 450),
      flip: Math.round(360 + Math.random() * 720),
      color: COLORS[i % COLORS.length],
      w: 5 + Math.round(Math.random() * 5),
      h: 7 + Math.round(Math.random() * 9),
      round: i % 4 === 0,
      delay: Math.round(Math.random() * 90),
      dur: 1500 + Math.round(Math.random() * 900),
    };
  });
}

/** `at` = { x, y } in viewport pixels; `onDone` fires once the burst is over. */
export default function ConfettiBurst({ at, onDone }) {
  const [pieces] = useState(makePieces);
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), LIFE_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div aria-hidden className="bs-confetti" style={{ left: at.x, top: at.y }}>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--fall': `${p.fall}px`,
            '--spin': `${p.spin}deg`,
            '--flip': `${p.flip}deg`,
            width: p.w,
            height: p.round ? p.w : p.h,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.dur}ms`,
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
