import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedChartBackground from './AnimatedChartBackground';

export default function StoryHero() {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [pnl, setPnl] = useState(1247.32);

  const onMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPnl((v) => {
        const n = v + (Math.random() - 0.48) * 4.2;
        return Math.round(n * 100) / 100;
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden pt-24 pb-20"
      onMouseMove={onMove}
    >
      <AnimatedChartBackground />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(50vmax at ${mouse.x}% ${mouse.y}%, rgba(0, 212, 170, 0.09) 0%, transparent 55%)`,
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-[0.12]" aria-hidden />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex flex-wrap items-center justify-center gap-3"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-slate-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Monitoring your trade
          </span>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            Live P&amp;L{' '}
            <motion.span
              key={pnl}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              className="text-accent"
            >
              ${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="font-display text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
        >
          <span className="gradient-text">Trade Smarter.</span>
          <br />
          <span className="gradient-text-accent">Stay Protected.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto mt-6 max-w-xl text-lg text-slate-400 md:text-xl"
        >
          Rules that actually run while you trade — on your screen, in real time. Your last line of defense before the account blows.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-lg font-semibold text-[#0a0c10] shadow-lg shadow-accent/25 transition hover:bg-accent/90"
          >
            Start free
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            to={{ pathname: '/', hash: 'protection-demo' }}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.03] px-8 py-4 text-lg font-medium text-slate-200 backdrop-blur-sm transition hover:border-accent/25 hover:bg-white/[0.06]"
          >
            Watch live demo
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
