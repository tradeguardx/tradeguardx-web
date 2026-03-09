import { motion } from 'framer-motion';

const BROKERS = [
  { name: 'Delta Exchange', logo: '/brokers/delta-exchange.svg', url: 'https://www.delta.exchange' },
  { name: 'Exness', logo: '/brokers/exness.svg', url: 'https://www.exness.com' },
];

export default function SupportedBrokers() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="py-16 md:py-20"
    >
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Currently supported platforms
        </h2>
        <p className="text-slate-400 mb-8">
          TradeGuardX is live on:
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mb-8">
          {BROKERS.map((broker) => (
            <motion.li key={broker.name} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a
                href={broker.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-6 py-4 rounded-2xl border border-surface-700/50 bg-surface-900/40 hover:border-accent/30 hover:bg-surface-900/60 transition-all group"
              >
                <img src={broker.logo} alt="" className="h-12 w-12 object-contain flex-shrink-0" />
                <span className="text-lg font-semibold text-slate-200 group-hover:text-white transition-colors">
                  {broker.name}
                </span>
              </a>
            </motion.li>
          ))}
        </ul>
        <p className="text-slate-500 text-sm inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden />
          We are actively adding support for more platforms.
        </p>
      </div>
    </motion.section>
  );
}
