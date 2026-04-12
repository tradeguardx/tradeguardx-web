import { useRef, useEffect, useState } from 'react';
import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion';
import { StorySection } from './StorySection';

const slides = [
  {
    id: 'pair',
    title: 'Pair the extension',
    caption: 'One code links your browser to your account.',
    img: '/pair.png',
    alt: 'Extension pairing',
  },
  {
    id: 'rules',
    title: 'Set your rules',
    caption: 'Loss limits, drawdown, hedging — per account.',
    img: '/rule.png',
    alt: 'Rules dashboard',
  },
  {
    id: 'replay',
    title: 'Replay every trade',
    caption: 'Entry to exit on the chart — no guessing.',
    img: '/replay.png',
    alt: 'Trade replay',
  },
  {
    id: 'timeline',
    title: 'Full timeline',
    caption: 'Every SL move and event, timestamped.',
    img: '/timeline.png',
    alt: 'Event timeline',
  },
];

export default function StoryProductWalkthrough() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5200);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const slide = slides[index];

  return (
    <StorySection id="story-walkthrough" className="relative py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Real-time engine</p>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">From pairing to proof</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-400">
            The same flow you&apos;ll use after signup — shown here as a live walkthrough.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0c10] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <p className="flex-1 truncate text-center font-mono text-[11px] text-slate-500 sm:text-xs">
              tradeguardx.com · {slide.title}
            </p>
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
              Live UI
            </span>
          </div>

          <div className="relative aspect-[16/10] max-h-[70vh] bg-[#07080c] sm:aspect-[16/9]">
            <AnimatePresence mode="wait">
              <motion.img
                key={slide.id}
                src={slide.img}
                alt={slide.alt}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full object-contain object-top p-3 sm:p-4"
              />
            </AnimatePresence>
          </div>

          <div className="border-t border-white/[0.06] px-4 py-4 sm:px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                <p className="font-display text-lg font-semibold text-white">{slide.title}</p>
                <p className="mt-1 text-sm text-slate-400">{slide.caption}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex justify-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? 'w-8 bg-accent' : 'w-2 bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to ${s.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </StorySection>
  );
}
