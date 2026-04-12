import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { StorySection } from './StorySection';

export default function StoryIntervention() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || reduce) {
      setStep(0);
      return undefined;
    }
    setStep(1);
    const a = setTimeout(() => setStep(2), 2000);
    const b = setTimeout(() => setStep(3), 4500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [inView, reduce]);

  return (
    <StorySection id="story-intervention" className="relative py-24 md:py-32">
      <div ref={ref} className="relative mx-auto max-w-4xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">The intervention</p>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">We don’t just track. We intervene.</h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-400">
            Warning → alert → enforcement. Your rules, escalating in real time.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-3 text-[11px] font-semibold uppercase tracking-wider">
          <span className={step >= 1 ? 'text-accent' : 'text-slate-600'}>~5s · Warning</span>
          <span className="text-slate-700">→</span>
          <span className={step >= 2 ? 'text-orange-300' : 'text-slate-600'}>~15s · Alert</span>
          <span className="text-slate-700">→</span>
          <span className={step >= 3 ? 'text-red-300' : 'text-slate-600'}>~30s · Block</span>
        </div>

        <div className="relative min-h-[320px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#08090d]">
          {/* Fake platform strip */}
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="font-mono text-xs text-slate-500">Broker UI · simulated</p>
          </div>

          {/* Toast */}
          <motion.div
            initial={false}
            animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 24 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-4 left-4 right-4 z-10 mx-auto max-w-md md:left-auto md:right-4 md:mx-0"
          >
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/70 px-4 py-3 shadow-xl backdrop-blur-md">
              <p className="text-xs font-bold text-amber-200">TradeGuardX</p>
              <p className="mt-0.5 text-xs text-amber-100/85">No stop detected — add SL or reduce size.</p>
            </div>
          </motion.div>

          {/* Center modal */}
          <motion.div
            initial={false}
            animate={{
              opacity: step >= 2 ? 1 : 0,
              scale: step >= 2 ? 1 : 0.94,
            }}
            transition={{ duration: 0.35 }}
            className={`absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] ${step >= 2 ? '' : 'pointer-events-none'}`}
          >
            <div className="max-w-sm rounded-2xl border border-orange-500/35 bg-[#120a06]/95 p-6 text-center shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Risk alert</p>
              <p className="mt-2 text-lg font-bold text-white">Exposure undefined</p>
              <p className="mt-2 text-sm text-slate-300">Position flagged — fix stop or we escalate.</p>
            </div>
          </motion.div>

          {/* Block overlay */}
          <motion.div
            initial={false}
            animate={{ opacity: step >= 3 ? 1 : 0 }}
            transition={{ duration: 0.45 }}
            className={`absolute inset-0 z-30 flex items-center justify-center bg-[#1a0505]/92 backdrop-blur-sm ${step >= 3 ? '' : 'pointer-events-none'}`}
          >
            <motion.div
              initial={false}
              animate={{ scale: step >= 3 ? 1 : 0.9 }}
              className="mx-4 max-w-sm rounded-2xl border border-red-500/45 bg-red-950/90 px-8 py-6 text-center shadow-[0_0_48px_-8px_rgba(239,68,68,0.5)]"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-300">Trade blocked</p>
              <p className="mt-2 text-xl font-black text-white">Rule enforced</p>
              <p className="mt-2 text-sm text-red-100/85">New risk frozen until stop loss is set.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </StorySection>
  );
}
