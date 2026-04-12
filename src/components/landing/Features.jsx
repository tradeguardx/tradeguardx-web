import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/** Protection rules — aligned with `rule_templates` catalog (user-service). */
const protectionRules = [
  {
    title: 'Daily Loss Protection',
    description:
      'Blocks new trades when floating or realized loss approaches or breaches your daily limit—so one session can’t blow your cap.',
    gradient: 'from-accent/20 to-emerald-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Hedging Prevention',
    description:
      'Blocks opposite-side orders on the same symbol before they execute—stay aligned with no-hedging and netting rules.',
    gradient: 'from-red-500/15 to-orange-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  {
    title: 'Risk Per Trade',
    description:
      'Caps how much of the account each new trade can risk—so a single oversized entry can’t wipe you out.',
    gradient: 'from-blue-500/15 to-cyan-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Max Drawdown Lock',
    description:
      'Locks trading when total drawdown exceeds your threshold—the safety net prop firms and personal risk plans rely on.',
    gradient: 'from-purple-500/15 to-pink-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Stacking Control',
    description:
      'Limits how many positions you can open at once—reduces correlated risk and “stacked” exposure on the same theme.',
    gradient: 'from-indigo-500/15 to-violet-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: 'Max Trades Per Day',
    description:
      'Caps trades per session—cuts revenge trading and overtrading after losses or wins when you’re not thinking clearly.',
    gradient: 'from-orange-500/15 to-amber-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Close After N Losses',
    description:
      'Stops new trades after a streak of consecutive losses—protects capital and mindset before tilt takes over.',
    gradient: 'from-rose-500/15 to-red-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    title: 'Stop Loss Protection',
    description:
      'If a new position has no stop loss, alerts you after a configurable delay so you can add protection before size gets away from you.',
    gradient: 'from-cyan-500/15 to-teal-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: 'Minimum Hold (Anti–Early Close)',
    description:
      'Blocks fully closing a position until it’s been open for at least your minimum time—reduces impulsive scratch exits and over-scalping.',
    gradient: 'from-slate-500/20 to-slate-400/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const insightsAndAi = [
  {
    title: 'Trade journaling',
    description:
      'Closed and open trades sync to your account so you can review history, equity, and performance in the dashboard—scoped per trading account.',
    gradient: 'from-amber-500/15 to-yellow-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    title: 'Live trade monitoring',
    description:
      'The extension watches symbols, side, size, entry, stops, targets, and P&amp;L in real time as you trade—so rules react to what’s actually on screen.',
    gradient: 'from-teal-500/15 to-emerald-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    title: 'Performance analytics',
    description:
      'Win rate, net P&amp;L, daily series, and trade stats in the web dashboard—turn raw activity into decisions, not guesswork.',
    gradient: 'from-blue-500/15 to-indigo-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3m4-1v6a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3.5a1.5 1.5 0 011.5 1.5V11a1 1 0 001 1h2z" />
      </svg>
    ),
  },
  {
    title: 'AI emotional-awareness coaching',
    description:
      'Intelligent assistance that connects your rules, streaks, and journal context—surfacing emotional patterns like overtrading after losses, trading near limits, or breaking your own plan—so you get nudges before discipline has to hard-stop you.',
    gradient: 'from-violet-500/20 to-fuchsia-500/10',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: 'AI-assisted platform mapping',
    description:
      'For new web platforms, AI-assisted mapping suggests robust selectors for your positions table—so TradeGuardX can lock onto your broker UI faster with less manual setup.',
    gradient: 'from-emerald-500/15 to-accent/15',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
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
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function FeatureCard({ feature }) {
  return (
    <motion.div
      variants={item}
      className="group relative rounded-2xl border border-white/[0.06] bg-surface-900/30 p-7 hover:bg-surface-900/50 hover:border-white/[0.1] transition-all duration-500"
    >
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300`}
      >
        {feature.icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-white mb-2.5">{feature.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section id="features" className="section-padding relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 md:mb-16"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
            Everything you need for
            <br className="hidden sm:block" />
            <span className="gradient-text-accent"> serious risk control</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Nine configurable rule templates plus journaling, analytics, and AI-assisted insight—automatic protection so you can focus on execution.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-center"
        >
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-500 mb-10">
            Protection rules
          </h3>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16 md:mb-20"
        >
          {protectionRules.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>

        <p className="text-center text-xs text-slate-600 max-w-2xl mx-auto mb-16 md:mb-20 leading-relaxed">
          Daily loss, hedging, and stop-loss protection are available on every plan. Advanced templates—including risk per trade, max drawdown, stacking, max trades per day, close-after-losses, and minimum hold—unlock on Pro and Pro+—see{' '}
          <Link to="/pricing" className="text-slate-500 underline decoration-slate-600/80 underline-offset-2 hover:text-accent">
            Pricing
          </Link>
          .
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-center"
        >
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Journal, monitoring, analytics &amp; AI
          </h3>
          <p className="text-slate-500 text-sm max-w-xl mx-auto mb-10">
            See what happened, why it mattered, and when your behaviour drifted—rules plus intelligence, not just alerts.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {insightsAndAi.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
