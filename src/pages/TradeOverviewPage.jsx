import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import {
  journalPeriodBadgeLabel,
  maxTradingAccountsForPlan,
  planTierFromSlug,
} from '../lib/planLimits';
import { ShimmerBlock, StatCardSkeleton } from '../components/common/LoadingSkeleton';
import DashboardPageBanner from '../components/dashboard/DashboardPageBanner';
import { staggerContainer, staggerItem } from '../components/dashboard/dashboardMotion';

/* ─── Protection Status Hero ───────────────────────────────────────── */
function ProtectionStatus({ accounts, accountsLoading }) {
  const navigate = useNavigate();

  if (accountsLoading) {
    return <ShimmerBlock className="h-[116px] w-full rounded-2xl mb-6" />;
  }

  const hasAccounts = accounts.length > 0;
  const firstAccount = accounts[0];

  if (!hasAccounts) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="dash-status-warn relative mb-6 overflow-hidden rounded-2xl p-5"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/[0.06] blur-3xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="dash-icon-amber flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="font-display text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>No trading account yet</p>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--dash-text-muted)' }}>Create an account to start configuring protection rules.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/account/trading')}
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-600 transition hover:bg-amber-500/25 dark:text-amber-300"
          >
            Create account
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="dash-status-active relative mb-6 overflow-hidden rounded-2xl"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-500/[0.05] blur-3xl" />

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="dash-icon-accent relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
            <motion.div
              className="absolute inset-0 rounded-xl border border-accent/30"
              animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>Protection configured</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                ACTIVE
              </span>
            </div>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--dash-text-primary)' }}>{accounts.length} trading account{accounts.length > 1 ? 's' : ''}</span>
              {' '}configured · Enforced in-browser via the extension
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {accounts.slice(0, 3).map((acc) => (
            <Link
              key={acc.id}
              to="/dashboard/rules"
              className="dash-account-chip inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
            >
              <span className="h-2 w-2 rounded-full bg-accent/60" />
              {acc.name || firstAccount?.propFirm || 'Account'}
            </Link>
          ))}
          {accounts.length > 3 && (
            <span className="text-xs" style={{ color: 'var(--dash-text-faint)' }}>+{accounts.length - 3} more</span>
          )}
          <Link
            to="/dashboard/pairing"
            className="dash-account-chip inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Manage pairing
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Stat card ─────────────────────────────────────────────────────── */
function StatCard({ stat, loading }) {
  if (loading) return <StatCardSkeleton />;

  const inner = (
    <>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-current/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
          {stat.label}
        </p>
        <div className={`${stat.iconClass} flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110`}>
          {stat.icon}
        </div>
      </div>
      <p className="relative mt-2.5 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--dash-text-primary)' }}>
        {stat.value}
      </p>
      {stat.progress != null && (
        <div className="relative mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(stat.progress * 100, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full ${stat.progress >= 1 ? 'bg-red-400' : 'bg-gradient-to-r from-accent to-emerald-400'}`}
            />
          </div>
        </div>
      )}
      <p className="relative mt-1.5 text-xs" style={{ color: 'var(--dash-text-faint)' }}>{stat.sub}</p>
    </>
  );

  const cls = 'dash-card-elevated group relative block overflow-hidden rounded-2xl p-4 transition-all duration-300';
  const style = {};

  return (
    <motion.div variants={staggerItem} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 22 } }}>
      {stat.href ? (
        <Link to={stat.href} className={cls} style={style}>{inner}</Link>
      ) : (
        <div className={cls} style={style}>{inner}</div>
      )}
    </motion.div>
  );
}

/* ─── Quick action card ─────────────────────────────────────────────── */
function QuickAction({ to, icon, label, description, iconClass, badge }) {
  return (
    <Link
      to={to}
      className="dash-quick-action group relative flex items-start gap-4 overflow-hidden rounded-2xl p-4"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-accent/[0.04] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className={`${iconClass} relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105`}>
        {icon}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>{label}</p>
          {badge && (
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">{badge}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>{description}</p>
      </div>
      <svg className="relative h-4 w-4 flex-shrink-0 self-center text-slate-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────── */
export default function TradeOverviewPage() {
  const { user, subscriptionLoading } = useAuth();
  const { accounts, accountsLoading } = useTradingAccounts();

  const tier = planTierFromSlug(user?.plan);
  const cap = maxTradingAccountsForPlan(user?.plan);
  const accountCount = accountsLoading ? null : accounts.length;
  const accountsLabel = accountCount == null ? '—' : cap != null ? `${accountCount} / ${cap}` : `${accountCount}`;
  const accountProgress = cap != null && accountCount != null ? accountCount / cap : null;
  const loading = subscriptionLoading || accountsLoading;

  const stats = useMemo(() => [
    {
      label: 'Plan',
      value: subscriptionLoading ? '…' : (user?.planLabel || 'Free'),
      sub: tier === 'free' ? 'Upgrade for more accounts & history' : 'Active subscription',
      iconClass: 'dash-icon-violet',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
      href: tier !== 'proplus' ? '/pricing' : undefined,
    },
    {
      label: 'Trading accounts',
      value: accountsLoading ? '…' : accountsLabel,
      sub: cap != null ? `${cap - (accountCount ?? 0)} slot${cap - (accountCount ?? 0) !== 1 ? 's' : ''} remaining` : 'Unlimited on Pro+',
      iconClass: 'dash-icon-accent',
      progress: accountProgress,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      ),
      href: '/dashboard/account/trading',
    },
    {
      label: 'Trade history',
      value: journalPeriodBadgeLabel(user?.plan),
      sub: 'Journal & All Trades window',
      iconClass: 'dash-icon-blue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: '/dashboard/journal',
    },
    {
      label: 'Extension',
      value: 'Set up',
      sub: 'Install, pair & protect',
      iconClass: 'dash-icon-amber',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      href: '/dashboard/install-extension',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [user?.plan, user?.planLabel, subscriptionLoading, accountsLabel, cap, accountCount, accountProgress, tier, accountsLoading]);

  const quickActions = [
    {
      to: '/dashboard/rules',
      label: 'Rules Terminal',
      description: 'Configure daily loss, drawdown, hedging, and position rules per account.',
      iconClass: 'dash-icon-accent',
      badge: 'Core',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      to: '/dashboard/journal',
      label: 'AI Trade Journal',
      description: 'Review AI-generated narratives, behavior patterns, and trade insights.',
      iconClass: 'dash-icon-purple',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.42 2.674L5.16 18.245c-1.45-.124-2.107-1.867-1.107-2.867l1.407-1.407" />
        </svg>
      ),
    },
    {
      to: '/dashboard/trades',
      label: 'All Trades',
      description: 'Browse every synced trade with event badges, P&L, and replay access.',
      iconClass: 'dash-icon-blue',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      to: '/dashboard/pairing',
      label: 'Pair Extension',
      description: 'Link your browser extension to a trading account using a one-time code.',
      iconClass: 'dash-icon-emerald',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
    },
  ];

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
        subtitle="Your control center — configure rules, review trades, and monitor protection status."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {subscriptionLoading ? 'Loading…' : (user?.planLabel || 'Free')}
          </span>
        }
        actions={
          tier !== 'proplus' ? (
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
            >
              Upgrade
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          ) : null
        }
      />

      {/* Protection status hero */}
      <ProtectionStatus accounts={accounts} accountsLoading={accountsLoading} />

      {/* Stat cards */}
      {loading ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} loading={false} />
          ))}
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4 }}
        className="mb-6"
      >
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--dash-text-faint)' }}>
          Quick access
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <QuickAction key={action.to} {...action} />
          ))}
        </div>
      </motion.div>

      {/* Setup checklist for new users */}
      {!accountsLoading && accounts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
        >
          <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--dash-text-secondary)' }}>
            Get started in 3 steps
          </p>
          <div className="flex flex-col gap-3">
            {[
              { num: '1', label: 'Create a trading account', href: '/dashboard/account/trading', done: false },
              { num: '2', label: 'Install the Chrome extension', href: '/dashboard/install-extension', done: false },
              { num: '3', label: 'Pair & configure rules', href: '/dashboard/pairing', done: false },
            ].map((step) => (
              <Link
                key={step.num}
                to={step.href}
                className="group flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors hover:border-accent/20 hover:bg-accent/[0.03]"
                style={{ borderColor: 'var(--dash-border)' }}
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-xs font-bold" style={{ color: 'var(--dash-text-muted)' }}>
                  {step.num}
                </span>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--dash-text-secondary)' }}>{step.label}</span>
                <svg className="h-4 w-4 flex-shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
