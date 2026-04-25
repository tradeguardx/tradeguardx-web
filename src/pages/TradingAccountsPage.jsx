import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useToast } from '../components/common/ToastProvider';
import DashboardPageBanner from '../components/dashboard/DashboardPageBanner';
import { staggerContainer, staggerItem } from '../components/dashboard/dashboardMotion';
import {
  createTradingAccount,
  fetchPairingStatus,
  fetchSupportedProps,
  patchTradingAccount,
  reconcileTradingAccount,
} from '../api/tradingAccountsApi';
import { maxTradingAccountsForPlan } from '../lib/planLimits';

function formatCurrency(value, currency = 'USD') {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function FundedStatus({ account, accessToken, onUpdated, toast }) {
  const [editing, setEditing] = useState(false);
  const [declared, setDeclared] = useState('');
  const [saving, setSaving] = useState(false);

  const currency = account.accountCurrency || 'USD';
  const openForm = () => {
    setDeclared(
      account.currentBalance != null ? String(account.currentBalance) : '',
    );
    setEditing(true);
  };

  const submit = async () => {
    const n = Number(declared);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Invalid amount', 'Enter your actual balance from the prop firm dashboard.');
      return;
    }
    setSaving(true);
    try {
      await reconcileTradingAccount({
        accessToken,
        accountId: account.id,
        declaredBalance: n,
      });
      toast.success('Balance updated', 'Daily baselines have been reset.');
      setEditing(false);
      onUpdated?.();
    } catch (e) {
      toast.error('Could not update', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              borderColor: 'rgba(0,212,170,0.3)',
              backgroundColor: 'rgba(0,212,170,0.08)',
              color: 'var(--accent, #00d4aa)',
            }}
          >
            Funded
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
            Account status
          </span>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={openForm}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Adjust balance →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Stat label="Starting" value={formatCurrency(account.startingBalance, currency)} />
        <Stat label="Current" value={formatCurrency(account.currentBalance, currency)} emphasis />
        <Stat label="Today start" value={formatCurrency(account.dailyStartingBalance, currency)} />
        <Stat
          label="Daily reset"
          value={
            account.dailyResetTimeLocal && account.timezone
              ? `${account.dailyResetTimeLocal} ${shortTz(account.timezone)}`
              : '—'
          }
        />
      </div>

      <p className="mt-3 text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
        Last reconciled: {formatDateTime(account.lastReconciledAt)}
        {account.dashboardUrl && (
          <>
            {' · '}
            <a
              href={account.dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Open prop dashboard ↗
            </a>
          </>
        )}
      </p>

      {editing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 border-t pt-3"
          style={{ borderColor: 'var(--dash-border)' }}
        >
          <p className="text-xs mb-2" style={{ color: 'var(--dash-text-secondary)' }}>
            Open your prop firm dashboard and enter your actual balance:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={declared}
              onChange={(e) => setDeclared(e.target.value)}
              placeholder="e.g. 99480"
              autoFocus
              className="flex-1 rounded-xl border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
              style={{
                borderColor: 'var(--dash-border)',
                backgroundColor: 'var(--dash-bg-input)',
                color: 'var(--dash-text-primary)',
              }}
            />
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-2 rounded-xl text-sm font-semibold border"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value, emphasis = false }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
        {label}
      </p>
      <p
        className={`font-mono ${emphasis ? 'text-base font-bold' : 'text-sm font-semibold'}`}
        style={{ color: emphasis ? 'var(--accent, #00d4aa)' : 'var(--dash-text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}

function shortTz(iana) {
  if (!iana) return '';
  const parts = iana.split('/');
  const last = parts[parts.length - 1] || iana;
  return last.replace(/_/g, ' ');
}

const PAIRING_STATUS_POLL_MS = 30_000;

function PairingStatusBadge({ accessToken, tradingAccountId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;
    const controllers = [];

    const load = async () => {
      const controller = new AbortController();
      controllers.push(controller);
      try {
        const result = await fetchPairingStatus({
          accessToken,
          tradingAccountId,
          signal: controller.signal,
        });
        if (!cancelled) {
          setStatus(result || null);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return;
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, PAIRING_STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      controllers.forEach((c) => c.abort());
    };
  }, [accessToken, tradingAccountId]);

  const connected = Boolean(status?.connected);
  const brokerHost = status?.brokerHost || null;
  const accountKind = status?.accountKind === 'funded' ? 'funded' : 'live';
  const mappingApproved = Boolean(status?.mappingApproved);

  const pillLabel = loading ? 'Checking…' : connected ? 'Connected' : 'Not connected';
  const pillStyle = loading
    ? { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: 'var(--dash-text-secondary)' }
    : connected
    ? { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)' }
    : { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: 'var(--dash-text-secondary)' };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
          style={pillStyle}
        >
          {!loading && (
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: connected ? 'rgb(34, 197, 94)' : 'var(--dash-text-muted)',
              }}
            />
          )}
          {pillLabel}
        </span>
        {brokerHost && (
          <span className="text-[11px] font-mono" style={{ color: 'var(--dash-text-secondary)' }}>
            {brokerHost}
          </span>
        )}
      </div>
      {brokerHost && (
        <span className="text-[10px]" style={{ color: 'var(--dash-text-muted)' }}>
          {accountKind} mapping · {mappingApproved ? 'approved' : 'not yet approved'}
        </span>
      )}
    </div>
  );
}

function AccountCard({ account, accessToken, onUpdated, toast }) {
  const [name, setName] = useState(account.name || '');
  const [platform, setPlatform] = useState(account.platform || '');
  const [saving, setSaving] = useState(false);
  const isFunded = account.equityMode === 'funded';

  useEffect(() => {
    setName(account.name || '');
    setPlatform(account.platform || '');
  }, [account]);

  const save = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      await patchTradingAccount({
        accessToken,
        accountId: account.id,
        name: name.trim(),
        platform: platform.trim() || null,
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
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-base" style={{ color: 'var(--dash-text-primary)' }}>
                {account.name}
              </h3>
              {account.propFirmSlug && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: 'rgba(148, 163, 184, 0.12)',
                    color: 'var(--dash-text-secondary)',
                  }}
                >
                  {account.propFirmSlug}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 font-mono opacity-70" style={{ color: 'var(--dash-text-muted)' }}>
              {account.id}
            </p>
            <div className="mt-2">
              <PairingStatusBadge accessToken={accessToken} tradingAccountId={account.id} />
            </div>
          </div>
          <Link
            to="/dashboard/rules"
            className="text-xs font-semibold text-accent hover:underline"
          >
            Rules for this account →
          </Link>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isFunded && (
          <FundedStatus
            account={account}
            accessToken={accessToken}
            onUpdated={onUpdated}
            toast={toast}
          />
        )}

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

function AddAccountForm({ accessToken, supportedProps, onCreated, onCancel, toast }) {
  const [selectedSlug, setSelectedSlug] = useState('');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);
  const [timezone, setTimezone] = useState('');
  const [resetTime, setResetTime] = useState('');
  const [creating, setCreating] = useState(false);

  const selected = useMemo(
    () => supportedProps.find((p) => p.brokerId === selectedSlug) || null,
    [supportedProps, selectedSlug],
  );
  const isFunded = selected?.equityMode === 'funded';

  useEffect(() => {
    if (!selected) return;
    setTimezone(selected.defaultTimezone || 'UTC');
    setResetTime(selected.defaultResetTimeLocal || '00:00');
    setSelectedSize(selected.sizes?.[0] ?? null);
    setCustomSize('');
  }, [selected]);

  const sizeValue =
    customSize.trim() !== ''
      ? Number(customSize)
      : selectedSize ?? null;

  const canCreate =
    !!selected &&
    selected.status === 'active' &&
    name.trim().length > 0 &&
    (!isFunded || (Number.isFinite(sizeValue) && sizeValue > 0));

  const submit = async () => {
    if (!canCreate || !accessToken) return;
    setCreating(true);
    try {
      await createTradingAccount({
        accessToken,
        name: name.trim(),
        propFirmSlug: selected.brokerId,
        platform: platform.trim() || undefined,
        accountSize: isFunded ? sizeValue : undefined,
        equityMode: selected.equityMode,
        timezone,
        dailyResetTimeLocal: resetTime,
        dailyLossBasis: selected.dailyLossBasis,
        dashboardUrl: selected.dashboardUrl ?? undefined,
      });
      toast.success('Account created', 'Configure rules and connect the extension next.');
      onCreated?.();
    } catch (e) {
      toast.error('Could not create', e?.message || 'Try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-4 rounded-2xl border p-5 space-y-5"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--dash-text-muted)' }}>
          1. Choose prop firm or broker
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {supportedProps.length === 0 && (
            <p className="text-xs col-span-full" style={{ color: 'var(--dash-text-muted)' }}>
              No supported brokers available yet.
            </p>
          )}
          {supportedProps.map((p) => {
            const active = p.brokerId === selectedSlug;
            const isPlanned = p.status === 'planned';
            const disabled = isPlanned;
            return (
              <button
                key={p.brokerId}
                type="button"
                onClick={() => !disabled && setSelectedSlug(p.brokerId)}
                disabled={disabled}
                className="rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: active ? 'var(--accent, #00d4aa)' : 'var(--dash-border)',
                  backgroundColor: active ? 'rgba(0,212,170,0.08)' : 'var(--dash-bg-card)',
                  boxShadow: active ? '0 0 0 2px rgba(0,212,170,0.25)' : 'none',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                    {p.name}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor:
                        p.equityMode === 'funded'
                          ? 'rgba(251, 191, 36, 0.15)'
                          : 'rgba(0, 212, 170, 0.12)',
                      color:
                        p.equityMode === 'funded' ? 'rgb(251, 191, 36)' : 'var(--accent, #00d4aa)',
                    }}
                  >
                    {p.equityMode}
                  </span>
                </div>
                {isPlanned ? (
                  <p className="text-[10px] mt-1 font-semibold uppercase tracking-wider" style={{ color: 'rgb(168, 85, 247)' }}>
                    Coming soon
                  </p>
                ) : (
                  p.equityMode === 'funded' && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>
                      Daily reset {p.defaultResetTimeLocal} {shortTz(p.defaultTimezone)}
                    </p>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <motion.div
          key={selected.brokerId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--dash-text-muted)' }}>
              2. Account details
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>Display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. FTMO 100k"
                  className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
                  style={{
                    borderColor: 'var(--dash-border)',
                    backgroundColor: 'var(--dash-bg-input)',
                    color: 'var(--dash-text-primary)',
                  }}
                />
              </label>
              <label className="block">
                <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>Platform (optional)</span>
                <input
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="e.g. MT5"
                  className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
                  style={{
                    borderColor: 'var(--dash-border)',
                    backgroundColor: 'var(--dash-bg-input)',
                    color: 'var(--dash-text-primary)',
                  }}
                />
              </label>
            </div>
          </div>

          {isFunded && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--dash-text-muted)' }}>
                3. Challenge size
              </p>
              {selected.sizes?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selected.sizes.map((size) => {
                    const active = customSize.trim() === '' && selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setSelectedSize(size);
                          setCustomSize('');
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all"
                        style={{
                          borderColor: active ? 'var(--accent, #00d4aa)' : 'var(--dash-border)',
                          backgroundColor: active ? 'rgba(0,212,170,0.08)' : 'transparent',
                          color: active ? 'var(--accent, #00d4aa)' : 'var(--dash-text-primary)',
                        }}
                      >
                        ${size.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
              )}
              <label className="block">
                <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
                  Or custom size
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="e.g. 75000"
                  className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
                  style={{
                    borderColor: 'var(--dash-border)',
                    backgroundColor: 'var(--dash-bg-input)',
                    color: 'var(--dash-text-primary)',
                  }}
                />
              </label>
            </div>
          )}

          {isFunded && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--dash-text-muted)' }}>
                4. Daily reset
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
                    Reset time (local to prop firm)
                  </span>
                  <input
                    type="time"
                    value={resetTime}
                    onChange={(e) => setResetTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
                    style={{
                      borderColor: 'var(--dash-border)',
                      backgroundColor: 'var(--dash-bg-input)',
                      color: 'var(--dash-text-primary)',
                    }}
                  />
                </label>
                <label className="block">
                  <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
                    Timezone (IANA)
                  </span>
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="America/New_York"
                    className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
                    style={{
                      borderColor: 'var(--dash-border)',
                      backgroundColor: 'var(--dash-bg-input)',
                      color: 'var(--dash-text-primary)',
                    }}
                  />
                </label>
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--dash-text-muted)' }}>
                Daily loss limit resets at this time each day. Defaults come from {selected.name}.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={submit}
              disabled={!canCreate || creating}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold border"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function TradingAccountsPage() {
  const { session, user } = useAuth();
  const toast = useToast();
  const { accounts, accountsLoading, accountsError, refreshTradingAccounts } = useTradingAccounts();
  const [showAdd, setShowAdd] = useState(false);
  const [supportedProps, setSupportedProps] = useState([]);
  const [propsLoading, setPropsLoading] = useState(false);
  const [propsError, setPropsError] = useState('');
  const [propsQueried, setPropsQueried] = useState(false);

  const accountCap = maxTradingAccountsForPlan(user?.plan);
  const atAccountLimit = accountCap != null && accounts.length >= accountCap;

  const loading = accountsLoading;
  const error = accountsError;

  useEffect(() => {
    if (atAccountLimit) setShowAdd(false);
  }, [atAccountLimit]);

  useEffect(() => {
    if (!showAdd) {
      setPropsQueried(false);
    }
  }, [showAdd]);

  useEffect(() => {
    const token = session?.access_token;
    if (!showAdd || !token) return;
    if (propsQueried) return;

    let cancelled = false;
    setPropsQueried(true);
    setPropsLoading(true);
    setPropsError('');
    fetchSupportedProps({ accessToken: token })
      .then((rows) => {
        if (cancelled) return;
        setSupportedProps(rows);
      })
      .catch((e) => {
        if (cancelled) return;
        setSupportedProps([]);
        setPropsError(e?.message || 'Could not load supported props');
      })
      .finally(() => {
        if (!cancelled) setPropsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Re-run only when the "Add account" panel opens with a valid session.
    // Intentionally excluding propsQueried/propsLoading/supportedProps — they are
    // set inside this effect, and including them would cancel the in-flight fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdd, session?.access_token]);

  const onCreated = async () => {
    setShowAdd(false);
    await refreshTradingAccounts();
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
        subtitle="Each account is a separate prop or platform context. Funded prop accounts track their own starting balance and daily reset cutoff."
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

        {propsError && showAdd && (
          <p className="mt-2 text-xs text-amber-400/90">{propsError}</p>
        )}

        {showAdd && !atAccountLimit && !propsLoading && (
          <AddAccountForm
            accessToken={session?.access_token}
            supportedProps={supportedProps}
            onCreated={onCreated}
            onCancel={() => setShowAdd(false)}
            toast={toast}
          />
        )}
        {showAdd && propsLoading && (
          <p className="mt-4 text-sm" style={{ color: 'var(--dash-text-muted)' }}>Loading supported brokers…</p>
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
              No trading accounts yet. Click <strong>+ Add trading account</strong> above to create one.
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
