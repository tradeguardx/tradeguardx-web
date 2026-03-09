import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from './DashboardSidebar';
import AccountSelector from './AccountSelector';

const mobileNavItems = [
  { to: '/dashboard/overview', end: false, label: 'Trade Overview' },
  { to: '/dashboard/rules', end: false, label: 'Rules' },
  { to: '/dashboard/journal', end: false, label: 'Trade Journal' },
  { to: '/dashboard/trades', end: false, label: 'All Trades' },
  { to: '/dashboard/install-extension', end: false, label: 'Install Extension' },
];

export default function DashboardLayout() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <DashboardSidebar user={user} />
      <div className="flex-1 flex flex-col lg:ml-72 relative min-w-0">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-surface-950/80 backdrop-blur-xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <AccountSelector />
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="text-slate-500 text-sm hidden sm:block truncate max-w-[180px]">{user?.email}</span>
              <a href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
                Back to site
              </a>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
              {mobileNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-accent/20 text-accent' : 'text-slate-400 hover:text-white bg-surface-800/80'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
