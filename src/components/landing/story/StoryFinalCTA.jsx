import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function StoryFinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface-950 via-[#0a1620] to-surface-950" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
          Your rules mean nothing
          <br />
          <span className="gradient-text-accent">unless they&apos;re enforced.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
          TradeGuardX runs where you trade. Set up once — stay protected every session.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-10 py-4 text-lg font-semibold text-[#0a0c10] shadow-xl shadow-accent/30 transition hover:bg-accent/90"
          >
            Start free
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            to="/pricing"
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
          >
            View plans
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
