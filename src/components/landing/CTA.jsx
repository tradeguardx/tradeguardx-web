import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function CTA() {
  return (
    <section id="install" className="py-24 md:py-32 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto px-6 text-center"
      >
        <div className="rounded-3xl border border-surface-700/50 bg-surface-900/50 p-12 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-accent-muted/30 via-transparent to-transparent" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Stop breaking trading rules.
            </h2>
            <p className="text-slate-400 text-lg mb-2 max-w-xl mx-auto">
              Install TradeGuardX and trade with automatic protection.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Free plan available — no card required.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-accent text-surface-950 font-semibold text-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/25"
              >
                Install Extension
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
