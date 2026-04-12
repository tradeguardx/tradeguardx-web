import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { TradingAccountProvider } from '../../context/TradingAccountContext';
import { DashboardThemeProvider, useDashboardTheme } from '../../context/DashboardThemeContext';
import DashboardSidebar from './DashboardSidebar';
import AccountSelector from './AccountSelector';

const mobileNavItems = [
  { to: '/dashboard/overview', end: true, label: 'Overview', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" /></svg>
  )},
  { to: '/dashboard/rules', end: false, label: 'Rules', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
  )},
  { to: '/dashboard/journal', end: false, label: 'Journal', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3m4-1v6a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3.5a1.5 1.5 0 011.5 1.5V11a1 1 0 001 1h2z" /></svg>
  )},
  { to: '/dashboard/trades', end: false, label: 'Trades', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-6a2 2 0 012-2h6M9 17H7a2 2 0 01-2-2V7a2 2 0 012-2h6m-6 6h6m0 0v6m0-6h6" /></svg>
  )},
  { to: '/dashboard/install-extension', end: false, label: 'Extension', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
  )},
  { to: '/dashboard/pairing', end: false, label: 'Pairing', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 9h10M7 15h10" /></svg>
  )},
  { to: '/dashboard/account/trading', end: false, label: 'Accounts', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
  )},
  { to: '/dashboard/account/billing', end: false, label: 'Billing', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
  )},
  { to: '/dashboard/account', end: true, label: 'Account', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
  )},
];

function ThemeToggle() {
  const { isDark, toggleTheme } = useDashboardTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative p-2 rounded-xl transition-all hover:bg-[var(--dash-bg-card-hover)]"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.svg
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="h-5 w-5"
            style={{ color: 'var(--dash-text-muted)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </motion.svg>
        ) : (
          <motion.svg
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="h-5 w-5 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}

function DashboardInner() {
  const { logout } = useAuth();
  const { theme, isDark } = useDashboardTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      data-dash-theme={theme}
      className="flex min-h-screen relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--dash-bg)' }}
    >
      {/* Ambient background (dark only) */}
      {isDark && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,212,170,0.06),transparent)]" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.04),transparent)]" />
        </>
      )}
      {!isDark && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(0,212,170,0.04),transparent)]" />
      )}

      <DashboardSidebar />

      <div className="relative flex min-w-0 flex-1 flex-col lg:ml-[260px]">
        {/* Header */}
        <header
          className="sticky top-0 z-30 backdrop-blur-xl transition-colors duration-300"
          style={{
            backgroundColor: 'var(--dash-bg-header)',
            boxShadow: 'var(--dash-shadow-header)',
          }}
        >
          <div
            className="px-4 sm:px-6 lg:px-8 transition-colors duration-300"
            style={{ borderBottom: '1px solid var(--dash-border)' }}
          >
            <div className="flex items-center justify-between gap-4 h-16">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((o) => !o)}
                  className="lg:hidden p-2 rounded-xl transition-all hover:bg-[var(--dash-bg-card-hover)]"
                  style={{ color: 'var(--dash-text-muted)' }}
                  aria-label="Menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
                <AccountSelector />
              </div>

              <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                <ThemeToggle />

                <button
                  type="button"
                  className="relative p-2 rounded-xl transition-all hover:bg-[var(--dash-bg-card-hover)]"
                  style={{ color: 'var(--dash-text-muted)' }}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(0,212,170,0.6)]" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden overflow-hidden backdrop-blur-xl"
                style={{ borderBottom: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-bg-header)' }}
              >
                <div className="grid grid-cols-2 gap-2 px-4 py-3 sm:flex sm:flex-wrap">
                  {mobileNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive ? 'bg-accent/10 text-accent border border-accent/15' : 'border hover:bg-[var(--dash-bg-card-hover)]'
                        }`
                      }
                      style={({ isActive }) => isActive ? {} : { color: 'var(--dash-text-muted)', borderColor: 'var(--dash-border)' }}
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15 sm:col-span-1"
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
        </header>

        {/* Content */}
        <main className="relative flex-1 overflow-auto">
          <div className="dash-content-grid" aria-hidden />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[min(28vh,240px)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,212,170,0.04),transparent)]"
            aria-hidden
          />
          <div className="relative z-[2] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <DashboardThemeProvider>
      <TradingAccountProvider>
        <DashboardInner />
      </TradingAccountProvider>
    </DashboardThemeProvider>
  );
}
