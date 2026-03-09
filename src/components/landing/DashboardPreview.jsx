import { motion } from 'framer-motion';

export default function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Rule enforcement in action</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Configure rules once. TradeGuardX blocks, warns, or closes trades automatically when limits are breached.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-surface-700/50 bg-surface-900/40 overflow-hidden shadow-2xl shadow-accent/5"
        >
          <div className="px-6 py-4 border-b border-surface-700/50 flex items-center justify-between">
            <div className="flex gap-2 items-center">
              <span className="w-3 h-3 rounded-full bg-surface-600" />
              <span className="w-3 h-3 rounded-full bg-surface-600" />
              <span className="w-3 h-3 rounded-full bg-surface-600" />
            </div>
            <span className="text-slate-500 text-sm font-mono">TradeGuardX Dashboard — Rules & positions</span>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl bg-surface-800/60 border border-surface-600/40 p-4">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Active rules</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-accent" /> Daily loss: 2% — Warning at 1.5%
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-accent" /> Hedging: blocked
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-accent" /> Max drawdown: 5%
                </li>
              </ul>
            </div>
            <div className="rounded-xl bg-surface-800/60 border border-danger/30 p-4">
              <h4 className="text-sm font-medium text-danger mb-2">Rule triggered</h4>
              <p className="text-slate-300 text-sm">
                Daily loss limit reached. New trades blocked until next day. Existing positions unchanged.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
