import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedChartBackground from './AnimatedChartBackground';

export default function StoryHero() {
  const [mouse, setMouse] = useState({ x: 60, y: 40 });

  const onMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <section
      className="relative overflow-hidden pt-20 pb-24 lg:pt-28"
      onMouseMove={onMove}
    >
      <AnimatedChartBackground />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(50vmax at ${mouse.x}% ${mouse.y}%, rgba(45,234,168,0.08) 0%, transparent 55%)`,
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        {/* ---------- left: copy ---------- */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-gradient-to-r from-orange-500/15 via-white/[0.05] to-emerald-500/15 px-4 py-2 text-sm font-semibold text-slate-100 backdrop-blur-md"
          >
            <img src="/flag-in.svg" alt="India" className="h-3.5 w-auto rounded-[2px]" />
            Made in India · The kill switch for crypto traders
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[5.2rem]"
          >
            <span className="gradient-text">Set your limit.</span>
            <br />
            <span className="gradient-text-accent">We make it unbreakable.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 lg:mx-0"
          >
            Stop blowing up your Delta account. Set your daily loss, risk per trade, and
            max-trade caps once —{' '}
            <strong className="font-medium text-slate-200">
              we cancel your orders, close your positions, and lock the account
            </strong>{' '}
            the moment you cross a limit. Works even when your screen is off.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start"
          >
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-semibold text-[#04231a] shadow-lg shadow-accent/25 transition hover:bg-accent/90 active:scale-95"
            >
              Start free
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-4 text-base font-medium text-slate-200 backdrop-blur-sm transition hover:border-accent/25 hover:bg-white/[0.06]"
            >
              See how it works
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" /></svg>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[13px] text-slate-500 lg:justify-start"
          >
            <span>✦ No credit card</span>
            <span className="text-slate-700">·</span>
            <span>✦ Setup in 60s</span>
            <span className="text-slate-700">·</span>
            <span className="text-accent">Founding 50 · limited spots</span>
          </motion.div>
        </div>

        {/* ---------- right: live dashboard device ---------- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          {/* device card */}
          <div className="relative rounded-2xl border border-white/[0.1] bg-gradient-to-b from-surface-900 to-surface-950 p-5 shadow-2xl shadow-black/60">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-accent/20 to-transparent to-30% [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-px" />

            {/* head */}
            <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3.5">
              <div className="flex items-center gap-2.5 font-mono text-[13px]">
                <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                  Delta
                </span>
                <span className="text-slate-200">BTCUSD</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">Perp</span>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Live
              </span>
            </div>

            {/* P&L cells */}
            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-surface-950/60 p-3.5">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Today&apos;s P&amp;L
                </div>
                <motion.div
                  className="font-mono text-[22px] font-medium tabular-nums text-rose-400"
                  animate={{ opacity: [1, 0.55, 1] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                >
                  -₹3,240
                </motion.div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">Cap: -₹5,000</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-surface-950/60 p-3.5">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Trades
                </div>
                <div className="font-mono text-[22px] font-medium tabular-nums text-slate-200">
                  4 <span className="text-slate-600">/ 6</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">2 remaining</div>
              </div>
            </div>

            {/* rule bar */}
            <div className="mb-3.5 rounded-xl border border-white/[0.06] bg-surface-950/60 p-3.5">
              <div className="mb-2.5 flex justify-between font-mono text-[11px] uppercase tracking-wider text-slate-500">
                <span>Daily Loss Limit</span>
                <span className="text-rose-400">65% used</span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-rose-500"
                  initial={{ width: '0%' }}
                  whileInView={{ width: '65%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 2.6, ease: 'linear' }}
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[11px]">
                <span className="text-rose-400">-₹3,240 used</span>
                <span className="text-slate-400">₹1,760 remaining</span>
              </div>
            </div>

            {/* trade-blocked alert — slides in from the right */}
            <motion.div
              initial={{ opacity: 0, x: 28, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-gradient-to-b from-rose-500/[0.08] to-rose-500/[0.02] p-3.5"
            >
              <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-rose-500/12 text-rose-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </span>
              <div className="text-[13px] leading-snug">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-rose-400">
                  Trade blocked
                </span>
                <span className="text-slate-200">
                  Entry attempt on <b className="font-semibold">BTCUSD</b> rejected — daily loss cap proximity. Cooldown 2h.
                </span>
                <span className="mt-1.5 block font-mono text-[11px] text-slate-500">14:23:08 IST · auto-enforced</span>
              </div>
            </motion.div>
          </div>

          {/* floating mini cards */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            className="absolute -left-6 -top-4 hidden items-center gap-2 rounded-xl border border-white/[0.1] bg-surface-900 px-3.5 py-2.5 font-mono text-[11px] shadow-xl shadow-black/50 sm:flex"
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-accent/12 text-accent">✓</span>
            Order cancelled
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 2 }}
            className="absolute -bottom-4 -right-5 hidden items-center gap-2 rounded-xl border border-white/[0.1] bg-surface-900 px-3.5 py-2.5 font-mono text-[11px] shadow-xl shadow-black/50 sm:flex"
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-amber-400/12 text-amber-400">⏳</span>
            Cooldown · 2h
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
