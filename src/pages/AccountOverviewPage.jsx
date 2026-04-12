import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import SparkleOverlay from '../components/common/SparkleOverlay';
import {
  journalPeriodBadgeLabel,
  maxTradingAccountsForPlan,
  planTierFromSlug,
} from '../lib/planLimits';
import { CONFIGURABLE_RULES } from '../lib/ruleCatalogDisplay';
import { staggerContainer, staggerItem } from '../components/dashboard/dashboardMotion';

function ruleTierBadge(rule) {
  if (rule.tiers === 'all') return 'All plans';
  return 'Pro · Pro+';
}

export default function AccountOverviewPage() {
  const { user, subscriptionLoading } = useAuth();
  const { accounts, accountsLoading, accountsError } = useTradingAccounts();

  const cap = maxTradingAccountsForPlan(user?.plan);
  const accountCount = accountsLoading ? null : accounts.length;
  const loadError = accountsError;
  const capLabel = cap != null ? `${accountCount ?? '—'} / ${cap}` : `${accountCount ?? '—'}`;
  const tier = planTierFromSlug(user?.plan);

  const tierIncludes = useMemo(() => {
    if (tier === 'proplus') {
      return [
        'Unlimited trading accounts',
        'All trade history in Journal & Trades',
        'All available rule templates',
        'Priority access to future advanced tools',
      ];
    }
    if (tier === 'pro') {
      return [
        'Up to 5 trading accounts',
        'Last 90 days of trade history',
        'Extended rule templates vs Free',
        'Designed for active multi-account traders',
      ];
    }
    return [
      '1 trading account',
      'Last 7 days of trade history',
      'Core protection and risk rule setup',
      'Upgrade anytime from Billing',
    ];
  }, [tier]);

  const tierBadgeClass =
    tier === 'proplus'
      ? 'border-purple-500/35 bg-purple-500/10 text-purple-300'
      : tier === 'pro'
        ? 'border-accent/35 bg-accent/10 text-accent'
        : 'border-slate-500/35 bg-slate-500/10 text-slate-300';

  const cards = useMemo(
    () => [
    {
      title: 'Plan & billing',
      body: subscriptionLoading ? 'Loading…' : (user?.planLabel || 'Free'),
      sub: 'Subscription and payment method',
      to: '/dashboard/account/billing',
      cta: 'Manage billing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      gradient: 'from-violet-500/20 to-purple-500/10',
      iconColor: 'text-violet-400',
    },
    {
      title: 'Trading accounts',
      body: loadError ? '—' : capLabel,
      sub: cap != null ? 'Accounts used vs plan limit' : 'Unlimited on your plan',
      to: '/dashboard/account/trading',
      cta: 'Manage accounts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      ),
      gradient: 'from-accent/20 to-emerald-500/10',
      iconColor: 'text-accent',
    },
    {
      title: 'Trade history window',
      body: journalPeriodBadgeLabel(user?.plan),
      sub: 'Journal & synced trades respect this range',
      to: '/dashboard/trades',
      cta: 'View trades',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-blue-500/20 to-cyan-500/10',
      iconColor: 'text-blue-400',
    },
  ],
    [capLabel, loadError, subscriptionLoading, user?.plan, user?.planLabel],
  );

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div
        variants={staggerItem}
        className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
        style={{
          borderColor: 'var(--dash-border)',
          backgroundColor: 'var(--dash-bg-raised)',
          boxShadow: 'var(--dash-shadow-card)',
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent/[0.09] blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-violet-500/[0.08] blur-3xl" />
        <SparkleOverlay active={!subscriptionLoading} density={20} className="z-[2]" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-faint)' }}>
              Current tier
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold" style={{ color: 'var(--dash-text-primary)' }}>
              {subscriptionLoading ? 'Loading…' : (user?.planLabel || 'Free')}
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
              Here is what your current plan includes right now.
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tierBadgeClass}`}>
            {tier === 'proplus' ? 'Pro+' : tier === 'pro' ? 'Pro' : 'Free'}
          </span>
        </div>

        <div className="relative z-10 mt-5 grid gap-2 sm:grid-cols-2">
          {tierIncludes.map((item) => (
            <div
              key={item}
              className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <p className="text-sm leading-snug" style={{ color: 'var(--dash-text-secondary)' }}>{item}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-5 flex flex-wrap gap-2.5">
          <Link
            to="/dashboard/account/billing"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-hover"
          >
            Plan details
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
          >
            Compare plans
          </Link>
        </div>

        <details
          className="relative z-10 mt-6 rounded-xl border px-4 py-3 open:[&_summary_svg]:rotate-180"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold outline-none [&::-webkit-details-marker]:hidden"
            style={{ color: 'var(--dash-text-primary)' }}
          >
            Rules you can configure
            <svg
              className="h-4 w-4 shrink-0 opacity-60 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
            Toggle each rule in the Rules terminal for the selected trading account. Availability depends on your plan.
          </p>
          <ul className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: 'var(--dash-border)' }}>
            {CONFIGURABLE_RULES.map((r) => (
              <li key={r.slug}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--dash-text-primary)' }}>{r.name}</span>
                  <span
                    className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}
                  >
                    {ruleTierBadge(r)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                  {r.description}
                </p>
              </li>
            ))}
          </ul>
        </details>
      </motion.div>

      {loadError && (
        <p className="text-sm text-amber-400/90">{loadError}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <motion.div key={c.title} variants={staggerItem}>
            <Link
              to={c.to}
              className="group block h-full rounded-2xl border p-5 transition-all duration-300 hover:border-accent/25"
              style={{
                borderColor: 'var(--dash-border)',
                backgroundColor: 'var(--dash-bg-raised)',
                boxShadow: 'var(--dash-shadow-card)',
              }}
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} ${c.iconColor} shadow-sm transition-transform group-hover:scale-105`}>
                {c.icon}
              </div>
              <h2 className="font-display text-sm font-semibold mb-1" style={{ color: 'var(--dash-text-primary)' }}>
                {c.title}
              </h2>
              <p className="text-lg font-display font-bold mb-1" style={{ color: 'var(--dash-text-primary)' }}>
                {c.body}
              </p>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
                {c.sub}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:gap-2 transition-all">
                {c.cta}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={staggerItem}
        className="rounded-2xl border p-5 sm:p-6"
        style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
      >
        <h3 className="font-display text-sm font-semibold mb-2" style={{ color: 'var(--dash-text-secondary)' }}>
          Profile
        </h3>
        <p className="text-sm mb-1" style={{ color: 'var(--dash-text-muted)' }}>
          Signed in as{' '}
          <span className="font-medium" style={{ color: 'var(--dash-text-primary)' }}>{user?.email || '—'}</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--dash-text-faint)' }}>
          Password and email changes use your provider (Supabase) settings when we expose them here.
        </p>
      </motion.div>
    </motion.div>
  );
}
