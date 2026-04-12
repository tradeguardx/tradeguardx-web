import { motion } from 'framer-motion';

const mockPositions = [
  { symbol: 'BTC/USD', entry: '67,245.00', current: '67,892.50', stopLoss: '66,100.00', pnl: '+$324.50', pnlPercent: '+0.96%', positive: true, status: 'Protected' },
  { symbol: 'EUR/USD', entry: '1.0842', current: '1.0821', stopLoss: '1.0780', pnl: '-$42.00', pnlPercent: '-0.19%', positive: false, status: 'Risk OK' },
  { symbol: 'ETH/USD', entry: '3,421.00', current: '3,458.20', stopLoss: '3,350.00', pnl: '+$148.40', pnlPercent: '+1.09%', positive: true, status: 'Protected' },
  { symbol: 'GBP/JPY', entry: '191.450', current: '191.280', stopLoss: '190.800', pnl: '-$85.00', pnlPercent: '-0.44%', positive: false, status: 'Warning' },
];

export default function ProductPreview() {
  return (
    <section id="preview" className="section-padding relative">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            Live Preview
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
            See what we monitor in real-time
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Every position is tracked — symbol, entry, current price, stop loss, and P&L — with rule status updated live.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl glass p-1 shadow-2xl shadow-black/30"
        >
          <div className="rounded-[1.35rem] bg-surface-900/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-slate-500 text-sm font-mono ml-2">TradeGuardX — Live Positions</span>
              <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                4 Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {['Symbol', 'Entry', 'Current', 'Stop Loss', 'P&L', 'Status'].map((h) => (
                      <th key={h} className="px-6 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
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
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-sm text-white font-medium">{row.symbol}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{row.entry}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{row.current}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{row.stopLoss}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`font-medium text-sm ${row.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {row.pnl}
                          </span>
                          <span className={`text-xs ${row.positive ? 'text-emerald-500/50' : 'text-red-500/50'}`}>
                            {row.pnlPercent}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          row.status === 'Protected' ? 'bg-accent/10 text-accent' :
                          row.status === 'Warning' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {row.status === 'Protected' && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {row.status === 'Warning' && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                          {row.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.04] flex flex-wrap items-center gap-6 text-xs text-slate-500">
              <span>Daily Loss: <span className="text-slate-300">0.63%</span> / 2.0%</span>
              <span>Drawdown: <span className="text-slate-300">1.2%</span> / 5.0%</span>
              <span>Open Trades: <span className="text-slate-300">4</span> / 10</span>
              <span className="ml-auto text-accent font-medium">All Rules Passing</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
