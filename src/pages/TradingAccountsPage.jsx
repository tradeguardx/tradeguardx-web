import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useToast } from '../components/common/ToastProvider';
import DashboardPageBanner from '../components/dashboard/DashboardPageBanner';
import { staggerContainer, staggerItem } from '../components/dashboard/dashboardMotion';
import {
  createTradingAccount,
  patchTradingAccount,
} from '../api/tradingAccountsApi';
import { maxTradingAccountsForPlan } from '../lib/planLimits';

function AccountCard({ account, accessToken, onUpdated, toast }) {
  const [name, setName] = useState(account.name || '');
  const [propFirmSlug, setPropFirmSlug] = useState(account.propFirmSlug || '');
  const [platform, setPlatform] = useState(account.platform || '');
  const [accountSize, setAccountSize] = useState(
    account.accountSize != null && account.accountSize !== '' ? String(account.accountSize) : '',
  );
  const [accountCurrency, setAccountCurrency] = useState(account.accountCurrency || 'USD');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(account.name || '');
    setPropFirmSlug(account.propFirmSlug || '');
    setPlatform(account.platform || '');
    setAccountSize(
      account.accountSize != null && account.accountSize !== '' ? String(account.accountSize) : '',
    );
    setAccountCurrency(account.accountCurrency || 'USD');
  }, [account]);

  const save = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const sizeNum = accountSize.trim() === '' ? null : Number(accountSize);
      await patchTradingAccount({
        accessToken,
        accountId: account.id,
        name: name.trim(),
        propFirmSlug: propFirmSlug.trim() || null,
        platform: platform.trim() || null,
        accountSize: sizeNum != null && !Number.isNaN(sizeNum) ? sizeNum : null,
        accountCurrency: accountCurrency.trim() || 'USD',
      });
      toast.success('Saved', 'Trading account updated.');
      onUpdated?.();
    } catch (e) {
      toast.error('Save failed', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-2xl border overflow-hidden transition-colors duration-300"
      style={{
        borderColor: 'var(--dash-border)',
        backgroundColor: 'var(--dash-bg-raised)',
        boxShadow: 'var(--dash-shadow-card)',
      }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--dash-border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: 'var(--dash-text-primary)' }}>
              {account.name}
            </h3>
            <p className="text-xs mt-0.5 font-mono opacity-80" style={{ color: 'var(--dash-text-muted)' }}>
              {account.id}
            </p>
          </div>
          <Link
            to={`/dashboard/rules`}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Rules for this account →
          </Link>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
              Display name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
              style={{
                borderColor: 'var(--dash-border)',
                backgroundColor: 'var(--dash-bg-input)',
                color: 'var(--dash-text-primary)',
              }}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
              Prop firm (optional)
            </span>
            <input
              value={propFirmSlug}
              onChange={(e) => setPropFirmSlug(e.target.value)}
              placeholder="e.g. ftmo"
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
              style={{
                borderColor: 'var(--dash-border)',
                backgroundColor: 'var(--dash-bg-input)',
                color: 'var(--dash-text-primary)',
              }}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
              Platform (optional)
            </span>
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="e.g. MT5, web"
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
              style={{
                borderColor: 'var(--dash-border)',
                backgroundColor: 'var(--dash-bg-input)',
                color: 'var(--dash-text-primary)',
              }}
            />
          </label>
        </div>

        <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--dash-text-muted)' }}>
            Account size (for risk rules &amp; P&amp;L)
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex-1 min-w-[140px]">
              <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>Balance / equity</span>
              <input
                type="text"
                inputMode="decimal"
                value={accountSize}
                onChange={(e) => setAccountSize(e.target.value)}
                placeholder="e.g. 50000"
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-input)',
                  color: 'var(--dash-text-primary)',
                }}
              />
            </label>
            <label className="w-24">
              <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>Currency</span>
              <input
                value={accountCurrency}
                onChange={(e) => setAccountCurrency(e.target.value.toUpperCase())}
                maxLength={8}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-accent/40"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-input)',
                  color: 'var(--dash-text-primary)',
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--dash-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--dash-text-muted)' }}>
            Extension pairing
          </p>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
            Generate one-time pairing codes from the dedicated Pairing page for the account selected in the header.
          </p>
          <Link
            to="/dashboard/pairing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
          >
            Open Pairing
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function TradingAccountsPage() {
  const { session, user } = useAuth();
  const toast = useToast();
  const { accounts, accountsLoading, accountsError, refreshTradingAccounts } = useTradingAccounts();
  const [creating, setCreating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProp, setNewProp] = useState('');
  const [newPlat, setNewPlat] = useState('');

  const accountCap = maxTradingAccountsForPlan(user?.plan);
  const atAccountLimit = accountCap != null && accounts.length >= accountCap;

  const loading = accountsLoading;
  const error = accountsError;

  useEffect(() => {
    if (atAccountLimit) setShowAdd(false);
  }, [atAccountLimit]);

  const addAccount = async () => {
    const token = session?.access_token;
    if (!token || !newName.trim()) {
      toast.error('Name required', 'Enter a name for this account.');
      return;
    }
    setCreating(true);
    try {
      await createTradingAccount({
        accessToken: token,
        name: newName.trim(),
        propFirmSlug: newProp.trim() || undefined,
        platform: newPlat.trim() || undefined,
      });
      toast.success('Account created', 'You can configure rules and connect the extension.');
      setNewName('');
      setNewProp('');
      setNewPlat('');
      setShowAdd(false);
      await refreshTradingAccounts();
    } catch (e) {
      toast.error('Could not create', e?.message || 'Try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl"
    >
      <DashboardPageBanner
        accent="accent"
        title="Trading accounts"
        subtitle="Each account is a separate prop or platform context. Rules, account size, and synced trades are scoped per account. Connect the extension with a pairing code."
        badge={(
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            {loading
              ? '…'
              : accountCap != null
                ? `${accounts.length} / ${accountCap} accounts`
                : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
          </span>
        )}
        actions={(
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              to="/dashboard/account"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent/25"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
            >
              Account home
            </Link>
            <Link
              to="/dashboard/install-extension"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent/25"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
            >
              Extension setup
            </Link>
            <Link
              to="/dashboard/pairing"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent/25"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
            >
              Pairing
            </Link>
          </div>
        )}
      />

      {error && (
        <p className="mb-4 text-sm text-amber-400/90">{error}</p>
      )}

      <div className="mb-6">
        {atAccountLimit ? (
          <p className="text-sm rounded-xl border px-4 py-3" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>
            You&apos;ve reached your plan limit ({accountCap} trading account{accountCap === 1 ? '' : 's'}).{' '}
            <Link to="/pricing" className="font-semibold text-accent hover:underline">
              View plans
            </Link>
            {' '}to add more.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:border-accent/30"
            style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-primary)' }}
          >
            {showAdd ? 'Cancel' : '+ Add trading account'}
          </button>
        )}

        {showAdd && !atAccountLimit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 rounded-2xl border p-5 space-y-3"
            style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Account name (required)"
              className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
              style={{
                borderColor: 'var(--dash-border)',
                backgroundColor: 'var(--dash-bg-input)',
                color: 'var(--dash-text-primary)',
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={newProp}
                onChange={(e) => setNewProp(e.target.value)}
                placeholder="Prop firm slug (optional)"
                className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-input)',
                  color: 'var(--dash-text-primary)',
                }}
              />
              <input
                value={newPlat}
                onChange={(e) => setNewPlat(e.target.value)}
                placeholder="Platform (optional)"
                className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-input)',
                  color: 'var(--dash-text-primary)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={addAccount}
              disabled={creating}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create account'}
            </button>
          </motion.div>
        )}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--dash-text-muted)' }}>Loading…</p>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
          {accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              accessToken={session?.access_token}
              onUpdated={refreshTradingAccounts}
              toast={toast}
            />
          ))}
          {accounts.length === 0 && !error && (
            <p className="text-sm" style={{ color: 'var(--dash-text-muted)' }}>
              No trading accounts yet. Add one above, or open the app after signup — a Primary account is created automatically.
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
