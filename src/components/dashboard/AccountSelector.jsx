import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTradingAccounts } from '../../context/TradingAccountContext';

const GRADIENTS = [
  'from-accent to-emerald-500',
  'from-blue-500 to-indigo-500',
  'from-violet-500 to-purple-500',
  'from-teal-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

function gradientForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function accountInitial(account) {
  const s = (account.propFirmSlug || account.platform || account.name || '?').trim();
  return s ? s[0].toUpperCase() : '?';
}

function formatBalanceLine(account) {
  if (account.accountSize == null || account.accountSize === '') {
    return 'Set size in Trading accounts';
  }
  const cur = account.accountCurrency || 'USD';
  const n = Number(account.accountSize);
  if (!Number.isFinite(n)) {
    return `${cur} ${account.accountSize}`;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${cur} ${n}`;
  }
}

export default function AccountSelector() {
  const {
    accounts,
    accountsLoading,
    selectedTradingAccountId,
    setSelectedTradingAccountId,
    selectedAccount,
  } = useTradingAccounts();
  const [open, setOpen] = useState(false);

  const selected = selectedAccount;
  const selectedGradient = selected ? gradientForId(selected.id) : GRADIENTS[0];

  const rows = useMemo(
    () =>
      accounts.map((a) => ({
        account: a,
        gradient: gradientForId(a.id),
        balanceLine: formatBalanceLine(a),
        initial: accountInitial(a),
      })),
    [accounts],
  );

  if (accountsLoading) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-xl border min-w-[200px] sm:min-w-[240px] animate-pulse"
        style={{
          backgroundColor: 'var(--dash-bg-card)',
          borderColor: 'var(--dash-border)',
        }}
      >
        <div className="h-9 w-9 rounded-lg bg-[var(--dash-bg-input)] flex-shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-3.5 rounded-md bg-[var(--dash-bg-input)] w-3/4" />
          <div className="h-3 rounded-md bg-[var(--dash-bg-input)] w-1/2" />
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Link
        to="/dashboard/account/trading"
        className="flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-200 min-w-[200px] sm:min-w-[240px] hover:border-accent/30"
        style={{
          backgroundColor: 'var(--dash-bg-card)',
          borderColor: 'var(--dash-border)',
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 shadow-sm flex-shrink-0">
          <span className="text-white font-bold text-xs">+</span>
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--dash-text-primary)' }}>
            Add trading account
          </p>
          <p className="text-[11px] font-medium" style={{ color: 'var(--dash-text-muted)' }}>
            Rules &amp; trades need one
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-200 min-w-[200px] sm:min-w-[240px] group"
        style={{
          backgroundColor: 'var(--dash-bg-card)',
          borderColor: 'var(--dash-border)',
        }}
      >
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${selectedGradient} shadow-sm flex-shrink-0`}
        >
          <span className="text-white font-bold text-xs">{selected ? accountInitial(selected) : '—'}</span>
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--dash-text-primary)' }}>
            {selected?.name || 'Account'}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_4px_rgba(0,212,170,0.5)]" />
            <p className="text-[11px] font-medium truncate" style={{ color: 'var(--dash-text-muted)' }}>
              {selected ? formatBalanceLine(selected) : ''}
            </p>
          </div>
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 flex-shrink-0 transition-colors"
          style={{ color: 'var(--dash-text-faint)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 w-full rounded-2xl border backdrop-blur-2xl shadow-2xl z-20 overflow-hidden"
              style={{
                borderColor: 'var(--dash-border-hover)',
                backgroundColor: 'var(--dash-bg-raised)',
                boxShadow: 'var(--dash-shadow-card)',
              }}
            >
              <div className="p-2 space-y-0.5">
                {rows.map(({ account, gradient, balanceLine, initial }) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      setSelectedTradingAccountId(account.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 ${
                      selectedTradingAccountId === account.id
                        ? 'bg-accent/[0.08] border border-accent/15'
                        : 'border border-transparent hover:bg-[var(--dash-bg-card-hover)]'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-sm flex-shrink-0`}
                    >
                      <span className="text-white font-bold text-xs">{initial}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--dash-text-primary)' }}
                      >
                        {account.name}
                        {account.propFirmSlug ? ` · ${account.propFirmSlug}` : ''}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <p className="text-[11px] truncate" style={{ color: 'var(--dash-text-muted)' }}>
                          {balanceLine}
                        </p>
                      </div>
                    </div>
                    {selectedTradingAccountId === account.id && (
                      <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-2" style={{ borderTop: '1px solid var(--dash-border)' }}>
                <Link
                  to="/dashboard/account/trading"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-accent text-sm font-medium hover:bg-accent/[0.06] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add account
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
