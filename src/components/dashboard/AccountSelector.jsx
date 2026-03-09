import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_ACCOUNTS = [
  { id: '1', name: 'Prop Firm — FTMO', balance: '$100,000', platform: 'FTMO' },
  { id: '2', name: 'Personal — IC Markets', balance: '$25,000', platform: 'IC Markets' },
];

export default function AccountSelector() {
  const [selected, setSelected] = useState(MOCK_ACCOUNTS[0]);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-600/50 hover:border-surface-500/50 transition-colors min-w-[220px]"
      >
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <span className="text-accent font-bold text-sm">A</span>
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{selected.name}</p>
          <p className="text-slate-500 text-xs">{selected.balance}</p>
        </div>
        <svg className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 mt-2 w-full rounded-xl border border-surface-700/50 bg-surface-900 shadow-xl z-20 overflow-hidden"
            >
              {MOCK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => { setSelected(acc); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-800/80 transition-colors ${
                    selected.id === acc.id ? 'bg-surface-800/80' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-accent font-bold text-sm">{acc.platform[0]}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{acc.name}</p>
                    <p className="text-slate-500 text-xs">{acc.balance}</p>
                  </div>
                </button>
              ))}
              <div className="border-t border-surface-700/50 p-2">
                <button type="button" className="w-full py-2 rounded-lg text-accent text-sm font-medium hover:bg-surface-800/80">
                  + Add account
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
