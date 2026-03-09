import { motion } from 'framer-motion';

const benefits = [
  {
    title: 'Avoid account bans',
    description: 'Prop firms and brokers enforce strict rules. One bad day can cost your account. TradeGuardX keeps you within limits so you stay funded.',
    icon: '🛡️',
  },
  {
    title: 'No more prop firm violations',
    description: 'Daily loss limits, max drawdown, and no-hedging rules are easy to breach when you’re in the zone. We enforce them in the background.',
    icon: '📋',
  },
  {
    title: 'Fewer emotional mistakes',
    description: 'When drawdown or daily loss is close, emotions spike. Get clear alerts and optional auto-close so rules run the show, not fear.',
    icon: '🧠',
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Trade with a safety net</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Stay compliant, stay funded, and keep your edge without second-guessing every trade.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl border border-surface-700/50 bg-surface-900/30 p-8 text-center hover:border-surface-600/50 transition-colors"
            >
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-3">{benefit.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
