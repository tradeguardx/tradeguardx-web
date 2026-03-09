import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Install the extension',
    description: 'Add TradeGuardX to Chrome in one click. No account signup required to get started.',
  },
  {
    number: '02',
    title: 'Connect your trading platform',
    description: 'Open your prop firm, forex, crypto or futures platform. TradeGuardX detects positions automatically.',
  },
  {
    number: '03',
    title: 'Trade safely',
    description: 'Set your rules once. We monitor every position and protect you from breaking limits.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 relative">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How it works</h2>
          <p className="text-slate-400 text-lg">
            Three steps to automated trade protection.
          </p>
        </motion.div>

        <div className="space-y-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="flex gap-8 items-start"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-accent-muted border border-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold text-lg">{step.number}</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
