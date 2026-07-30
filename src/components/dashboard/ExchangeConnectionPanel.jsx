import { useEffect, useMemo, useState } from 'react';
import {
  connectExchangeCredentials,
  disconnectExchangeCredentials,
  exchangeFromBrokerSlug,
  getExchangeCredentialsStatus,
} from '../../api/exchangeCredentialsApi';
import { DELTA_EGRESS_IP, deltaApiKeysUrl } from '../../api/config';
import { useIsMobile } from '../../hooks/useIsMobile';
import DeltaAppGuide from './DeltaAppGuide';
import SecretInput from '../common/SecretInput';
import { StepRow, SUGGESTED_KEY_NAME, trySplitPastedCredentials, ConnectResultPanel } from './deltaConnectShared';

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
  const isMobile = useIsMobile();
  const [guideOpen, setGuideOpen] = useState(false);
  const [nameCopied, setNameCopied] = useState(false);
  // null while no attempt has been made this session; then { ok:true, summary }
  // | { ok:false, message }. Non-null swaps the form for ConnectResultPanel —
  // same pattern as first-time account creation, so reconnecting after a
  // disconnect isn't a stripped-down version of that flow.
  const [connectOutcome, setConnectOutcome] = useState(null);

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

  // Doubles as the retry handler on the result screen — there's no separate
  // "create account" step here like the first-connect flow, so retrying is
  // just calling this again with whatever's currently in the fields.
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
      setConnectOutcome({ ok: true, summary: result });
    } catch (e) {
      setConnectOutcome({ ok: false, message: e?.message || 'Delta rejected the connection. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Called from the result screen's "Continue" — clears the form only once
  // the user has actually seen the outcome, not immediately on success.
  const finishConnect = () => {
    setApiKey('');
    setApiSecret('');
    setShowForm(false);
    setConnectOutcome(null);
  };

  const openForm = () => {
    setConnectOutcome(null);
    setShowForm(true);
  };

  const onDisconnect = async () => {
    if (!window.confirm('Disconnect this Delta key? The risk-engine will stop streaming events.')) return;
    setDisconnecting(true);
    try {
      await disconnectExchangeCredentials({ accessToken, accountId: account.id });
      setConnection(null);
      setConnectOutcome(null);
      toast.success('Disconnected', 'Delta connection removed.');
    } catch (e) {
      toast.error('Could not disconnect', e?.message || 'Try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const region = exchangeSlug === 'delta_india' ? 'India' : 'Global';
  const apiKeysLink = deltaApiKeysUrl(exchangeSlug);

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
              onClick={openForm}
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

      {!loading && (!isConnected || showForm) && connectOutcome && (
        <ConnectResultPanel
          outcome={connectOutcome}
          retrying={submitting}
          onRetry={onConnect}
          onContinue={finishConnect}
          apiKey={apiKey}
          apiSecret={apiSecret}
          onApiKeyChange={(e) => setApiKey(e.target.value)}
          onApiSecretChange={(e) => setApiSecret(e.target.value)}
        />
      )}

      {!loading && (!isConnected || showForm) && !connectOutcome && (
        <div className="space-y-3">
          <div
            className="rounded-xl border px-3 py-3"
            style={{
              borderColor: 'rgba(0,212,170,0.25)',
              backgroundColor: 'rgba(0,212,170,0.04)',
            }}
          >
            {isMobile ? (
              // Mobile: users are in the Delta app, not a browser tab. Guide them
              // through the app's Algo Hub → APIs flow with the screenshot walkthrough.
              // Same treatment whether this is a first connect or a reconnect after
              // disconnect — no stripped-down version for the second case.
              <div>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                  Create a <strong>Trading</strong> key in the <strong>Delta app</strong> (Algo Hub → APIs).
                  Enable <strong>Trading</strong>, whitelist the IP below, and paste the key here.
                  A read-only key only sends alerts — it can&apos;t stop trading.
                </p>
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold text-surface-950"
                  style={{ backgroundColor: 'var(--accent, #00d4aa)' }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
                    <path strokeLinecap="round" d="M10.5 18.5h3" />
                  </svg>
                  Show me how · 4 steps
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                  {isConnected ? 'Create a new key on Delta (takes ~2 min):' : 'Create your key on Delta (takes ~2 min):'}
                </p>

                <StepRow n={1}>
                  <a
                    href={apiKeysLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold text-surface-950"
                    style={{ backgroundColor: 'var(--accent, #00d4aa)' }}
                  >
                    Open Delta &amp; create key
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </StepRow>

                <StepRow n={2} label="Copy these into Delta's form">
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
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono font-bold text-[12px]"
                        style={{ backgroundColor: 'rgba(0,212,170,0.14)', borderColor: 'rgba(0,212,170,0.45)', color: 'var(--accent, #00d4aa)' }}
                        title="Copy suggested name"
                      >
                        {SUGGESTED_KEY_NAME} {nameCopied ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                      style={{ backgroundColor: 'var(--dash-bg-input)' }}
                    >
                      <span className="text-[12px]" style={{ color: 'var(--dash-text-secondary)' }}>Whitelisted IP</span>
                      {DELTA_EGRESS_IP ? (
                        <button
                          type="button"
                          onClick={onCopyEgressIp}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono font-bold text-[12px]"
                          style={{ backgroundColor: 'rgba(0,212,170,0.14)', borderColor: 'rgba(0,212,170,0.45)', color: 'var(--accent, #00d4aa)' }}
                          title={ipCopied ? 'Copied' : 'Copy to clipboard'}
                        >
                          {DELTA_EGRESS_IP} {ipCopied ? '✓' : 'Copy'}
                        </button>
                      ) : (
                        <span className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>not available</span>
                      )}
                    </div>
                  </div>
                </StepRow>

                <StepRow n={3} label="Tick this permission">
                  <div
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.3)' }}
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="var(--accent, #00d4aa)" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-6" />
                    </svg>
                    <span className="text-[12.5px]" style={{ color: 'var(--dash-text-primary)' }}>
                      <strong>Trading</strong> — without this the kill switch can only alert, never act.
                    </span>
                  </div>
                </StepRow>

                <StepRow n={4} label="Create the key, then paste it below">
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                    Click <strong>Create API key</strong> — selecting and pasting both values together into the field below works too.
                  </p>
                </StepRow>
              </div>
            )}
            <p className="mt-3 text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
              Secret shown once — copy it now. Stored encrypted (KMS); Delta never offers a withdrawal permission on API keys.
            </p>
          </div>

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
                onPaste={(e) => {
                  const text = e.clipboardData?.getData('text') ?? '';
                  const split = trySplitPastedCredentials(text);
                  if (split) {
                    e.preventDefault();
                    setApiKey(split.key);
                    setApiSecret(split.secret);
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
              <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>API Secret</span>
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

      <DeltaAppGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
