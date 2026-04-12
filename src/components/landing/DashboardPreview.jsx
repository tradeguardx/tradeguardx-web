import { motion } from 'framer-motion';

const rules = [
  { name: 'Daily loss limit', value: '2.0%', status: 'active', current: '0.63%' },
  { name: 'Hedging', value: 'Blocked', status: 'active', current: 'No hedge' },
  { name: 'Max drawdown', value: '5.0%', status: 'active', current: '1.2%' },
  { name: 'Max trades/day', value: '10', status: 'active', current: '4 used' },
  { name: 'Risk per trade', value: '1.5%', status: 'active', current: 'OK' },
];

export default function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="section-padding relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
              Rule Engine
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-5">
              Configure once.
              <br />
              <span className="gradient-text-accent">Protected forever.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Set your risk rules in seconds. TradeGuardX monitors every trade against your rules and takes action automatically — blocking, warning, or closing when limits are breached.
            </p>
            <ul className="space-y-4">
              {[
                'Real-time rule enforcement',
                'Customizable warning thresholds',
                'Automatic trade blocking',
                'Works with any browser-based platform',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center">
                    <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-3xl glass p-1 shadow-2xl shadow-black/30">
              <div className="rounded-[1.35rem] bg-surface-900/80 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-slate-500 text-xs font-mono ml-1.5">Active Rules</span>
                  </div>
                  <span className="text-xs text-accent font-medium">5 rules active</span>
                </div>

                <div className="p-4 space-y-2">
                  {rules.map((rule, i) => (
                    <motion.div
                      key={rule.name}
                      initial={{ opacity: 0, x: 8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        <span className="text-sm text-slate-300">{rule.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500">{rule.current}</span>
                        <span className="text-sm font-mono text-white bg-white/[0.04] px-2.5 py-1 rounded-lg">{rule.value}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mx-4 mb-4 rounded-xl bg-danger/5 border border-danger/20 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-danger">Rule would trigger</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Daily loss at 1.63%. Warning threshold at 1.5% reached. New trades blocked at 2.0%.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
