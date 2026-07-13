import { motion } from 'framer-motion';

const benefits = [
  {
    title: 'Never lose an account to a rule violation',
    description: 'Prop firms enforce strict rules. One bad day can cost your funded account. TradeGuardX keeps you within limits automatically.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    gradient: 'from-accent/20 to-emerald-500/5',
    accentColor: 'text-accent',
  },
  {
    title: 'Remove emotional trading decisions',
    description: 'When drawdown or daily loss is close, emotions spike. Get real-time alerts and optional auto-close so discipline runs the show.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gradient: 'from-amber-500/15 to-orange-500/5',
    accentColor: 'text-amber-400',
  },
  {
    title: 'Privacy-first by design',
    description: "No API keys and no broker API access. Enforcement runs in your browser on the platform; optional dashboard features only sync what you choose when you're signed in.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    gradient: 'from-blue-500/15 to-indigo-500/5',
    accentColor: 'text-blue-400',
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="section-padding relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            Why TradeGuardX
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
            Trade with a safety net
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Stay compliant, stay funded, and keep your edge without second-guessing every trade.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative rounded-3xl border border-white/[0.06] bg-surface-900/30 p-8 hover:bg-surface-900/50 hover:border-white/[0.1] transition-all duration-500"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center ${benefit.accentColor} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {benefit.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-white mb-3 leading-snug">{benefit.title}</h3>
              <p className="text-slate-400 leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
