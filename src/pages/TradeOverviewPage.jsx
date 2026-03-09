import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function TradeOverviewPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl"
    >
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Trade Overview</h1>
        <p className="text-slate-400">
          Your trading summary and quick access to rules and journal.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Today&apos;s P&L</p>
          <p className="text-white text-xl font-semibold mt-1">+$124.50</p>
          <p className="text-slate-500 text-xs mt-0.5">3 trades</p>
        </div>
        <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Open positions</p>
          <p className="text-white text-xl font-semibold mt-1">2</p>
          <p className="text-slate-500 text-xs mt-0.5">Within limits</p>
        </div>
        <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Daily loss used</p>
          <p className="text-white text-xl font-semibold mt-1">0.4%</p>
          <p className="text-slate-500 text-xs mt-0.5">Limit 2%</p>
        </div>
      </div>

      {/* Quick links to other pages */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick access</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to="/dashboard/rules"
            className="group rounded-xl border border-surface-700/50 bg-surface-900/50 p-6 hover:border-accent/30 hover:bg-surface-900/80 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition-colors">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Rules</h3>
            <p className="text-slate-500 text-sm">Set daily loss, hedging, drawdown and more.</p>
            <span className="inline-flex items-center gap-1 text-accent text-sm font-medium mt-3 group-hover:gap-2 transition-all">
              Open Rules
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Link>
          <Link
            to="/dashboard/journal"
            className="group rounded-xl border border-surface-700/50 bg-surface-900/50 p-6 hover:border-accent/30 hover:bg-surface-900/80 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition-colors">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Trade Journal</h3>
            <p className="text-slate-500 text-sm">View history, win rate and performance.</p>
            <span className="inline-flex items-center gap-1 text-accent text-sm font-medium mt-3 group-hover:gap-2 transition-all">
              Open Journal
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      <Link
        to="/dashboard/install-extension"
        className="inline-flex items-center gap-2 text-accent hover:text-accent-hover text-sm font-medium"
      >
        Need to install the extension?
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </motion.div>
  );
}
