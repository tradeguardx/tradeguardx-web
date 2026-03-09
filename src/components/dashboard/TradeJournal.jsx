import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const EQUITY_CURVE = [
  { day: 'Mon', balance: 10000 },
  { day: 'Tue', balance: 10080 },
  { day: 'Wed', balance: 10120 },
  { day: 'Thu', balance: 10065 },
  { day: 'Fri', balance: 10190 },
  { day: 'Sat', balance: 10250 },
  { day: 'Sun', balance: 10299 },
];

const WIN_LOSS_DATA = [
  { name: 'Wins', value: 3, color: '#22c55e' },
  { name: 'Losses', value: 2, color: '#ef4444' },
];

const DAILY_PNL = [
  { day: 'Mon', pnl: 80 },
  { day: 'Tue', pnl: 40 },
  { day: 'Wed', pnl: -55 },
  { day: 'Thu', pnl: 125 },
  { day: 'Fri', pnl: 60 },
  { day: 'Sat', pnl: 49 },
  { day: 'Sun', pnl: -30 },
];

export default function TradeJournal() {
  return (
    <div className="space-y-8">
      {/* Page header - Trade Journal as its own page */}
      <div className="pb-6 border-b border-surface-700/50">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Trade Journal</h1>
        <p className="text-slate-400">History, performance and analytics. Plan limits apply.</p>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Win rate', value: '60%', sub: '3W / 2L' },
          { label: 'Total P&L', value: '+$299', sub: 'Last 7 days' },
          { label: 'Avg trade', value: '+$59.80', sub: 'Per trade' },
          { label: 'Best day', value: '+$125', sub: 'Thu' },
        ].map((stat, i) => (
          <div key={stat.label} className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-4 hover:border-surface-600/50 transition-colors">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
            <p className="text-white text-xl font-semibold mt-1">{stat.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5"
        >
          <h3 className="text-sm font-medium text-slate-300 mb-4">Equity curve</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EQUITY_CURVE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value) => [`$${value}`, 'Balance']}
                />
                <Line type="monotone" dataKey="balance" stroke="#00d4aa" strokeWidth={2} dot={{ fill: '#00d4aa' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5"
        >
          <h3 className="text-sm font-medium text-slate-300 mb-4">Win / Loss</h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={WIN_LOSS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {WIN_LOSS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5"
      >
        <h3 className="text-sm font-medium text-slate-300 mb-4">Daily P&L</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DAILY_PNL}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(value) => [`$${value}`, 'P&L']}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]} fill="#00d4aa">
                {DAILY_PNL.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Link to All Trades page */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Link
          to="/dashboard/trades"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-surface-700/50 bg-surface-900/50 hover:border-accent/30 hover:bg-surface-900/80 text-slate-300 hover:text-white transition-all text-sm font-medium"
        >
          View all trades
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </motion.div>
    </div>
  );
}
