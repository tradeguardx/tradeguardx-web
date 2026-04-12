import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { StorySection } from './StorySection';

const rules = [
  { id: 'sl', label: 'Stop loss', state: 'bad', color: 'red' },
  { id: 'over', label: 'Overtrade guard', state: 'warn', color: 'amber' },
  { id: 'safe', label: 'Daily loss OK', state: 'ok', color: 'emerald' },
];

export default function StoryRuleEngineViz() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % 3), 1600);
    return () => clearInterval(id);
  }, [inView, reduce]);

  return (
    <StorySection id="story-rules" className="relative py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Rule engine</p>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Always watching</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-400">
            Signals stack in milliseconds — not after the damage is done.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {rules.map((r, i) => {
            const isOn = active === i;
            return (
              <motion.div
                key={r.id}
                animate={
                  isOn
                    ? {
                        scale: 1.02,
                        borderColor: 'rgba(0,212,170,0.28)',
                        boxShadow:
                          r.color === 'red'
                            ? '0 0 36px -6px rgba(239,68,68,0.45)'
                            : r.color === 'amber'
                              ? '0 0 32px -6px rgba(245,158,11,0.35)'
                              : '0 0 32px -6px rgba(52,211,153,0.35)',
                      }
                    : { scale: 1, borderColor: 'rgba(255,255,255,0.06)', boxShadow: 'none' }
                }
                transition={{ duration: 0.35 }}
                className="rounded-2xl border bg-white/[0.02] p-6 backdrop-blur-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{r.label}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      r.color === 'red'
                        ? 'bg-red-500'
                        : r.color === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                    } ${isOn ? 'animate-pulse' : 'opacity-40'}`}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {r.state === 'bad' && 'Violation path — blocked or warned.'}
                  {r.state === 'warn' && 'Caution band — throttle or alert.'}
                  {r.state === 'ok' && 'Within limits — green light.'}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </StorySection>
  );
}
