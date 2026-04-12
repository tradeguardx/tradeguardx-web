import { motion } from 'framer-motion';

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
            TradeGuardX works with any browser-based trading platform—if you can trade it in Chrome or Edge, you can use our
            extension alongside it.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-16"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/15 text-accent mb-5 mx-auto">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-200 font-display font-semibold text-lg md:text-xl mb-2">Universal browser support</p>
            <p className="text-slate-400 text-sm md:text-[15px] leading-relaxed">
              We do not lock you to a single broker or venue. Install the extension, sign in, and enforce your rules on the
              platforms you already use.
            </p>
          </div>
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
            Questions about your setup? Reach us anytime via support.
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
