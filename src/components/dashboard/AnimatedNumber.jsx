import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Counts from the previous value to the next one instead of snapping.
 *
 * On a live P&L figure this does real work: the eye catches the movement and
 * knows something changed, where a hard swap between two numbers is easy to
 * miss entirely. Kept short (~600ms) so it reads as a tick, not a slot machine
 * — this is money on screen, and a long roll makes it feel unserious.
 *
 * Snaps instantly for anyone with prefers-reduced-motion, and for the very
 * first paint, where an animation from zero would be a lie about the data.
 */
export default function AnimatedNumber({ value, format = (v) => v.toFixed(2), className, style, duration = 600 }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);
  const firstRef = useRef(true);

  useEffect(() => {
    const target = Number(value);
    if (!Number.isFinite(target)) return undefined;

    // First paint or reduced motion → no roll.
    if (firstRef.current || reduce) {
      firstRef.current = false;
      fromRef.current = target;
      setDisplay(target);
      return undefined;
    }

    const from = Number(fromRef.current) || 0;
    if (from === target) return undefined;

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutCubic — fast off the mark, settles gently on the final digits.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, reduce, duration]);

  return (
    <span className={className} style={style}>
      {format(Number(display))}
    </span>
  );
}
