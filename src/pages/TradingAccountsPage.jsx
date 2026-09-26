import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useToast } from '../components/common/ToastProvider';
import { staggerContainer, staggerItem } from '../components/dashboard/dashboardMotion';
import {
  createTradingAccount,
  fetchPairingStatus,
  fetchSupportedProps,
  patchTradingAccount,
  reconcileTradingAccount,
} from '../api/tradingAccountsApi';
import {
  connectExchangeCredentials,
  exchangeFromBrokerSlug,
  getExchangeCredentialsStatus,
} from '../api/exchangeCredentialsApi';
import ExchangeConnectionPanel from '../components/dashboard/ExchangeConnectionPanel';
import VenueMark, { VenueBetaBadge } from '../components/dashboard/VenueMark';
import AppGuide from '../components/dashboard/AppGuide';
import VenueSteps from '../components/dashboard/VenueSteps';
import SecretInput from '../components/common/SecretInput';
import { StepRow, SUGGESTED_KEY_NAME, trySplitPastedCredentials, ConnectResultPanel } from '../components/dashboard/deltaConnectShared';
import { useIsMobile } from '../hooks/useIsMobile';
import { DELTA_EGRESS_IP } from '../api/config';
import { venueFor } from '../lib/venues';
import { maxTradingAccountsForPlan } from '../lib/planLimits';
import { brokerLabel, equityModeLabel } from '../lib/labels';

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
          <div className="flex flex-wrap gap-2">
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

function PairingStatusBadge({ accessToken, tradingAccountId, propFirmSlug }) {
  // Delta accounts connect via API key (risk-engine), not the extension — so
  // their "connected" state comes from the exchange-credentials status, not the
  // pairing status (which would always read "not connected" for them).
  const isDelta = exchangeFromBrokerSlug(propFirmSlug) !== null;
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
        if (isDelta) {
          const conn = await getExchangeCredentialsStatus({
            accessToken,
            accountId: tradingAccountId,
            signal: controller.signal,
          });
          if (!cancelled) {
            setStatus({ connected: conn?.status === 'active' });
            setLoading(false);
          }
        } else {
          const result = await fetchPairingStatus({
            accessToken,
            tradingAccountId,
            signal: controller.signal,
          });
          if (!cancelled) {
            setStatus(result || null);
            setLoading(false);
          }
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
  }, [accessToken, tradingAccountId, isDelta]);

  const connected = Boolean(status?.connected);
  // Broker host + DOM-mapping line are extension concepts — hide for Delta.
  const brokerHost = isDelta ? null : status?.brokerHost || null;
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

/**
 * One account. Collapsible when there are several, and CONTROLLED by the list
 * rather than holding its own open state.
 *
 * It used to own that state, which meant every card could be open at once and
 * the page grew to the sum of all of them. Connecting a key on the fourth
 * account meant scrolling past three expanded cards, finding its header,
 * opening it, and scrolling again — for the account the header switcher already
 * says you are working on.
 */
function AccountCard({ account, accessToken, onUpdated, toast, collapsible = false, expanded = true, onToggle, cardRef }) {
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

  const accountSizeChip = isFunded && account.accountSize != null && (
    <span
      className="text-[10px] font-semibold rounded-full px-2 py-0.5"
      style={{
        backgroundColor: 'rgba(0, 212, 170, 0.12)',
        color: '#00d4aa',
      }}
    >
      {formatCurrency(account.accountSize, account.accountCurrency || 'USD')}
    </span>
  );

  const HeaderInner = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex items-start gap-3">
        {collapsible && (
          <span
            aria-hidden="true"
            className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-transform"
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'var(--dash-text-muted)',
              backgroundColor: 'var(--dash-bg-card)',
              border: '1px solid var(--dash-border)',
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
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
                {brokerLabel(account.propFirmSlug)}
              </span>
            )}
            {accountSizeChip}
          </div>
          <p className="text-xs mt-0.5 font-mono opacity-70" style={{ color: 'var(--dash-text-muted)' }}>
            {account.id}
          </p>
          <div className="mt-2">
            <PairingStatusBadge
              accessToken={accessToken}
              tradingAccountId={account.id}
              propFirmSlug={account.propFirmSlug}
            />
          </div>
        </div>
      </div>
      <Link
        to="/dashboard/rules"
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-semibold text-accent hover:underline"
      >
        Rules for this account →
      </Link>
    </div>
  );

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-2xl border overflow-hidden transition-colors duration-300"
      style={{
        borderColor: 'var(--dash-border)',
        backgroundColor: 'var(--dash-bg-raised)',
        boxShadow: 'var(--dash-shadow-card)',
      }}
      ref={cardRef}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className="w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
          style={{ borderBottom: expanded ? '1px solid var(--dash-border)' : 'none' }}
          aria-expanded={expanded}
        >
          {HeaderInner}
        </button>
      ) : (
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--dash-border)' }}>
          {HeaderInner}
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
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

        <ExchangeConnectionPanel account={account} accessToken={accessToken} toast={toast} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * `presetSlug` lets the venue picker live OUTSIDE this form — the accounts page
 * shows the venues, and choosing one opens this in a modal with the choice
 * already made. Without it the form owns the picker and the whole flow has to
 * be inline.
 */
export function AddAccountForm({ accessToken, supportedProps, onCreated, onCancel, toast, presetSlug = '', skipKey = false }) {
  const [selectedSlug, setSelectedSlug] = useState(presetSlug || '');
  const [name, setName] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);
  const [timezone, setTimezone] = useState('');
  const [resetTime, setResetTime] = useState('');
  const [creating, setCreating] = useState(false);
  // Delta-only: optional API key/secret entered inline during account creation.
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const isMobile = useIsMobile();
  const [guideOpen, setGuideOpen] = useState(false);
  // Set once the account is created. Non-null switches the panel from the form
  // to a result screen — see the comment on `submit` for why this can't just
  // toast-and-close like before.
  const [createdAccount, setCreatedAccount] = useState(null);
  // null while connecting; then { ok:true, summary } | { ok:false, message }.
  const [connectOutcome, setConnectOutcome] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [nameCopied, setNameCopied] = useState(false);

  const selected = useMemo(
    () => supportedProps.find((p) => p.brokerId === selectedSlug) || null,
    [supportedProps, selectedSlug],
  );
  const isFunded = selected?.equityMode === 'funded';
  const exchangeSlug = exchangeFromBrokerSlug(selected?.brokerId);
  const isDelta = Boolean(exchangeSlug);
  // Venue-specific words for the same four steps ("Delta" vs "CoinDCX", the
  // name of their IP field, their permission label).
  const v = venueFor(exchangeSlug) ?? venueFor('delta_india');

  useEffect(() => {
    if (!selected) return;
    setTimezone(selected.defaultTimezone || 'UTC');
    setResetTime(selected.defaultResetTimeLocal || '00:00');
    setSelectedSize(selected.sizes?.[0] ?? null);
    setCustomSize('');
    // Clear Delta inputs when switching brokers so secrets never leak across selections.
    setApiKey('');
    setApiSecret('');
  }, [selected]);

  const sizeValue =
    customSize.trim() !== ''
      ? Number(customSize)
      : selectedSize ?? null;

  // Exchange venues normally require a Trading key up front — an account
  // without one is a shell that enforces nothing, and we do not hand those out
  // from the standalone form.
  //
  // skipKey is the wizard, where the NEXT stage connects the key. The rule is
  // the same, it is just enforced one screen later by a better screen: the
  // wizard's stage 2 is ConnectKeyFlow, the real connect page. Collecting the
  // key here as well meant stage 2 had nothing left to do, and the two
  // instruction lists disagreed about how many steps the venue has.
  const deltaCredsProvided =
    skipKey || !isDelta || (apiKey.trim() !== '' && apiSecret.trim() !== '');

  const canCreate =
    !!selected &&
    selected.status === 'active' &&
    name.trim().length > 0 &&
    (!isFunded || (Number.isFinite(sizeValue) && sizeValue > 0)) &&
    deltaCredsProvided;

  // Non-Delta accounts still close immediately (nothing to confirm). Delta
  // accounts move to a result screen instead of closing — the account is
  // created either way (credential failure is never fatal to it), but
  // whether the KILL SWITCH IS ACTUALLY LIVE is the one thing worth a user's
  // full attention, and a toast that can be missed isn't enough for that.
  const submit = async () => {
    if (!canCreate || !accessToken) return;
    setCreating(true);
    try {
      const account = await createTradingAccount({
        accessToken,
        name: name.trim(),
        propFirmSlug: selected.brokerId,
        accountSize: isFunded ? sizeValue : undefined,
        equityMode: selected.equityMode,
        timezone,
        dailyResetTimeLocal: resetTime,
        dailyLossBasis: selected.dailyLossBasis,
        dashboardUrl: selected.dashboardUrl ?? undefined,
      });

      // In the wizard the account is all this stage makes; the key is the next
      // stage's job, so hand back and let it advance. Connecting here as well
      // left stage 2 with nothing to do.
      if (!isDelta || skipKey) {
        toast.success('Account created', skipKey ? 'Now connect the key.' : 'Configure rules and connect the extension next.');
        // Hand the account back: the add-a-venue wizard selects it so its next
        // stage connects a key to the one just made rather than to whatever
        // happened to be selected before.
        onCreated?.(account);
        return;
      }

      setCreatedAccount(account);
      try {
        const summary = await connectExchangeCredentials({
          accessToken,
          accountId: account.id,
          exchange: exchangeSlug,
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
        });
        setConnectOutcome({ ok: true, summary });
      } catch (credErr) {
        setConnectOutcome({ ok: false, message: credErr?.message || `${v.name} rejected the connection. Try again.` });
      }
    } catch (e) {
      toast.error('Could not create', e?.message || 'Try again.');
    } finally {
      setCreating(false);
    }
  };

  // Retry after a failed connect — the account already exists, so this only
  // re-attempts the credential pairing, not the whole form.
  const retryConnect = async () => {
    if (!createdAccount?.id || !apiKey.trim() || !apiSecret.trim()) return;
    setRetrying(true);
    try {
      const summary = await connectExchangeCredentials({
        accessToken,
        accountId: createdAccount.id,
        exchange: exchangeSlug,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      setConnectOutcome({ ok: true, summary });
    } catch (credErr) {
      setConnectOutcome({ ok: false, message: credErr?.message || `${v.name} rejected the connection. Try again.` });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-4 rounded-2xl border p-5 space-y-5"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
    >
      {!presetSlug && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--dash-text-muted)' }}>
          1. Choose your venue
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
                <div className="flex items-center gap-2.5">
                  <VenueMark slug={p.brokerId} name={p.name} size={28} radius={9} />
                  <span className="flex-1 min-w-0 text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                    {p.name}
                  </span>
                  <VenueBetaBadge slug={p.brokerId} />
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
                    {equityModeLabel(p.equityMode)}
                  </span>
                </div>
                {isPlanned ? (
                  <p className="text-[10px] mt-1.5 ml-[38px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(168, 85, 247)' }}>
                    Coming soon
                  </p>
                ) : (
                  p.equityMode === 'funded' && (
                    <p className="text-[10px] mt-1.5 ml-[38px]" style={{ color: 'var(--dash-text-muted)' }}>
                      Daily reset {p.defaultResetTimeLocal} {shortTz(p.defaultTimezone)}
                    </p>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {selected && (
        <motion.div
          key={selected.brokerId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--dash-text-muted)' }}>
              {/* The numbers described a form that had a venue picker above and
                  a key block below. In the wizard both live elsewhere, so a
                  lone "2." counts through sections the user cannot see. */}
              {presetSlug && skipKey ? 'Account details' : `${isFunded ? '4.' : '2.'} Account details`}
            </p>
            {/* Platform removed: it asked for MT4/MT5, which means nothing on
                a crypto exchange — every venue here is its own platform. It was
                optional and empty on every account, and an optional field
                nobody can answer still costs a moment deciding whether they
                should. */}
            <label className="block">
              <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>Display name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                /* Suggest the venue they just picked. "FTMO 100k" is a prop-firm
                   example on a crypto venue picker, and the name only has to
                   tell two accounts apart. */
                placeholder={selected?.name ? `e.g. ${selected.name}` : 'e.g. your broker name'}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-input)',
                  color: 'var(--dash-text-primary)',
                }}
              />
              <span className="mt-1 block text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
                Just a label for you — it is what the account switcher shows.
              </span>
            </label>
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

          {isDelta && createdAccount && connectOutcome && !skipKey && (
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--dash-text-muted)' }}
              >
                {isFunded ? '5.' : '3.'} Connect {v.name} API key
              </p>
              <ConnectResultPanel
                venue={v}
                outcome={connectOutcome}
                retrying={retrying}
                onRetry={retryConnect}
                onContinue={() => onCreated?.(createdAccount)}
                apiKey={apiKey}
                apiSecret={apiSecret}
                onApiKeyChange={(e) => setApiKey(e.target.value)}
                onApiSecretChange={(e) => setApiSecret(e.target.value)}
              />
            </div>
          )}

          {isDelta && !createdAccount && !skipKey && (
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--dash-text-muted)' }}
              >
                {isFunded ? '5.' : '3.'} Connect {v.name} API key{' '}
                <span style={{ color: '#f59e0b' }}>(required)</span>
              </p>
              <div
                className="rounded-xl border px-3.5 py-3.5 mb-3"
                style={{
                  borderColor: 'rgba(0,212,170,0.25)',
                  backgroundColor: 'rgba(0,212,170,0.04)',
                }}
              >
                {isMobile && v.appGuide?.length ? (
                  // Mobile: offer the screenshot walkthrough rather than a link
                  // the user would have to switch away to open. For venues that
                  // cannot issue a key from a phone at all, the constraint is
                  // stated first and the steps still shown — they are what the
                  // user will follow once they are at a computer.
                  <>
                    {v.desktopOnly && (
                      // The constraint goes first. Discovering "use a computer"
                      // at the last step, holding a secret the venue will not
                      // show again, is the worst place to learn it.
                      <div
                        className="mb-2.5 rounded-lg border px-3 py-2"
                        style={{ borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.07)' }}
                      >
                        <p className="text-[12px] font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                          Not in the {v.name} app
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                          {v.desktopOnlyNote}
                        </p>
                      </div>
                    )}
                    <p className="text-[12px] font-semibold mb-2" style={{ color: 'var(--dash-text-primary)' }}>
                      {v.desktopOnly ? `Create your key on ${v.name} (~2 min):` : `Create your key in the ${v.name} app (~2 min):`}
                    </p>
                    {/* Above the steps, not below them. Someone who wants the
                        pictures wants them BEFORE reading four paragraphs —
                        underneath, the offer only arrives once they have
                        already done the work of reading. */}
                    <button
                      type="button"
                      onClick={() => setGuideOpen(true)}
                      className="mb-2.5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold"
                      style={{ backgroundColor: 'var(--ink)', color: 'var(--surface)' }}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
                        <path strokeLinecap="round" d="M10.5 18.5h3" />
                      </svg>
                      Show me how &middot; {v.appGuide.length} steps
                    </button>
                    {/* The venue's real flow, same list and same styling as
                        the connect page. This was a hardcoded three-item list
                        naming an app path, an IP field and a permission tick —
                        none of which exist on every venue. */}
                    <VenueSteps venue={v} />
                    {/* The steps say "paste our IP"; this is the IP. It lived
                        inside the hardcoded list that VenueSteps replaced, and
                        an instruction to paste an address that is nowhere on
                        screen is worse than no instruction. */}
                    {DELTA_EGRESS_IP ? (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[11.5px]" style={{ color: 'var(--dash-text-muted)' }}>{v.ipField}</span>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard?.writeText(DELTA_EGRESS_IP); toast?.success?.('Copied', 'IP copied to clipboard.'); }}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono font-bold text-[11px]"
                          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--line-strong)', color: 'var(--ink)' }}
                          title="Copy IP"
                        >
                          {DELTA_EGRESS_IP} <span>Copy</span>
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--dash-text-primary)' }}>
                      Create your key on {v.name} (takes ~2 min):
                    </p>
                    {/* Desktop gets the walkthrough too. CoinDCX's screenshots
                        are of the desktop site, so this is where they are most
                        useful — and it is the only place its key can be made at
                        all. Secondary styling so "Open {name} & create key"
                        stays the primary act. */}
                    {v.appGuide?.length ? (
                      <button
                        type="button"
                        onClick={() => setGuideOpen(true)}
                        className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-bold"
                        style={{ borderColor: 'var(--line-strong)', color: 'var(--ink)' }}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                          <rect x="2.5" y="4" width="19" height="13" rx="2" />
                          <path strokeLinecap="round" d="M8 20.5h8" />
                        </svg>
                        Show me how &middot; {v.appGuide.length} steps
                      </button>
                    ) : null}
                    <div className="space-y-3">
                      <StepRow n={1}>
                        <a
                          href={v.keysUrl(exchangeSlug)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold"
                          style={{ backgroundColor: 'var(--ink)', color: 'var(--surface)' }}
                        >
                          Open {v.name} &amp; create key
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </StepRow>

                      <StepRow n={2} label={`Copy these into ${v.name}'s form`}>
                        <div className="space-y-2">
                          <div
                            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                            style={{ backgroundColor: 'var(--dash-bg-input)' }}
                          >
                            <span className="text-[12px]" style={{ color: 'var(--dash-text-secondary)' }}>API Key Name</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(SUGGESTED_KEY_NAME);
                                setNameCopied(true);
                                setTimeout(() => setNameCopied(false), 1500);
                                toast?.success?.('Copied', 'Key name copied to clipboard.');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono font-bold text-[12px]"
                              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--line-strong)', color: 'var(--ink)' }}
                              title="Copy suggested name"
                            >
                              {SUGGESTED_KEY_NAME} {nameCopied ? '✓' : 'Copy'}
                            </button>
                          </div>
                          <div
                            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                            style={{ backgroundColor: 'var(--dash-bg-input)' }}
                          >
                            <span className="text-[12px]" style={{ color: 'var(--dash-text-secondary)' }}>{v.ipField}</span>
                            {DELTA_EGRESS_IP ? (
                              <button
                                type="button"
                                onClick={() => { navigator.clipboard?.writeText(DELTA_EGRESS_IP); toast?.success?.('Copied', 'IP copied to clipboard.'); }}
                                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono font-bold text-[12px]"
                                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--line-strong)', color: 'var(--ink)' }}
                                title="Copy IP"
                              >
                                {DELTA_EGRESS_IP} Copy
                              </button>
                            ) : (
                              <span className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>shown after you pick a broker</span>
                            )}
                          </div>
                        </div>
                      </StepRow>

                      {/* Its own step, deliberately — this is the ONE checkbox that
                          decides whether the kill switch can act at all. Burying it
                          in a sentence with the other steps is how it gets skipped. */}
                      <StepRow n={3} label="Tick this permission">
                        <div
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
                          style={{ backgroundColor: 'var(--mint-tint)', border: '1px solid var(--mint-line)' }}
                        >
                          <svg className="h-4 w-4 shrink-0" fill="none" stroke="var(--mint)" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-6" />
                          </svg>
                          <span className="text-[12.5px]" style={{ color: 'var(--dash-text-primary)' }}>
                            <strong>{v.scopeLabel}</strong> — without this the kill switch can only alert, never act.
                          </span>
                        </div>
                      </StepRow>

                      <StepRow n={4} label="Create the key, then paste it below">
                        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                          Click <strong>Create API key</strong> — selecting and pasting both values together into the field below works too.
                        </p>
                      </StepRow>
                    </div>
                  </>
                )}
                <p className="mt-3 text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
                  Secret shown once — copy it now. Stored encrypted (KMS).
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
                    API Key
                  </span>
                  <input
                    type="text"
                    name="tgx-delta-key"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    spellCheck={false}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onPaste={(e) => {
                      const text = e.clipboardData?.getData('text') ?? '';
                      const split = trySplitPastedCredentials(text);
                      if (split) {
                        e.preventDefault();
                        setApiKey(split.key);
                        setApiSecret(split.secret);
                        toast?.success?.('Pasted both', 'Key and secret filled in from one paste.');
                      }
                    }}
                    placeholder="Paste API Key"
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
                    API Secret
                  </span>
                  <SecretInput
                    name="tgx-delta-secret"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Paste API Secret"
                    wrapperClassName="mt-1"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
                    style={{
                      borderColor: 'var(--dash-border)',
                      backgroundColor: 'var(--dash-bg-input)',
                      color: 'var(--dash-text-primary)',
                    }}
                  />
                </label>
              </div>
              {(!apiKey.trim() || !apiSecret.trim()) && (
                <p className="text-[11px] mt-2" style={{ color: 'rgb(251, 191, 36)' }}>
                  Both the API Key and Secret are required to create a {v.name} account.
                </p>
              )}
            </div>
          )}

          {!(isDelta && createdAccount && connectOutcome && !skipKey) && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={submit}
              disabled={!canCreate || creating}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50"
            >
              {creating
                ? (isDelta && !skipKey && apiKey && apiSecret ? 'Creating & connecting…' : 'Creating…')
                : skipKey
                  ? 'Continue'
                  : (isDelta && apiKey && apiSecret ? 'Create & connect' : 'Create account')}
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
          )}
        </motion.div>
      )}

      <AppGuide open={guideOpen} onClose={() => setGuideOpen(false)} steps={v.appGuide ?? []} docsUrl={v.keysUrl?.()} />
    </motion.div>
  );
}

export default function TradingAccountsPage() {
  const { session, user } = useAuth();
  const toast = useToast();
  const { accounts, accountsLoading, accountsError, refreshTradingAccounts, selectedTradingAccountId } = useTradingAccounts();
  const [showAdd, setShowAdd] = useState(false);
  const [supportedProps, setSupportedProps] = useState([]);
  const [propsLoading, setPropsLoading] = useState(false);
  const [propsError, setPropsError] = useState('');
  const [propsQueried, setPropsQueried] = useState(false);

  /**
   * One card open at a time, and by default the account the header switcher
   * already says you are on.
   *
   * Before: every card kept its own open state and the first one in the list
   * was expanded regardless. With four accounts that meant scrolling past
   * everything, finding the right header, opening it, and scrolling again —
   * to reach the account the rest of the dashboard was already scoped to.
   * Nothing on this page read the selection it had.
   *
   * DERIVED, not synced. An effect that copied the selection into state would
   * cascade a render on every change and, worse, need a second effect to undo
   * a manual toggle when the selection moved. Tying the override to the
   * selection it was made under does both for free: switch account and any
   * manual open/close is no longer for the current selection, so it lapses.
   */
  const [override, setOverride] = useState(null);
  const openCardRef = useRef(null);

  const manual = override && override.forSelection === selectedTradingAccountId ? override : null;
  const openId = manual ? manual.id : selectedTradingAccountId || accounts[0]?.id || null;

  const toggleCard = (id) =>
    setOverride({ forSelection: selectedTradingAccountId, id: openId === id ? null : id });

  // Bring the open card into view when the selection moved it, so the answer
  // to "where did my account go" is never "scroll and find out".
  useEffect(() => {
    if (!openId || !openCardRef.current) return;
    openCardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [openId]);

  // Unknown plan is not the free plan — don't block "Add account" on a guess
  // while the subscription resolves. The server enforces the real cap.
  const accountCap = user?.planKnown ? maxTradingAccountsForPlan(user?.plan) : null;
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
              collapsible={accounts.length > 1}
              expanded={accounts.length > 1 ? openId === a.id : true}
              onToggle={() => toggleCard(a.id)}
              cardRef={a.id === openId ? openCardRef : undefined}
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
