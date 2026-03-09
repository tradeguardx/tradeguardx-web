import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const RULES = [
  {
    id: 'daily-loss',
    name: 'Daily Loss Protection',
    plan: 'free',
    fields: [
      { key: 'accountSize', label: 'Account size', type: 'number', value: '100000', suffix: '$' },
      { key: 'dailyLossPct', label: 'Daily loss %', type: 'number', value: '2', suffix: '%' },
      { key: 'warningPct', label: 'Warning threshold %', type: 'number', value: '1.5', suffix: '%' },
    ],
  },
  {
    id: 'hedging',
    name: 'Hedging Prevention',
    plan: 'free',
    fields: [
      { key: 'enabled', label: 'Block opposite trades on same symbol', type: 'toggle', value: true },
    ],
  },
  {
    id: 'risk-per-trade',
    name: 'Risk Per Trade',
    plan: 'pro',
    locked: true,
    fields: [{ key: 'maxRiskPct', label: 'Max risk per trade %', type: 'number', value: '1', suffix: '%' }],
  },
  {
    id: 'max-total-loss',
    name: 'Max Total Loss',
    plan: 'pro',
    locked: true,
    fields: [{ key: 'maxDrawdownPct', label: 'Max total drawdown %', type: 'number', value: '5', suffix: '%' }],
  },
  {
    id: 'stacking',
    name: 'Stacking',
    plan: 'pro',
    locked: true,
    fields: [{ key: 'maxPositions', label: 'Maximum open positions', type: 'number', value: '5' }],
  },
  {
    id: 'max-trades-day',
    name: 'Max Trades Per Day',
    plan: 'pro',
    locked: true,
    fields: [{ key: 'maxTrades', label: 'Limit trades per day', type: 'number', value: '10' }],
  },
  {
    id: 'close-after-losses',
    name: 'Close Day After N Losses',
    plan: 'pro',
    locked: true,
    fields: [{ key: 'consecutiveLosses', label: 'Stop after N consecutive losses', type: 'number', value: '3' }],
  },
];

function RuleCard({ rule, index }) {
  const [values, setValues] = useState(
    rule.fields.reduce((acc, f) => ({ ...acc, [f.key]: f.value }), {})
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-xl border overflow-hidden transition-all ${
        rule.locked
          ? 'border-surface-700/50 bg-surface-900/30 opacity-90'
          : 'border-surface-700/50 bg-surface-900/50 hover:border-surface-600/50'
      }`}
    >
      <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
        <h3 className="font-semibold text-white">{rule.name}</h3>
        {rule.locked && (
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Upgrade to Pro
          </Link>
        )}
      </div>
      <div className="p-5 space-y-4">
        {rule.fields.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-400">{field.label}</label>
            {rule.locked ? (
              <span className="text-slate-500 text-sm">—</span>
            ) : field.type === 'toggle' ? (
              <button
                type="button"
                onClick={() => setValues((v) => ({ ...v, [field.key]: !v[field.key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  values[field.key] ? 'bg-accent' : 'bg-surface-600'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${values[field.key] ? 'left-6' : 'left-1'}`} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                {field.suffix && <span className="text-slate-500 text-sm">{field.suffix}</span>}
                <input
                  type={field.type}
                  value={values[field.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="w-24 px-3 py-2 rounded-lg bg-surface-800 border border-surface-600/50 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function RulesTerminal() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Rules terminal</h2>
        <p className="text-slate-400 text-sm mt-1">Configure protection rules for the selected account.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {RULES.map((rule, i) => (
          <RuleCard key={rule.id} rule={rule} index={i} />
        ))}
      </div>
    </div>
  );
}
