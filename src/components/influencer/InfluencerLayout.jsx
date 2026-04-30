import { useEffect, useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { DashboardThemeProvider, useDashboardTheme } from '../../context/DashboardThemeContext';
import { getInfluencerMe } from '../../api/influencerApi';
import { ApiError } from '../../api/httpClient';
import AppLoader from '../common/AppLoader';

const navItems = [
  {
    to: '/influencer/overview',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    to: '/influencer/commissions',
    label: 'Commissions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/influencer/payouts',
    label: 'Payouts',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

function ThemeToggle() {
  const { isDark, toggleTheme } = useDashboardTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative p-2 rounded-xl transition-all hover:bg-[var(--dash-bg-card-hover)]"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ color: 'var(--dash-text-muted)' }}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isDark ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        )}
      </svg>
    </button>
  );
}

function InfluencerSidebar({ profile, onLogout }) {
  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[260px] flex-col border-r"
      style={{
        backgroundColor: 'var(--dash-bg-sidebar)',
        borderColor: 'var(--dash-border)',
      }}
    >
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--dash-border)' }}>
        <NavLink to="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-bold" style={{ color: 'var(--dash-text)' }}>
            TradeGuard<span className="text-accent">X</span>
          </span>
        </NavLink>
        <div className="mt-1 text-xs uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
          Influencer Portal
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/15'
                  : 'border border-transparent hover:bg-[var(--dash-bg-card-hover)]'
              }`
            }
            style={({ isActive }) =>
              isActive ? {} : { color: 'var(--dash-text-muted)' }
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t px-4 py-4 space-y-2" style={{ borderColor: 'var(--dash-border)' }}>
        <div className="px-2 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
          Signed in as
        </div>
        <div className="px-2 text-sm font-medium truncate" style={{ color: 'var(--dash-text)' }}>
          {profile?.couponCode ? `Code: ${profile.couponCode}` : 'Loading...'}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

function InfluencerInner() {
  const { session, logout } = useAuth();
  const { theme, isDark } = useDashboardTheme();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.access_token) return;
      setLoading(true);
      try {
        const res = await getInfluencerMe({ accessToken: session.access_token });
        if (!cancelled) {
          setProfile(res?.data ?? res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  if (loading) return <AppLoader />;

  // 403 = authenticated but not an influencer → punt to dashboard
  if (error instanceof ApiError && error.status === 403) {
    return <Navigate to="/dashboard" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--dash-bg)' }}>
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--dash-text)' }}>
            Something went wrong
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--dash-text-muted)' }}>
            {error.message || 'Could not load your influencer profile.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(0)}
            className="px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-sm font-medium hover:bg-accent/20 transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-dash-theme={theme}
      className="flex min-h-screen relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--dash-bg)' }}
    >
      {isDark && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,212,170,0.06),transparent)]" />
      )}

      <InfluencerSidebar profile={profile} onLogout={logout} />

      <div className="relative flex min-w-0 flex-1 flex-col lg:ml-[260px]">
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
                <span className="text-base font-semibold" style={{ color: 'var(--dash-text)' }}>
                  Influencer Portal
                </span>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                <ThemeToggle />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden overflow-hidden backdrop-blur-xl"
                style={{ borderBottom: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-bg-header)' }}
              >
                <div className="grid grid-cols-3 gap-2 px-4 py-3">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive ? 'bg-accent/10 text-accent border border-accent/15' : 'border hover:bg-[var(--dash-bg-card-hover)]'
                        }`
                      }
                      style={({ isActive }) =>
                        isActive ? {} : { color: 'var(--dash-text-muted)', borderColor: 'var(--dash-border)' }
                      }
                    >
                      {item.icon}
                      <span className="hidden sm:inline">{item.label}</span>
                    </NavLink>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="col-span-3 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
                  >
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="relative flex-1 overflow-auto">
          <div className="dash-content-grid" aria-hidden />
          <div className="relative px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Outlet context={{ profile }} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function InfluencerLayout() {
  return (
    <DashboardThemeProvider>
      <InfluencerInner />
    </DashboardThemeProvider>
  );
}
