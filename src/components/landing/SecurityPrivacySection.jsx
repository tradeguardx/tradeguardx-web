import { motion } from 'framer-motion';

const bullets = [
  'No API keys required',
  'No broker account connection',
  'No server-side monitoring',
  'Your trading data never leaves your computer',
];

export default function SecurityPrivacySection() {
  return (
    <section id="security-privacy" className="py-24 md:py-32 relative">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Security & Privacy
          </h2>
          <p className="text-xl text-slate-300 font-medium mb-2">
            Your trading data stays private.
          </p>
          <p className="text-slate-400 text-lg">
            TradeGuardX runs entirely inside your browser.
          </p>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-surface-700/50 bg-surface-900/40 p-8 md:p-10 space-y-4 max-w-2xl mx-auto"
        >
          {bullets.map((item, i) => (
            <li key={item} className="flex items-center gap-3 text-slate-300">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
