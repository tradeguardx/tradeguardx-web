import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const webPoints = [
  'Rules Terminal — configure protection per trading account',
  'Trading accounts & pairing — link the extension with a short-lived code',
  'Journal & billing — plans, history, and account overview in one place',
];

const extensionPoints = [
  'Runs inside your broker’s web platform — no API keys',
  'Monitors positions and enforces limits in real time',
  'Warns, blocks, or acts based on the rules you saved',
];

export default function ProductEcosystem() {
  return (
    <section id="ecosystem" className="section-padding relative overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-accent/[0.06] blur-[100px]" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-violet-500/[0.05] blur-[90px]" aria-hidden />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            Two parts, one system
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
            Configure on the web.
            <br />
            <span className="gradient-text-accent">Enforce in the platform.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            TradeGuardX isn’t only an extension. Use the dashboard to manage rules, accounts, and pairing—then let the extension apply those rules while you trade.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 mb-12 lg:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-white/[0.08] bg-surface-900/40 p-8 md:p-10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-indigo-500/15 text-violet-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-white">Web dashboard</h3>
                <p className="text-sm text-slate-500">Your control center</p>
              </div>
            </div>
            <ul className="space-y-4">
              {webPoints.map((item) => (
                <li key={item} className="flex gap-3 text-slate-300 text-[15px] leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="rounded-3xl border border-white/[0.08] bg-surface-900/40 p-8 md:p-10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-emerald-500/15 text-accent">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-white">Browser extension</h3>
                <p className="text-sm text-slate-500">Live enforcement</p>
              </div>
            </div>
            <ul className="space-y-4">
              {extensionPoints.map((item) => (
                <li key={item} className="flex gap-3 text-slate-300 text-[15px] leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-accent/15 bg-gradient-to-br from-accent/[0.08] via-surface-900/50 to-violet-500/[0.04] p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="max-w-xl">
              <h3 className="font-display text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </span>
                Pairing &amp; trading accounts
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">
                Each trading account in the dashboard gets its own rules and history. Pair the extension once per device with a time-limited code so sync and enforcement stay tied to the right account.
              </p>
              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="font-mono text-accent shrink-0">1.</span>
                  Create or select a trading account in the dashboard.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-accent shrink-0">2.</span>
                  Open Pairing, copy the code, and enter it in the extension.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-accent shrink-0">3.</span>
                  Switch the active account in the app header when you move between props or platforms.
                </li>
              </ol>
            </div>
            <div className="flex flex-col gap-3 shrink-0 md:pt-1">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-surface-950 hover:bg-accent-hover transition-colors shadow-lg shadow-accent/15"
              >
                View plans
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to={{ pathname: '/', hash: 'how-it-works' }}
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.1] px-5 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.04] transition-colors"
              >
                Back to setup steps
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed"
        >
          TradeGuardX helps you stick to the limits you set. It does not replace your broker’s or prop firm’s rules or guarantees—you remain responsible for compliance with every provider you use.
        </motion.p>
      </div>
    </section>
  );
}
