import { motion } from 'framer-motion';

const segments = [
  'Prop firm traders',
  'Forex traders',
  'Crypto traders',
  'Futures traders',
];

export default function WorksWithYourStyleSection() {
  return (
    <section id="works-with" className="py-24 md:py-32 relative">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Works with your trading style
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            TradeGuardX supports:
          </p>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8"
        >
          {segments.map((segment, i) => (
            <li
              key={segment}
              className="flex items-center gap-3 px-5 py-4 rounded-xl border border-surface-700/50 bg-surface-900/40 text-slate-200"
            >
              <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
              {segment}
            </li>
          ))}
        </motion.ul>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-slate-500"
        >
          Any browser-based trading platform.
        </motion.p>
      </div>
    </section>
  );
}
