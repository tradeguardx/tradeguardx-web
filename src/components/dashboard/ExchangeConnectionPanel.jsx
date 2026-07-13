import { useEffect, useMemo, useState } from 'react';
import {
  connectExchangeCredentials,
  disconnectExchangeCredentials,
  exchangeFromBrokerSlug,
  getExchangeCredentialsStatus,
} from '../../api/exchangeCredentialsApi';
import { DELTA_EGRESS_IP } from '../../api/config';

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/**
 * Delta API-key connection: steps + whitelist IP + key/secret form + status.
 * Renders only for exchange (Delta) accounts — returns null otherwise, so it's
 * safe to drop into any account context (Accounts page, Pairing page).
 */
export default function ExchangeConnectionPanel({ account, accessToken, toast }) {
  const exchangeSlug = exchangeFromBrokerSlug(account.propFirmSlug);
  // While an active kill-switch cooldown is running, the backend blocks
  // disconnect/replace to keep enforcement alive. Reflect that in the UI so the
  // buttons are visibly disabled instead of failing on click.
  const cooldownUntil = account.cooldownUntil ?? account.cooldown_until ?? null;
  const locked = Boolean(cooldownUntil && new Date(cooldownUntil).getTime() > Date.now());
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [ipCopied, setIpCopied] = useState(false);

  const onCopyEgressIp = async () => {
    if (!DELTA_EGRESS_IP) return;
    try {
      await navigator.clipboard.writeText(DELTA_EGRESS_IP);
      setIpCopied(true);
      setTimeout(() => setIpCopied(false), 1500);
    } catch {
      toast.error('Could not copy', 'Select the IP and copy manually.');
    }
  };

  const refresh = useMemo(
    () =>
      async () => {
        if (!accessToken || !account.id) return;
        setLoading(true);
        setLoadError('');
        try {
          const result = await getExchangeCredentialsStatus({
            accessToken,
            accountId: account.id,
          });
          setConnection(result);
        } catch (e) {
          setLoadError(e?.message || 'Could not load connection status');
        } finally {
          setLoading(false);
        }
      },
    [accessToken, account.id],
  );

  useEffect(() => {
    // Don't hit the exchange-credentials endpoint for non-Delta accounts — the
    // component renders null for them, so the fetch would be pointless.
    if (!exchangeSlug) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, exchangeSlug]);

  if (!exchangeSlug) return null; // Only render for Delta accounts

  const isConnected = connection?.status === 'active';
  const canSubmit = apiKey.trim().length > 0 && apiSecret.trim().length > 0 && !submitting;

  const onConnect = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await connectExchangeCredentials({
        accessToken,
        accountId: account.id,
        exchange: exchangeSlug,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      setConnection(result);
      setApiKey('');
      setApiSecret('');
      setShowForm(false);
      toast.success('Connected', 'Delta read-only access verified.');
    } catch (e) {
      toast.error('Could not connect', e?.message || 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDisconnect = async () => {
    if (!window.confirm('Disconnect this Delta key? The risk-engine will stop streaming events.')) return;
    setDisconnecting(true);
    try {
      await disconnectExchangeCredentials({ accessToken, accountId: account.id });
      setConnection(null);
      toast.success('Disconnected', 'Delta connection removed.');
    } catch (e) {
      toast.error('Could not disconnect', e?.message || 'Try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const region = exchangeSlug === 'delta_india' ? 'India' : 'Global';
  const apiKeysLink =
    exchangeSlug === 'delta_india'
      ? 'https://www.india.delta.exchange/app/api-keys'
      : 'https://www.delta.exchange/app/api-keys';

  return (
    <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--dash-border)' }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
          Delta {region} API connection
        </p>
        {!loading && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
            style={{
              backgroundColor: isConnected ? 'rgba(0, 212, 170, 0.12)' : 'rgba(148, 163, 184, 0.12)',
              color: isConnected ? '#00d4aa' : 'var(--dash-text-secondary)',
            }}
          >
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        )}
      </div>

      {loading && (
        <p className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>
          Loading…
        </p>
      )}

      {loadError && (
        <p className="text-xs" style={{ color: 'rgb(248, 113, 113)' }}>
          {loadError}
        </p>
      )}

      {!loading && isConnected && !showForm && (
        <div
          className="rounded-xl border px-3 py-3 space-y-2"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
        >
          {connection.enforcementCapable === false && (
            <div
              className="rounded-lg border px-3 py-2 text-[11px] leading-relaxed"
              style={{ borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.08)', color: 'var(--dash-text-secondary)' }}
            >
              <strong style={{ color: 'rgb(245,158,11)' }}>Alerts only.</strong>{' '}
              This key can&apos;t take action — it&apos;s read-only, or our IP isn&apos;t whitelisted.
              The kill switch and auto-cooldown can&apos;t close positions. Use <strong>Replace key</strong> with a
              Trading-scope key and whitelist the IP to arm protection.
            </div>
          )}
          <div className="grid gap-1 text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
            {connection.exchangeUserEmail && (
              <div>
                <span style={{ color: 'var(--dash-text-muted)' }}>Delta user:</span>{' '}
                <span style={{ color: 'var(--dash-text-primary)' }}>{connection.exchangeUserEmail}</span>
              </div>
            )}
            {connection.exchangeAccountId && (
              <div>
                <span style={{ color: 'var(--dash-text-muted)' }}>Account ID:</span>{' '}
                <span className="font-mono" style={{ color: 'var(--dash-text-primary)' }}>
                  {connection.exchangeAccountId}
                </span>
              </div>
            )}
            {connection.lastValidatedAt && (
              <div>
                <span style={{ color: 'var(--dash-text-muted)' }}>Last verified:</span>{' '}
                {formatDateTime(connection.lastValidatedAt)}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              disabled={locked}
              title={locked ? 'Locked during an active cooldown' : undefined}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
            >
              Replace key
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting || locked}
              title={locked ? 'Locked during an active cooldown' : undefined}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'rgb(248, 113, 113)' }}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
          {locked && (
            <p className="pt-1 text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>
              🔒 Key changes are locked while your account is in cooldown — this keeps your kill switch active. Available again once the lock lifts.
            </p>
          )}
        </div>
      )}

      {!loading && (!isConnected || showForm) && (
        <div className="space-y-3">
          <div
            className="rounded-xl border px-3 py-3"
            style={{
              borderColor: 'rgba(0,212,170,0.25)',
              backgroundColor: 'rgba(0,212,170,0.04)',
            }}
          >
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
              {isConnected ? 'Replace the existing key with a new one.' : (
                <>
                  Generate a <strong>Trading</strong> key from{' '}
                  <a href={apiKeysLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent, #00d4aa)' }} className="underline">
                    Delta → API Keys
                  </a>
                  {' '}— enable <strong>Trading</strong> but <strong>never Withdrawal</strong>, and whitelist the IP below.
                  The kill-switch and auto-cooldown need Trade scope to close positions and lock the account.
                  A read-only key only sends alerts — it cannot stop trading.
                </>
              )}
            </p>
          </div>

          {DELTA_EGRESS_IP && (
            <div
              className="rounded-xl border px-3 py-3"
              style={{
                borderColor: 'var(--dash-border)',
                backgroundColor: 'var(--dash-bg-input)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--dash-text-primary)' }}>
                    Whitelist this IP on your Delta key
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                    Paste it under <strong>Allowed IPs</strong> when creating the key.
                    Required for Trading-scope features (kill-switch, auto-cooldown).
                    Read-only keys can leave it blank.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCopyEgressIp}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-mono"
                  style={{
                    borderColor: 'var(--dash-border)',
                    backgroundColor: 'var(--dash-bg-card)',
                    color: 'var(--dash-text-primary)',
                  }}
                  title={ipCopied ? 'Copied' : 'Copy to clipboard'}
                >
                  <span>{DELTA_EGRESS_IP}</span>
                  <span style={{ color: 'var(--accent, #00d4aa)' }}>{ipCopied ? '✓' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>API Key</span>
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
              <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>API Secret</span>
              <input
                type="password"
                name="tgx-delta-secret"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                spellCheck={false}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Paste API Secret"
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-input)',
                  color: 'var(--dash-text-primary)',
                }}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onConnect}
              disabled={!canSubmit}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? 'Verifying…' : isConnected ? 'Replace key' : 'Connect'}
            </button>
            {showForm && isConnected && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setApiKey('');
                  setApiSecret('');
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold border"
                style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
