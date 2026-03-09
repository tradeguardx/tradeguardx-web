import { motion } from 'framer-motion';

const mockPositions = [
  { symbol: 'BTC/USD', entry: '67,245.00', current: '67,892.50', stopLoss: '66,100.00', pnl: '+$324.50', pnlPercent: '+0.96%', positive: true },
  { symbol: 'EUR/USD', entry: '1.0842', current: '1.0821', stopLoss: '1.0780', pnl: '-$42.00', pnlPercent: '-0.19%', positive: false },
  { symbol: 'ETH/USD', entry: '3,421.00', current: '3,458.20', stopLoss: '3,350.00', pnl: '+$148.40', pnlPercent: '+1.09%', positive: true },
];

export default function ProductPreview() {
  return (
    <section id="preview" className="py-24 md:py-32 relative">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">See what we monitor</h2>
          <p className="text-slate-400 text-lg">
            Real-time position data—symbol, entry, current price, stop loss, and P&L—all in one place.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-surface-700/50 bg-surface-900/50 overflow-hidden shadow-2xl"
        >
          {/* Panel header */}
          <div className="px-6 py-4 border-b border-surface-700/50 flex items-center gap-3">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-surface-600" />
              <span className="w-3 h-3 rounded-full bg-surface-600" />
              <span className="w-3 h-3 rounded-full bg-surface-600" />
            </div>
            <span className="text-slate-500 text-sm font-mono">TradeGuardX — Live positions</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Entry Price</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Current Price</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Stop Loss</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">P&L</th>
                </tr>
              </thead>
              <tbody>
                {mockPositions.map((row, i) => (
                  <motion.tr
                    key={row.symbol}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-slate-200">{row.symbol}</td>
                    <td className="px-6 py-4 text-slate-400">{row.entry}</td>
                    <td className="px-6 py-4 text-slate-400">{row.current}</td>
                    <td className="px-6 py-4 text-slate-400">{row.stopLoss}</td>
                    <td className="px-6 py-4">
                      <span className={row.positive ? 'text-success font-medium' : 'text-danger font-medium'}>
                        {row.pnl} ({row.pnlPercent})
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
