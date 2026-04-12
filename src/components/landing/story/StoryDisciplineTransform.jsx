import { useRef, useEffect, useState } from 'react';
import { motion, useInView, animate, useReducedMotion } from 'framer-motion';
import { StorySection } from './StorySection';

export default function StoryDisciplineTransform() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduce = useReducedMotion();
  const [score, setScore] = useState(38);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setScore(84);
      return undefined;
    }
    const c = animate(38, 84, {
      duration: 2.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setScore,
    });
    return () => c.stop();
  }, [inView, reduce]);

  return (
    <StorySection id="story-discipline" className="relative py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-4xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Discipline score</p>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">From reactive to in control</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            className="rounded-2xl border border-red-500/20 bg-red-950/20 p-8 text-center"
          >
            <p className="text-4xl" role="img" aria-label="">
              😤
            </p>
            <p className="mt-4 font-display text-xl font-bold text-red-200">Emotional trader</p>
            <p className="mt-2 text-sm text-slate-500">Rules slip when pressure hits.</p>
            <p className="mt-6 font-mono text-5xl font-black text-red-400/90">38</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            className="rounded-2xl border border-accent/25 bg-accent/5 p-8 text-center"
          >
            <p className="text-4xl" role="img" aria-label="">
              😎
            </p>
            <p className="mt-4 font-display text-xl font-bold text-accent">Controlled trader</p>
            <p className="mt-2 text-sm text-slate-500">Enforcement + clarity — score climbs.</p>
            <p className="mt-6 font-mono text-5xl font-black text-accent tabular-nums">{Math.round(score)}</p>
          </motion.div>
        </div>
      </div>
    </StorySection>
  );
}
