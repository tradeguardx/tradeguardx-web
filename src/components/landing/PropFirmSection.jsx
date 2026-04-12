import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const rules = [
  { name: 'Daily loss limits', desc: 'Auto-stop at your daily cap' },
  { name: 'Maximum drawdown', desc: 'Lock before account breach' },
  { name: 'No hedging policies', desc: 'Block opposite positions' },
  { name: 'Trade count limits', desc: 'Cap daily trade frequency' },
  { name: 'Risk per trade', desc: 'Enforce position sizing' },
  { name: 'Consecutive loss stop', desc: 'Cool down after losses' },
];

export default function PropFirmSection() {
  return (
    <section id="prop-firm" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-accent/[0.02] to-surface-950 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
              Prop Firm Ready
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-5">
              Built for prop firm
              <br />
              <span className="gradient-text-accent">compliance</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Prop firms have strict rules. One violation can cost your funded account.
              TradeGuardX enforces every rule automatically so you stay compliant.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-accent text-surface-950 font-semibold hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/20"
              >
                Protect Your Account
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-3"
          >
            {rules.map((rule, i) => (
              <motion.div
                key={rule.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-white/[0.06] bg-surface-900/30 p-5 hover:bg-surface-900/50 hover:border-accent/10 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-white">{rule.name}</span>
                </div>
                <p className="text-xs text-slate-500">{rule.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
