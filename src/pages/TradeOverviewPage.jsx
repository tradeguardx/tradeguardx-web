import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import {
  journalPeriodBadgeLabel,
  maxTradingAccountsForPlan,
} from '../lib/planLimits';
import { SkeletonBlock } from '../components/common/LoadingSkeleton';
import DashboardPageBanner from '../components/dashboard/DashboardPageBanner';
import { staggerContainer, staggerItem } from '../components/dashboard/dashboardMotion';

export default function TradeOverviewPage() {
  const { user, subscriptionLoading } = useAuth();
  const { accounts, accountsLoading } = useTradingAccounts();

  const cap = maxTradingAccountsForPlan(user?.plan);
  const accountCount = accountsLoading ? null : accounts.length;
  const accountsLabel = accountCount == null ? '—' : (cap != null ? `${accountCount} / ${cap}` : `${accountCount}`);
  const overviewStatsLoading = subscriptionLoading || accountsLoading;

  const summaryStats = useMemo(
    () => [
      {
        label: 'Current plan',
        value: subscriptionLoading ? '…' : (user?.planLabel || 'Free'),
        sub: 'Subscription tier',
        gradient: 'from-violet-500/20 to-purple-600/5',
        iconColor: 'text-violet-400',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        ),
      },
      {
        label: 'Trading accounts',
        value: accountsLabel,
        sub: cap != null ? 'Used vs plan limit' : 'Unlimited on plan',
        gradient: 'from-accent/20 to-emerald-600/5',
        iconColor: 'text-accent',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        ),
      },
      {
        label: 'Trade history',
        value: journalPeriodBadgeLabel(user?.plan),
        sub: 'Journal & All Trades window',
        gradient: 'from-blue-500/20 to-cyan-600/5',
        iconColor: 'text-blue-400',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        label: 'Extension',
        value: 'Connect',
        sub: 'Pair & sync trades',
        gradient: 'from-amber-500/20 to-orange-600/5',
        iconColor: 'text-amber-400',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        ),
        href: '/dashboard/install-extension',
      },
    ],
    [user?.plan, user?.planLabel, subscriptionLoading, accountsLabel, cap],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl"
    >
      <DashboardPageBanner
        accent="emerald"
        title="Dashboard"
        subtitle="Your plan, accounts, and shortcuts. Configure rules per trading account in Rules Terminal — evaluation runs in the browser extension."
        badge={(
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent shadow-sm shadow-accent/10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {subscriptionLoading ? 'Loading plan…' : (user?.planLabel || 'Free')}
          </span>
        )}
      />

      {overviewStatsLoading ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-[132px] w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {summaryStats.map((stat) => {
            const inner = (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>{stat.label}</p>
                  <div className={`relative z-[1] flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.iconColor} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                    {stat.icon}
                  </div>
                </div>
                <p className="relative z-[1] text-xl sm:text-2xl font-display font-bold line-clamp-2" style={{ color: 'var(--dash-text-primary)' }}>
                  {stat.value}
                </p>
                <p className="relative z-[1] mt-1 text-xs" style={{ color: 'var(--dash-text-faint)' }}>{stat.sub}</p>
              </>
            );
            const className = 'group relative block overflow-hidden rounded-2xl border p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-accent/5';
            const style = {
              borderColor: 'var(--dash-border)',
              backgroundColor: 'var(--dash-bg-raised)',
              boxShadow: 'var(--dash-shadow-card)',
            };
            return (
              <motion.div key={stat.label} variants={staggerItem} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}>
                {stat.href ? (
                  <Link to={stat.href} className={className} style={style}>
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-accent/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    {inner}
                  </Link>
                ) : (
                  <div className={className} style={style}>
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-accent/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    {inner}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.45 }}
        className="relative mb-8 overflow-hidden rounded-2xl border p-5 transition-colors duration-300 sm:p-6"
        style={{
          borderColor: 'var(--dash-border)',
          backgroundColor: 'var(--dash-bg-raised)',
          boxShadow: 'var(--dash-shadow-card)',
        }}
      >
        <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-accent/[0.06] blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="font-display text-sm font-semibold sm:text-base" style={{ color: 'var(--dash-text-secondary)' }}>Rules &amp; protection</h2>
        </div>
        <p className="relative text-sm leading-relaxed max-w-2xl mb-4" style={{ color: 'var(--dash-text-muted)' }}>
          Rules are stored per trading account. Install the extension, pair it with an account code, and evaluation runs on the platform — the web app is your control center.
        </p>
        <Link
          to="/dashboard/rules"
          className="relative inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent/30"
          style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-primary)' }}
        >
          Open Rules Terminal
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <Link
          to="/dashboard/install-extension"
          className="group inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-accent"
          style={{ color: 'var(--dash-text-faint)' }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Extension install &amp; pairing
          <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </motion.div>
    </motion.div>
  );
}
