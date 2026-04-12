import { motion } from 'framer-motion';
import { StorySection } from './StorySection';

/**
 * Full rule catalog aligned with `rule_templates` / Features.jsx — each row: rule + what it protects you from.
 */
const RULES = [
  {
    title: 'Daily loss protection',
    savesFrom: 'Bleeding past your daily loss limit in one session — the fastest way to fail a prop evaluation.',
    gradient: 'from-accent/15 to-emerald-500/10',
    border: 'border-white/[0.07]',
  },
  {
    title: 'Hedging prevention',
    savesFrom: 'Opposite-side trades on the same symbol that break no-hedge / netting rules.',
    gradient: 'from-red-500/12 to-orange-500/8',
    border: 'border-white/[0.07]',
  },
  {
    title: 'Risk per trade',
    savesFrom: 'A single huge position risking more of the account than your plan allows.',
    gradient: 'from-blue-500/12 to-cyan-500/8',
    border: 'border-white/[0.07]',
  },
  {
    title: 'Max drawdown lock',
    savesFrom: 'Total drawdown beyond your ceiling — the hard stop firms and personal plans use.',
    gradient: 'from-purple-500/12 to-pink-500/8',
    border: 'border-white/[0.07]',
  },
  {
    title: 'Stacking control',
    savesFrom: 'Too many open positions at once — stacked exposure on the same idea.',
    gradient: 'from-indigo-500/12 to-violet-500/8',
    border: 'border-white/[0.07]',
  },
  {
    title: 'Max trades per day',
    savesFrom: 'Revenge trading and overtrading after wins or losses when judgment is off.',
    gradient: 'from-orange-500/12 to-amber-500/8',
    border: 'border-white/[0.07]',
  },
  {
    title: 'Close after N losses',
    savesFrom: 'Trading straight through a loss streak before you reset — tilt protection.',
    gradient: 'from-rose-500/12 to-red-500/8',
    border: 'border-white/[0.07]',
  },
  {
    title: 'Stop loss protection',
    savesFrom: 'Running without a stop — undefined downside while the market moves against you.',
    gradient: 'from-cyan-500/12 to-teal-500/8',
    border: 'border-white/[0.07]',
  },
  {
    title: 'Minimum hold (anti–early close)',
    savesFrom: 'Impulsive full closes and scratch exits that churn fees and break your plan.',
    gradient: 'from-slate-500/15 to-slate-400/8',
    border: 'border-white/[0.07]',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function StoryRulesCatalog() {
  return (
    <StorySection id="features" className="relative scroll-mt-24 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">What you can enforce</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Nine protection rules. Nine ways we save your account.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Pick the rails that match your plan — TradeGuardX applies them <span className="text-slate-300">in the browser</span> while you trade.
          </p>
        </div>

        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.12 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {RULES.map((r) => (
            <motion.li
              key={r.title}
              variants={item}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative overflow-hidden rounded-2xl border ${r.border} bg-gradient-to-br ${r.gradient} p-5 backdrop-blur-sm transition hover:border-white/[0.12]`}
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.03] blur-2xl transition group-hover:bg-white/[0.05]" />
              <p className="relative font-display text-base font-bold text-white">{r.title}</p>
              <p className="relative mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Saves you from
              </p>
              <p className="relative mt-1.5 text-sm leading-relaxed text-slate-300">{r.savesFrom}</p>
            </motion.li>
          ))}
        </motion.ul>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mt-10 max-w-xl text-center text-xs text-slate-600"
        >
          Exact limits are yours to set per trading account. Free tier includes core protections; Pro unlocks advanced rules like risk per trade and journaling.
        </motion.p>
      </div>
    </StorySection>
  );
}
