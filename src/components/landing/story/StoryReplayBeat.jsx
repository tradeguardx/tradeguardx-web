import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { StorySection } from './StorySection';

export default function StoryReplayBeat() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  return (
    <StorySection id="story-replay" className="relative py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Replay</p>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Relive every mistake. Fix it.</h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0c10] shadow-2xl"
        >
          <img
            src="/replay.png"
            alt="Trade replay with entry and exit"
            className="w-full object-cover object-top"
          />
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute left-4 top-1/4 max-w-[140px] rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md sm:left-8 sm:max-w-[180px] sm:text-xs"
          >
            Entry
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="absolute bottom-1/4 right-4 max-w-[140px] rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-300 backdrop-blur-md sm:right-8 sm:max-w-[180px] sm:text-xs"
          >
            Exit
          </motion.div>
        </motion.div>
      </div>
    </StorySection>
  );
}
