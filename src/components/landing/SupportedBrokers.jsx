import { motion } from 'framer-motion';

const BROKERS = [
  { name: 'Delta Exchange', logo: '/brokers/delta-exchange.svg', url: 'https://www.delta.exchange' },
  { name: 'Exness', logo: '/brokers/exness.svg', url: 'https://www.exness.com' },
];

const tradingStyles = [
  'Prop Firm Traders',
  'Forex Traders',
  'Crypto Traders',
  'Futures Traders',
];

export default function SupportedBrokers() {
  return (
    <section className="section-padding relative">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            Compatibility
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
            Works where you trade
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            TradeGuardX supports any browser-based trading platform. Currently live on:
          </p>
        </motion.div>

        {/* Broker cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-5 mb-12"
        >
          {BROKERS.map((broker) => (
            <motion.a
              key={broker.name}
              href={broker.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 px-8 py-5 rounded-2xl glass glass-card-hover group"
            >
              <img src={broker.logo} alt="" className="h-10 w-10 object-contain flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
              <span className="text-lg font-display font-semibold text-slate-200 group-hover:text-white transition-colors">
                {broker.name}
              </span>
            </motion.a>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm mb-16"
        >
          <span className="inline-flex items-center gap-2 text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            Actively adding more platforms. Request yours via support.
          </span>
        </motion.p>

        {/* Trading styles */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {tradingStyles.map((style, i) => (
            <motion.div
              key={style}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-300 text-sm font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {style}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
