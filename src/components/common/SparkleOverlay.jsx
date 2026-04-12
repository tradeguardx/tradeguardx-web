import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const CHARS = ['✦', '✧', '⋆'];

/**
 * Decorative sparkle field. Respects `prefers-reduced-motion`.
 */
export default function SparkleOverlay({ active = true, density = 16, className = '' }) {
  const reduceMotion = useReducedMotion();

  const items = useMemo(
    () =>
      Array.from({ length: density }, (_, i) => ({
        id: i,
        left: (Math.sin(i * 2.17) * 0.42 + 0.5) * 100,
        top: (Math.cos(i * 1.63) * 0.42 + 0.5) * 100,
        delay: (i * 0.11) % 1.8,
        char: CHARS[i % CHARS.length],
        duration: 2.1 + (i % 6) * 0.12,
      })),
    [density]
  );

  if (!active || reduceMotion) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      aria-hidden
    >
      {items.map((s) => (
        <motion.span
          key={s.id}
          className="absolute text-[11px] sm:text-xs text-accent drop-shadow-[0_0_8px_rgba(0,212,170,0.55)]"
          style={{ left: `${s.left}%`, top: `${s.top}%`, transform: 'translate(-50%, -50%)' }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{
            opacity: [0.15, 1, 0.35, 0.95, 0.2],
            scale: [0.5, 1.15, 0.85, 1.05, 0.65],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        >
          {s.char}
        </motion.span>
      ))}
    </div>
  );
}
