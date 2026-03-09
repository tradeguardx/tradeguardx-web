import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const rules = [
  'Daily loss limits',
  'Maximum drawdown rules',
  'No hedging policies',
  'Trade count restrictions',
];

export default function PropFirmSection() {
  return (
    <section id="prop-firm" className="py-24 md:py-32 relative">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Perfect for prop firm traders
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
            TradeGuardX helps you stay compliant with common prop firm rules:
          </p>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-10"
        >
          {rules.map((rule, i) => (
            <li
              key={rule}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-surface-700/50 bg-surface-900/40 text-slate-200"
            >
              <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {rule}
            </li>
          ))}
        </motion.ul>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-lg md:text-xl font-semibold text-white mb-8"
        >
          Never lose an account because of a rule violation again.
        </motion.p>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-accent hover:text-accent-hover font-medium"
          >
            Get started with TradeGuardX
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
