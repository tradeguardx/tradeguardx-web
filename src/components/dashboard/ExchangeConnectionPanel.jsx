import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { triggerHistoryBackfill } from '../../api/syncApi';
import {
  connectExchangeCredentials,
  disconnectExchangeCredentials,
  exchangeFromBrokerSlug,
  getExchangeCredentialsStatus,
} from '../../api/exchangeCredentialsApi';
import { DELTA_EGRESS_IP } from '../../api/config';
import { extraFieldsReady, secretFieldFor, splitsPastedPair, venueFor } from '../../lib/venues';
import { useIsMobile } from '../../hooks/useIsMobile';
import AppGuide from './AppGuide';
import VenueSteps from './VenueSteps';
import SecretInput from '../common/SecretInput';
import { SecretTextarea, VenueExtraFields, VenuePlatformNote } from './VenueKeyFields';
import { useNoAutofill } from '../../lib/noAutofill';
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
 * Exchange API-key connection: steps + whitelist IP + key/secret form + status.
 * Renders only for exchange accounts — returns null otherwise, so it's
 * safe to drop into any account context (Accounts page, Pairing page).
 */
export default function ExchangeConnectionPanel({ account, accessToken, toast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const noAutofill = useNoAutofill();
  const [apiSecret, setApiSecret] = useState('');
  // BloFin only: the key's passphrase.
  const [passphrase, setPassphrase] = useState('');
  // Exness only (venue.extraFields): { accountId, host }.
  const [extraVals, setExtraVals] = useState({});
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

  if (!exchangeSlug) return null; // Only render for exchange accounts

  const isConnected = connection?.status === 'active';
  const canSubmit = apiKey.trim().length > 0 && apiSecret.trim().length > 0 && (!venueFor(exchangeSlug)?.hasPassphrase || passphrase.trim().length > 0) && extraFieldsReady(venueFor(exchangeSlug), extraVals) && !submitting;

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
        passphrase: v.hasPassphrase ? passphrase.trim() : undefined,
        venueFields: extraVals,
      });
      setConnection(result);
      setConnectOutcome({ ok: true, summary: result });
      /*
       * Start importing their history the moment the key verifies.
       *
       * It takes minutes and may fail, so nothing waits on it and nothing is
       * told about it: the very next screen asks for money, and a spinner
       * between "key connected" and "here is the price" is the worst place in
       * the product to spend that time. When it lands, the journal, the tax
       * centre and the trader's own past are simply there.
       */
      triggerHistoryBackfill({ accessToken, tradingAccountId: account.id }).catch(() => {
        /* History is a bonus, never a blocker. The daily sweep gap-fills. */
      });
    } catch (e) {
      setConnectOutcome({ ok: false, message: e?.message || `${v.name} rejected the connection. Try again.` });
    } finally {
      setSubmitting(false);
    }
  };

  // Called from the result screen's "Continue" — clears the form only once
  // the user has actually seen the outcome, not immediately on success.
  const finishConnect = () => {
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setExtraVals({});
    setShowForm(false);
    setConnectOutcome(null);
    /*
     * The key is in and nothing is guarding it yet. This is the moment the
     * paywall belongs to: highest intent in the whole product, and until now
     * dead space — a confirmation and then nothing.
     *
     * Only for users with no entitlement. Someone already on a trial or a
     * paid plan is replacing a key, and sending them to a checkout page for
     * something they have already bought would be absurd.
     */
    if (user?.needsMandate) navigate('/dashboard/activate');
  };

  const openForm = () => {
    setConnectOutcome(null);
    setShowForm(true);
  };

  const onDisconnect = async () => {
    if (!window.confirm(`Disconnect this ${v.name} key? The risk-engine will stop streaming events.`)) return;
    setDisconnecting(true);
    try {
      await disconnectExchangeCredentials({ accessToken, accountId: account.id });
      setConnection(null);
      setConnectOutcome(null);
      toast.success('Disconnected', `${v.name} connection removed.`);
    } catch (e) {
      toast.error('Could not disconnect', e?.message || 'Try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  // Every word below comes from the venue, not from Delta. This panel renders
  // for any exchange account, and a CoinDCX user was being told to "Open Delta
  // & create key" — with a link to Delta's site.
  const v = venueFor(exchangeSlug);
  const venueTitle = v.family === 'delta' ? `Delta ${exchangeSlug === 'delta_india' ? 'India' : 'Global'}` : v.name;
  const apiKeysLink = v.keysUrl(exchangeSlug);

  return (
    <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--dash-border)' }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
          {venueTitle} API connection
        </p>
        {!loading && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
            style={{
              backgroundColor: isConnected ? 'var(--mint-tint)' : 'var(--surface-3)',
              color: isConnected ? 'var(--mint)' : 'var(--dash-text-secondary)',
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
        <p className="text-xs" style={{ color: 'var(--red)' }}>
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
              style={{ borderColor: 'var(--amber-line)', backgroundColor: 'var(--amber-tint)', color: 'var(--dash-text-secondary)' }}
            >
              <strong style={{ color: 'var(--amber)' }}>Alerts only.</strong>{' '}
              This key can&apos;t take action — it&apos;s read-only, or our IP isn&apos;t whitelisted.
              The kill switch and auto-cooldown can&apos;t close positions. Use <strong>Replace key</strong> with a
              Trading-scope key and whitelist the IP to arm protection.
            </div>
          )}
          <div className="grid gap-1 text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
            {connection.exchangeUserEmail && (
              <div>
                <span style={{ color: 'var(--dash-text-muted)' }}>Exchange user:</span>{' '}
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
              style={{ borderColor: 'var(--red-line)', color: 'var(--red)' }}
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
          venue={v}
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
              borderColor: 'var(--mint-line)',
              backgroundColor: 'color-mix(in srgb, var(--mint-solid) 4%, transparent)',
            }}
          >
            {isMobile && v.appGuide?.length ? (
              // Mobile. A desktop-only venue gets the same walkthrough at the
              // same prominence — the steps are what the user came for, and
              // burying them under a notice makes the page feel like a refusal.
              // The constraint goes ABOVE them, because "do this on a computer"
              // is useless discovered at step six, next to a secret you cannot
              // see twice.
              <div>
                {v.desktopOnly ? (
                  <div
                    className="mb-2.5 rounded-lg border px-3 py-2"
                    style={{ borderColor: 'var(--amber-line)', backgroundColor: 'var(--amber-tint)' }}
                  >
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                      Not in the {v.name} app
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                      {v.desktopOnlyNote} The steps below are the same ones either way, and so is the IP.
                    </p>
                  </div>
                ) : (
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                    Create a <strong>{v.scopeLabel}</strong> key in the <strong>{v.name} app</strong> ({v.mobilePath}).
                    A read-only key only sends alerts — it can&apos;t stop trading.
                  </p>
                )}
                {/* Above the steps: someone who wants the pictures wants them
                    before reading, not after. */}
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
                  {/* Was hardcoded to 4 — correct for Delta, wrong the moment a
                      venue with a different number of steps arrived. */}
                  Show me how &middot; {v.appGuide.length} steps
                </button>
                {/* The venue's real flow, the same list the connect page shows.
                    This used to be a hardcoded three-liner that named an app
                    screen, an IP field and a permission tick — none of which
                    exist on every venue. */}
                <div className="mt-2.5">
                  <VenueSteps venue={v} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                  {isConnected ? `Create a new key on ${v.name} (takes ~2 min):` : `Create your key on ${v.name} (takes ~2 min):`}
                </p>

                {/* The walkthrough is not a mobile consolation prize. CoinDCX's
                    screenshots are of the DESKTOP site, so this is where they
                    are most useful — and the written steps below say what to
                    type, while the pictures say where to look. Secondary
                    styling keeps "Open {name} & create key" the primary act. */}
                {v.appGuide?.length ? (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-bold"
                    style={{ borderColor: 'var(--line-strong)', color: 'var(--ink)' }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                      <rect x="2.5" y="4" width="19" height="13" rx="2" />
                      <path strokeLinecap="round" d="M8 20.5h8" />
                    </svg>
                    Show me how &middot; {v.appGuide.length} steps
                  </button>
                ) : null}

                <StepRow n={1}>
                  <a
                    href={apiKeysLink}
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
                          onClick={onCopyEgressIp}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono font-bold text-[12px]"
                          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--line-strong)', color: 'var(--ink)' }}
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
            )}
            <p className="mt-3 text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
              Secret shown once — copy it now. Stored encrypted (KMS).
            </p>
          </div>

          <VenuePlatformNote venue={v} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>API Key</span>
              <input
                type="text"
                name="tgx-val-a"
                {...noAutofill}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData?.getData('text') ?? '';
                  const split = splitsPastedPair(v) ? trySplitPastedCredentials(text) : null;
                  if (split) {
                    e.preventDefault();
                    setApiKey(split.key);
                    setApiSecret(split.secret);
                  }
                }}
                placeholder="Paste API Key"
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--mint-line)]"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-input)',
                  color: 'var(--dash-text-primary)',
                }}
              />
            </label>
            {secretFieldFor(v).multiline ? (
              /* Exness: a several-line private key, full width. */
              <label className="block min-w-0 sm:col-span-2">
                <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>{secretFieldFor(v).label}</span>
                <SecretTextarea
                  name="tgx-delta-secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder={secretFieldFor(v).placeholder ?? 'Paste API Secret'}
                  wrapperClassName="mt-1"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--mint-line)]"
                  style={{
                    borderColor: 'var(--dash-border)',
                    backgroundColor: 'var(--dash-bg-input)',
                    color: 'var(--dash-text-primary)',
                  }}
                />
              </label>
            ) : (
            <label className="block">
              <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>API Secret</span>
              <SecretInput
                name="tgx-delta-secret"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Paste API Secret"
                wrapperClassName="mt-1"
                className="w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--mint-line)]"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-input)',
                  color: 'var(--dash-text-primary)',
                }}
              />
            </label>
            )}
            {v.hasPassphrase && (
              <label className="block sm:col-span-2">
                <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
                  Passphrase <span style={{ color: 'var(--dash-text-muted)' }}>(the one you set when creating the key)</span>
                </span>
                <SecretInput
                  name="tgx-passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Paste passphrase"
                  wrapperClassName="mt-1"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--mint-line)]"
                  style={{
                    borderColor: 'var(--dash-border)',
                    backgroundColor: 'var(--dash-bg-input)',
                    color: 'var(--dash-text-primary)',
                  }}
                />
              </label>
            )}
            <VenueExtraFields fields={v.extraFields} values={extraVals} onChange={(name, value) => setExtraVals((prev) => ({ ...prev, [name]: value }))} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onConnect}
              disabled={!canSubmit}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--mint-solid)] text-[var(--on-mint)] hover:brightness-110 disabled:opacity-50"
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
                  setExtraVals({});
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

      {v.appGuide?.length ? (
        <AppGuide open={guideOpen} onClose={() => setGuideOpen(false)} steps={v.appGuide} docsUrl={v.keysUrl?.()} />
      ) : null}
    </div>
  );
}
