import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { TradingAccountProvider } from '../../context/TradingAccountContext';
import { DashboardThemeProvider, useDashboardTheme } from '../../context/DashboardThemeContext';
import DashboardSidebar from './DashboardSidebar';
import AccountSelector from './AccountSelector';
import HeaderStatusPill from './HeaderStatusPill';
import { TrialBanner, UpgradeWall } from './TrialGate';
import WelcomeCelebration from './WelcomeCelebration';
import BreachBanner from './BreachBanner';

const ROUTE_LABELS = {
  '/dashboard/overview': 'Overview',
  '/dashboard/rules': 'Rules Terminal',
  '/dashboard/journal': 'AI Journal',
  '/dashboard/trades': 'All Trades',
  '/dashboard/install-extension': 'Install Extension',
  '/dashboard/pairing': 'Extension Pairing',
  '/dashboard/account/trading': 'Trading Accounts',
  '/dashboard/account/billing': 'Billing',
  '/dashboard/account': 'Account',
};

function usePageLabel() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/dashboard/trades/')) return 'Trade Detail';
  return ROUTE_LABELS[pathname] || null;
}

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
  // Pairing (browser extension) is the prop-firm path — hidden for the crypto
  // launch, which enforces server-side via the exchange API key. See DashboardSidebar.
  { to: '/dashboard/account/trading', end: false, label: 'Accounts', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
  )},
  { to: '/dashboard/account/billing', end: false, label: 'Billing', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
  )},
  { to: '/dashboard/account', end: true, label: 'Account', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
  )},
  { to: '/help', end: false, label: 'Guide', newTab: true, groupLabel: 'Resources', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
  )},
];

/**
 * Mobile navigation — a conventional slide-in drawer.
 *
 * Replaces an inline dropdown that laid the links out as a 2-column grid of
 * bordered buttons; at phone width that read as a gallery of cards rather than a
 * nav, and it pushed the page content down instead of overlaying it. This is the
 * pattern people already know: tap the hamburger, a panel slides in from the
 * left over a dimmed backdrop, tap a link or the backdrop to dismiss.
 */
function MobileNavDrawer({ open, onClose, user, onSignOut }) {
  const { pathname } = useLocation();

  // Close on route change — otherwise the drawer stays open over the page you
  // just navigated to.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape to close, and lock body scroll so the page behind doesn't scroll
  // under the drawer (the classic mobile-drawer bug).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const initial = user?.name?.[0] || user?.email?.[0] || 'U';
  const isTrial = Boolean(user?.isTrial);
  const planLabel = isTrial
    ? user?.trialDaysLeft != null
      ? `Trial · ${user.trialDaysLeft}d left`
      : 'Free trial'
    : user?.planLabel || 'Free';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Dimmed backdrop — tap anywhere to dismiss. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--dash-bg-header)', borderRight: '1px solid var(--dash-border)' }}
            role="dialog"
            aria-label="Navigation"
          >
            {/* Brand + plan */}
            <div className="flex items-center justify-between gap-3 px-4 py-4" style={{ borderBottom: '1px solid var(--dash-border)' }}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-emerald-400 to-teal-500">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold leading-tight" style={{ color: 'var(--dash-text-primary)' }}>TradeGuardX</p>
                  <span
                    className="mt-0.5 inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                    style={
                      isTrial
                        ? { borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.12)', color: '#fbbf24' }
                        : { borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-muted)' }
                    }
                  >
                    {planLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--dash-bg-card-hover)]"
                style={{ color: 'var(--dash-text-muted)' }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Links — a vertical list, like every mobile nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {mobileNavItems.map((item) => (
                <div key={item.to}>
                  {item.groupLabel && (
                    <p
                      className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--dash-text-faint)' }}
                    >
                      {item.groupLabel}
                    </p>
                  )}
                  <NavLink
                    to={item.to}
                    end={item.end}
                    target={item.newTab ? '_blank' : undefined}
                    rel={item.newTab ? 'noopener noreferrer' : undefined}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                        isActive ? 'bg-accent/10 text-accent' : 'hover:bg-[var(--dash-bg-card-hover)]'
                      }`
                    }
                    style={({ isActive }) => (isActive ? {} : { color: 'var(--dash-text-secondary)' })}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </div>
              ))}
            </nav>

            {/* User + sign out, pinned to the bottom */}
            <div className="px-3 py-3" style={{ borderTop: '1px solid var(--dash-border)' }}>
              <div className="mb-2 flex items-center gap-3 px-1">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase"
                  style={{ backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-secondary)', border: '1px solid var(--dash-border)' }}
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                    {user?.name || 'Trader'}
                  </p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); onSignOut(); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

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
  const { logout, user } = useAuth();
  const { theme, isDark } = useDashboardTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageLabel = usePageLabel();
  const { pathname } = useLocation();
  const mainRef = useRef(null);

  // Trial lapsed → lock the app behind an upgrade wall, but keep the billing/
  // account area reachable so they can actually upgrade.
  const billingArea = pathname.includes('/account') || pathname.includes('/billing');
  const locked = Boolean(user?.isExpired) && !billingArea;

  // Clear any inline body padding inherited from the prerendered home page
  // HTML (Vercel serves dist/index.html as the SPA fallback for /dashboard,
  // and that HTML may have body.padding-top set by ActivePromo at prerender
  // time). Without this, OAuth-arrived dashboard sessions get pushed down by
  // ~89px of phantom padding because ActivePromo never mounts on /dashboard
  // routes to run its own cleanup.
  useEffect(() => {
    document.body.style.paddingTop = '';
    document.documentElement.style.removeProperty('--tg-promo-h');
  }, []);

  // The dashboard's <main> element is the actual scroll container (window
  // doesn't scroll because the layout is min-h-screen overflow-hidden).
  // Global ScrollToTop only scrolls window — reset main on tab change here.
  //
  // Double rAF: the OAuth boot path renders dashboard inside a DOM the
  // browser just swapped out from the prerendered home-page fallback, plus
  // AuthContext re-renders during session bootstrap. Single rAF can fire
  // before the layout has fully settled. Scheduling across two paint frames
  // lands the scroll after the DOM swap, the auth re-render, and the route
  // content's first paint.
  useEffect(() => {
    let inner;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        mainRef.current?.scrollTo({ top: 0, left: 0 });
        window.scrollTo(0, 0);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [pathname]);

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
                {pageLabel && (
                  <>
                    <span className="hidden h-5 w-px lg:block" style={{ backgroundColor: 'var(--dash-border)' }} />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={pageLabel}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: 0.18 }}
                        className="hidden text-sm font-semibold lg:block"
                        style={{ color: 'var(--dash-text-secondary)' }}
                      >
                        {pageLabel}
                      </motion.span>
                    </AnimatePresence>
                  </>
                )}
              </div>

              <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                <HeaderStatusPill />
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

        </header>

        {/* Mobile nav — a standard slide-in drawer (mirrors the desktop sidebar),
            not the old inline 2-column grid of buttons, which read as a card
            gallery rather than navigation. */}
        <MobileNavDrawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          user={user}
          onSignOut={logout}
        />

        {/* Content */}
        <main ref={mainRef} className="relative flex-1 overflow-auto">
          <div className="dash-content-grid" aria-hidden />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[min(28vh,240px)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,212,170,0.04),transparent)]"
            aria-hidden
          />
          <div className="relative z-[2] mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <BreachBanner />
            <TrialBanner />
            {locked ? <UpgradeWall /> : <Outlet />}
          </div>
        </main>
      </div>

      {/* One-shot celebration when ?welcome=1 is in the URL (set by SignupPage). */}
      <WelcomeCelebration />
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
