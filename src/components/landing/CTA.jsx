import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function CTA() {
  return (
    <section id="install" className="section-padding relative">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="relative rounded-4xl overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-surface-900 to-surface-900" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/10 blur-[100px] rounded-full" />

            <div className="relative p-12 md:p-20 text-center border border-white/[0.06] rounded-4xl">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
                  Ready to trade without
                  <br className="hidden sm:block" />
                  breaking rules?
                </h2>
                <p className="text-slate-400 text-lg mb-3 max-w-xl mx-auto">
                  Install TradeGuardX and trade with automatic protection. Every trade monitored, every rule enforced.
                </p>
                <p className="text-slate-500 text-sm mb-10">
                  Free plan available — no credit card required.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to="/pricing"
                      className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl bg-accent text-surface-950 font-semibold text-lg hover:bg-accent-hover transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/30"
                    >
                      Get Started Free
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </motion.div>
                  <Link
                    to="/support"
                    className="text-slate-400 hover:text-white transition-colors font-medium"
                  >
                    Contact Support
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
