import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const icons = {
  overview: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  rules: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  journal: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3m4-1v6a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3.5a1.5 1.5 0 011.5 1.5V11a1 1 0 001 1h2z" />
    </svg>
  ),
  trades: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-6a2 2 0 012-2h6M9 17H7a2 2 0 01-2-2V7a2 2 0 012-2h6m-6 6h6m0 0v6m0-6h6" />
    </svg>
  ),
  extension: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  pairing: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 9h10M7 15h10" />
    </svg>
  ),
  tradingAccounts: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  billing: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  account: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
};

/** Primary workflow navigation with light grouping dividers. */
const NAV_ITEMS = [
  { to: '/dashboard/overview', end: true, label: 'Overview', iconKey: 'overview' },
  { to: '/dashboard/rules', end: false, label: 'Rules', iconKey: 'rules' },
  { to: '/dashboard/journal', end: false, label: 'Journal', iconKey: 'journal' },
  { to: '/dashboard/trades', end: false, label: 'Trades', iconKey: 'trades' },
  { to: '/dashboard/install-extension', end: false, label: 'Extension', iconKey: 'extension', dividerBefore: true },
  { to: '/dashboard/pairing', end: false, label: 'Pairing', iconKey: 'pairing' },
  { to: '/dashboard/account/trading', end: false, label: 'Trading Accounts', iconKey: 'tradingAccounts' },
  { to: '/dashboard/account/billing', end: false, label: 'Billing', iconKey: 'billing' },
];

function itemIsActive(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const initial = user?.name?.[0] || user?.email?.[0] || 'U';
  const displayName = user?.name || user?.email?.split('@')[0] || 'Trader';

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-[260px] flex-col overflow-hidden lg:flex">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1729] via-[#0a0f1e] to-[#060a16]" />
      <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-accent/[0.08] blur-[80px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-violet-500/[0.06] blur-[70px]" aria-hidden />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-accent/20 via-white/[0.06] to-violet-500/15" />

      <div className="relative shrink-0 px-4 pb-3 pt-6">
        <NavLink to="/dashboard/overview" className="group flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.06, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-emerald-400 to-teal-500 shadow-lg shadow-accent/30"
          >
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </motion.div>
          <div className="min-w-0">
            <span className="font-display text-[15px] font-bold leading-tight block text-white">
              TradeGuardX
            </span>
          </div>
        </NavLink>
      </div>

      <div className="relative mx-4 mb-2 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <nav className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pt-1 pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent]">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item, i) => {
            const active = itemIsActive(location.pathname, item);
            const icon = icons[item.iconKey];
            return (
              <div key={item.to}>
                {item.dividerBefore && (
                  <div className="my-2.5 mx-2 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
                )}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 + i * 0.025, duration: 0.22, ease: 'easeOut' }}
                >
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200"
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-bg"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/[0.15] via-accent/[0.08] to-transparent"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    {active && (
                      <motion.span
                        layoutId="sidebar-bar"
                        className="absolute -left-0.5 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-accent to-emerald-400"
                        style={{ boxShadow: '0 0 12px rgba(0,212,170,0.55), 0 0 4px rgba(0,212,170,0.25)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span
                      className={`relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                        active
                          ? 'bg-accent/25 text-accent shadow-sm shadow-accent/20'
                          : 'bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-white'
                      }`}
                    >
                      {icon}
                    </span>
                    <span
                      className={`relative z-[1] text-[13px] font-medium ${
                        active ? 'text-white' : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    {!active && (
                      <span className="absolute inset-0 rounded-xl bg-white/[0.02] opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </NavLink>
                </motion.div>
              </div>
            );
          })}
        </div>

      </nav>

      <div className="relative z-[1] shrink-0">
        <div className="mx-3 mb-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        <div className="px-3 py-3">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/[0.04]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 via-accent/30 to-emerald-500/30 text-sm font-bold text-white shadow-md shadow-accent/10 ring-2 ring-white/[0.08]">
              {initial.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <motion.svg
              animate={{ rotate: profileOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="h-4 w-4 shrink-0 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-1 pb-1 pt-1.5 space-y-1">
                  <NavLink
                    to="/dashboard/account"
                    end
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-200 transition-all hover:bg-white/[0.08]"
                  >
                    <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Account Center
                  </NavLink>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.08] py-2.5 text-sm font-medium text-red-300 transition-all hover:border-red-500/30 hover:bg-red-500/[0.14] hover:text-red-200"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
