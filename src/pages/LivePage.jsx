import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import SessionHero from '../components/dashboard/SessionHero';
import OpenPositions from '../components/dashboard/OpenPositions';
import RuleStatusCards from '../components/dashboard/RuleStatusCards';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import ProtectionBanner from '../components/dashboard/ProtectionBanner';

const TABS = [
  { key: 'live', label: 'Live' },
  { key: 'activity', label: 'Activity' },
];

export default function LivePage() {
  const { session } = useAuth();
  const { accounts, accountsLoading, selectedAccount } = useTradingAccounts();
  const [tab, setTab] = useState('live');
  const reduce = useReducedMotion();

  const accessToken = session?.access_token;
  const tradingAccountId = selectedAccount?.id ?? null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-xl border p-1" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
              style={{ color: active ? 'var(--surface-950, #05221c)' : 'var(--dash-text-secondary)' }}
            >
              {active && (
                <motion.span
                  layoutId="live-tab-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: 'var(--accent, #00d4aa)' }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      {!tradingAccountId ? (
        <div className="rounded-2xl border px-5 py-10 text-center" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <span
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(0,212,170,0.10)', color: 'var(--accent, #00d4aa)' }}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </span>
          <p className="text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>
            {accountsLoading ? 'Loading your session…' : accounts.length === 0 ? 'No trading account yet' : 'Choose an account'}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
            {accountsLoading
              ? 'One moment.'
              : accounts.length === 0
                ? 'Add your exchange account to watch limits, positions and the kill switch in real time.'
                : 'Pick an account in the header to see its live session.'}
          </p>
          {!accountsLoading && accounts.length === 0 && (
            <Link
              to="/dashboard/account/trading"
              className="mt-5 inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
            >
              Add trading account
            </Link>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {tab === 'live' ? (
            <motion.div
              key="live"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProtectionBanner accessToken={accessToken} account={selectedAccount} />
              <SessionHero accessToken={accessToken} tradingAccountId={tradingAccountId} account={selectedAccount} />
              <OpenPositions accessToken={accessToken} tradingAccountId={tradingAccountId} />
              <RuleStatusCards accessToken={accessToken} tradingAccountId={tradingAccountId} account={selectedAccount} />
            </motion.div>
          ) : (
            <motion.div
              key="activity"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ActivityFeed accessToken={accessToken} tradingAccountId={tradingAccountId} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
