import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { StorySection } from './StorySection';

export default function StoryMistake() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, amount: 0.35 });
  const reduce = useReducedMotion();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!inView || reduce) {
      if (!inView) setSeconds(0);
      return undefined;
    }
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s >= 20) return 20;
        return s + 1;
      });
    }, 350);
    return () => clearInterval(t);
  }, [inView, reduce]);

  const redIntensity = Math.min(seconds / 20, 1) * 0.55;

  return (
    <StorySection id="story-mistake" className="relative py-24 md:py-32">
      <div ref={ref} className="relative mx-auto max-w-4xl px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-red-400/90">The risk</p>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">One moment. No stop loss.</h2>
        </div>

        <motion.div
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0c10]"
          animate={{ boxShadow: `0 0 80px -20px rgba(239,68,68,${0.15 + redIntensity * 0.4})` }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 bg-red-600"
            style={{ opacity: redIntensity }}
            aria-hidden
          />

          <div className="relative border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-sm text-slate-400">XAU/USD · LONG</p>
                <p className="mt-1 text-xs text-slate-500">Entry filled · Stop loss: —</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg text-white tabular-nums">2,643.20</p>
                <p className="text-xs text-amber-400/90">Floating — no SL</p>
              </div>
            </div>
          </div>

          <div className="relative px-5 py-10 md:py-14">
            <p className="text-center font-display text-xl text-slate-200 md:text-2xl">
              You entered without a stop loss…
            </p>
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="font-mono text-4xl font-bold tabular-nums text-white md:text-5xl">
                {seconds}s
              </p>
              <p className="text-sm text-slate-500">Exposure ticking · every second counts</p>
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{ opacity: seconds >= 8 ? 1 : 0, y: seconds >= 8 ? 0 : 12 }}
            className="relative border-t border-red-500/30 bg-red-950/40 px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-200">Unprotected position</p>
                <p className="mt-1 text-sm text-red-200/70">
                  Downside is undefined. Most blow-ups start exactly here.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </StorySection>
  );
}
