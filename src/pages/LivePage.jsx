import { useState } from 'react';
import { motion } from 'framer-motion';
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
              className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent, #00d4aa)' : 'transparent',
                color: active ? 'var(--surface-950, #05221c)' : 'var(--dash-text-secondary)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {!tradingAccountId ? (
        <div className="rounded-2xl border px-5 py-8 text-center" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
            {accountsLoading ? 'Loading…' : accounts.length === 0 ? 'Add a trading account to see live activity' : 'Select an account in the header'}
          </p>
        </div>
      ) : tab === 'live' ? (
        <div>
          <ProtectionBanner accessToken={accessToken} account={selectedAccount} />
          <SessionHero accessToken={accessToken} tradingAccountId={tradingAccountId} account={selectedAccount} />
          <OpenPositions accessToken={accessToken} tradingAccountId={tradingAccountId} />
          <RuleStatusCards accessToken={accessToken} tradingAccountId={tradingAccountId} account={selectedAccount} />
        </div>
      ) : (
        <ActivityFeed accessToken={accessToken} tradingAccountId={tradingAccountId} />
      )}
    </motion.div>
  );
}
