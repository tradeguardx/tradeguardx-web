import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const MOCK_TRADES = [
  { id: 1, symbol: 'EUR/USD', entry: 1.0842, exit: 1.0891, stopLoss: 1.0780, takeProfit: 1.0920, pnl: 49, pnlPct: 0.45, duration: '2h 14m', notes: 'Breakout long' },
  { id: 2, symbol: 'BTC/USD', entry: 67245, exit: 66890, stopLoss: 66100, takeProfit: 68500, pnl: -355, pnlPct: -0.53, duration: '5h 02m', notes: '' },
  { id: 3, symbol: 'GBP/JPY', entry: 188.42, exit: 189.10, stopLoss: 187.20, takeProfit: 190.00, pnl: 68, pnlPct: 0.36, duration: '1h 45m', notes: 'Trend follow' },
  { id: 4, symbol: 'ETH/USD', entry: 3421, exit: 3480, stopLoss: 3350, takeProfit: 3550, pnl: 59, pnlPct: 1.73, duration: '3h 30m', notes: '' },
  { id: 5, symbol: 'XAU/USD', entry: 2034.50, exit: 2028.20, stopLoss: 2020, takeProfit: 2050, pnl: -6.30, pnlPct: -0.31, duration: '45m', notes: 'Reversal short' },
];

export default function AllTradesPage() {
  return (
    <div className="max-w-6xl">
      {/* Page header */}
      <div className="pb-6 border-b border-surface-700/50 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">All Trades</h1>
        <p className="text-slate-400">Complete list of your trade history with entry, exit, P&L and notes.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-surface-700/50 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-slate-300">Trade history</h2>
          <Link
            to="/dashboard/journal"
            className="text-accent hover:text-accent-hover text-sm font-medium transition-colors"
          >
            ← Back to Journal
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Symbol</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Entry</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Exit</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Stop / TP</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">P&L</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRADES.map((t) => (
                <tr key={t.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-slate-200 text-sm">{t.symbol}</td>
                  <td className="px-5 py-3 text-slate-400 text-sm">{t.entry}</td>
                  <td className="px-5 py-3 text-slate-400 text-sm">{t.exit}</td>
                  <td className="px-5 py-3 text-slate-500 text-sm">{t.stopLoss} / {t.takeProfit}</td>
                  <td className="px-5 py-3">
                    <span className={t.pnl >= 0 ? 'text-success font-medium' : 'text-danger font-medium'}>
                      ${t.pnl} ({t.pnlPct}%)
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-sm">{t.duration}</td>
                  <td className="px-5 py-3 text-slate-500 text-sm">{t.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
