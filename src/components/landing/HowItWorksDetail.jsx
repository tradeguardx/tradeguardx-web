import { motion } from 'framer-motion';

const points = [
  {
    title: 'Works directly inside your trading platform',
    description: 'TradeGuardX runs as a browser extension right where you trade. It securely observes your open positions directly inside the trading platform interface. No separate app—monitoring and protection happen on the same tabs you already use.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Real-time monitoring & automatic enforcement',
    description: 'We monitor your open positions in real time and enforce your risk rules automatically. When a limit is reached, we can block new trades, warn you, or close positions—so you stay within your plan.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'No API keys required',
    description: 'Most trading tools require API access to your account. TradeGuardX works differently — it runs directly inside your trading platform interface and requires no account permissions. Install the extension, set your rules, and open your platform. No API keys or integrations.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    title: 'No broker connection required',
    description: 'We don’t connect to your broker’s servers. TradeGuardX detects your positions directly from the trading platform screen in your browser. No OAuth, no “link account,” no broker partnership needed.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.172-1.172a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.172 1.172a4 4 0 01-5.656 0L8.172 10.172z" />
      </svg>
    ),
  },
  {
    title: 'Your data never leaves your computer',
    description: 'Position and trade data used for rule checks are processed locally in your browser. We don’t send your trading data to our servers for monitoring—your privacy and security stay with you.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

export default function HowItWorksDetail() {
  return (
    <section id="how-it-works-detail" className="py-24 md:py-32 relative">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, private, no setup
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            TradeGuardX works where you trade. No API keys, no broker connection, and your data stays on your device.
          </p>
        </motion.div>

        <div className="space-y-8">
          {points.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-6 rounded-2xl border border-surface-700/50 bg-surface-900/30 p-6 md:p-8 hover:border-surface-600/50 transition-colors"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent">
                {point.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{point.title}</h3>
                <p className="text-slate-400 leading-relaxed">{point.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
