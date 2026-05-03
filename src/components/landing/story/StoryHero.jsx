import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedChartBackground from './AnimatedChartBackground';
import StoryRuleShield from './StoryRuleShield';
import { FoundingMemberPill } from '../../promo/FoundingMember';
import { CHROME_STORE_URL } from '../../../lib/extension';

export default function StoryHero() {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [pnl, setPnl] = useState(1247.32);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-24 pb-24"
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
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 tabular-nums">
            <span className="rounded-sm border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              Demo
            </span>
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
          className="font-display text-5xl font-bold tracking-tight sm:text-6xl md:text-6xl lg:text-7xl"
        >
          <span className="gradient-text">Pass your prop eval.</span>
          <br />
          <span className="gradient-text-accent">Don&apos;t fail it on a bad day.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 md:text-xl"
        >
          The browser extension that enforces your prop firm&apos;s rules in real time —
          daily loss, drawdown, hedging, lot size. We block the violation before it
          triggers a reset.
        </motion.p>

        {/* Capability pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          {[
            { label: 'Rule Engine', icon: '🛡️' },
            { label: 'AI Journal', icon: '🧠' },
            { label: 'Behavior Patterns', icon: '📊' },
            { label: 'Works in your browser', icon: '🌐' },
          ].map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              <span>{pill.icon}</span>
              {pill.label}
            </span>
          ))}
        </motion.div>

        {/* Founding-100 launch pill (hidden when env vars not set) */}
        <div className="mt-8 flex justify-center">
          <FoundingMemberPill />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24 }}
          className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-lg font-semibold text-[#0a0c10] shadow-lg shadow-accent/25 transition hover:bg-accent/90 active:scale-95"
          >
            Start free
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.03] px-8 py-4 text-lg font-medium text-slate-200 backdrop-blur-sm transition hover:border-accent/25 hover:bg-white/[0.06]"
          >
            See how it works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-6 flex items-center justify-center"
        >
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-accent"
          >
            <svg className="h-4 w-4" viewBox="0 0 48 48" fill="currentColor" aria-hidden>
              <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.84 0-16-7.16-16-16 0-2.5.58-4.86 1.6-6.97L17.62 31a8.005 8.005 0 0 0 7.43 5h.01l-3.6 6.94A15.96 15.96 0 0 1 24 40zm0-22c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm15.62 16.97L31.6 21h-.01a8.005 8.005 0 0 0-7.43-5h-.01l3.6-6.94c5.48 1.36 9.84 5.72 11.2 11.2.58 2.32.58 4.41-.33 6.71z"/>
            </svg>
            Already trade? Install the Chrome extension
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-5 text-xs text-slate-600"
        >
          Free plan available · No credit card required · Setup in &lt; 2 minutes
        </motion.p>
      </div>

      {/* Rule shield animation — rules → shield → trade. No heading,
          since the hero copy above already serves as the headline. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="relative z-10 mt-20 w-full px-6"
      >
        <StoryRuleShield />
      </motion.div>

      {/* Scroll chevron */}
      <AnimatePresence>
        {!scrolled && (
          <motion.a
            href="#how-it-works"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { delay: 1, duration: 0.5 }, y: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-600 transition hover:text-slate-400"
            aria-label="Scroll down"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.a>
        )}
      </AnimatePresence>
    </section>
  );
}
