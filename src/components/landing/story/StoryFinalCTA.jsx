import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const floatingRules = [
  { label: 'Daily loss -5%', color: 'text-accent border-accent/20 bg-accent/5', delay: 0 },
  { label: 'No hedging', color: 'text-red-400 border-red-500/20 bg-red-500/5', delay: 0.4 },
  { label: 'Risk ≤ 1%', color: 'text-blue-400 border-blue-500/20 bg-blue-500/5', delay: 0.8 },
  { label: 'Max 5 trades', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5', delay: 0.2 },
  { label: 'SL required', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5', delay: 0.6 },
  { label: 'Drawdown lock', color: 'text-purple-400 border-purple-500/20 bg-purple-500/5', delay: 1.0 },
];

const features = [
  'Works on any browser-based broker',
  '9 configurable protection rules',
  'Escalating warnings → blocks',
  'Trade journal with AI insights',
  'Free plan — no card needed',
];

export default function StoryFinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface-950 via-[#08101a] to-surface-950" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/8 blur-[120px]" />

      {/* Floating rule badges */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {floatingRules.map((r, i) => (
          <motion.span
            key={r.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: r.delay, duration: 0.6 }}
            style={{
              left: `${8 + i * 15}%`,
              top: `${12 + (i % 3) * 28}%`,
              animationDelay: `${r.delay}s`,
            }}
            className={`absolute hidden animate-float rounded-lg border px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm xl:inline-flex ${r.color}`}
          >
            {r.label}
          </motion.span>
        ))}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-400 backdrop-blur-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Used by traders who are serious about protection
        </span>

        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
          Your rules mean nothing
          <br />
          <span className="gradient-text-accent">unless they&apos;re enforced.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
          TradeGuardX runs where you trade. Set up once — protected every session, automatically.
        </p>

        {/* Feature checklist */}
        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mt-8 inline-flex flex-col items-start gap-2.5 text-left"
        >
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15">
                <svg className="h-2.5 w-2.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </motion.ul>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-10 py-4 text-lg font-semibold text-[#0a0c10] shadow-xl shadow-accent/25 transition hover:bg-accent/90 active:scale-95"
          >
            Start free
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            to="/pricing"
            className="text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-300 hover:underline"
          >
            View plans →
          </Link>
        </div>

        <p className="mt-5 text-xs text-slate-700">
          Free plan available · No credit card required
        </p>
      </motion.div>
    </section>
  );
}
