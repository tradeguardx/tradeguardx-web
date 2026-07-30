import SecretInput from '../common/SecretInput';

/**
 * Shared pieces of the Delta connect UI — used by BOTH the first-time
 * "Add account" flow (TradingAccountsPage) and the "Replace key" flow on an
 * existing account (ExchangeConnectionPanel). Extracted after the two flows
 * drifted once already (three different Delta URLs in three different files,
 * found and fixed earlier) — a user reconnecting after a disconnect should see
 * exactly the same guided steps as someone connecting for the first time, not
 * a stripped-down version that regressed back to a single paragraph.
 */

export const SUGGESTED_KEY_NAME = 'tradeguardx';

/**
 * Delta shows the API Key and Secret as two separate copyable fields, so there
 * is no way to make Delta itself hand back one combined value — but if a user
 * selects both (e.g. drags across both rows) and pastes once, we can still
 * save them a second paste. Splits on whitespace/newlines; Delta keys/secrets
 * are long unbroken alphanumeric tokens, so two 20+ char tokens is a safe
 * signal this is a paste of both values, not a single key.
 * Returns null if the paste doesn't look like a pair.
 */
export function trySplitPastedCredentials(text) {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 20 && /^[A-Za-z0-9+/=_-]+$/.test(t));
  if (tokens.length === 2) return { key: tokens[0], secret: tokens[1] };
  return null;
}

/** A numbered step in the Delta connect instructions — a small circled digit
 * plus an optional short label, so the sequence stays scannable even once
 * each step has real content (a button, a copy row, a checklist item). */
export function StepRow({ n, label, children }) {
  return (
    <div className="flex gap-2.5">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ backgroundColor: 'rgba(0,212,170,0.15)', color: 'var(--accent, #00d4aa)' }}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        {label && (
          <p className="mb-1.5 text-[11.5px] font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
            {label}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * The post-connect result screen. Every row here is derived from a real field
 * the backend returned (ExchangeConnectionSummary) — nothing is asserted that
 * wasn't actually verified. Two things are deliberately NOT shown as a
 * checkmark: a distinct "IP whitelisted" row (the backend doesn't return that
 * as its own boolean — it's folded into `enforcementCapable`, so a separate
 * checkmark would imply precision we don't have) and "withdrawal blocked" is
 * shown as a structural fact, not a live check, since Delta doesn't offer
 * withdrawal scope on API keys at all — there's nothing to verify.
 */
export function ConnectResultPanel({ outcome, retrying, onRetry, onContinue, apiKey, apiSecret, onApiKeyChange, onApiSecretChange }) {
  if (outcome.ok) {
    const { summary } = outcome;
    const live = summary?.enforcementCapable === true;
    return (
      <div
        className="rounded-xl border px-4 py-4"
        style={{ borderColor: 'rgba(0,212,170,0.3)', backgroundColor: 'rgba(0,212,170,0.05)' }}
      >
        <p className="mb-3 text-[13px] font-bold" style={{ color: 'var(--accent, #00d4aa)' }}>
          Delta connected
        </p>
        <ul className="space-y-2 text-[13px]" style={{ color: 'var(--dash-text-primary)' }}>
          <li className="flex items-start gap-2">
            <span style={{ color: 'var(--accent, #00d4aa)' }}>✓</span>
            <span>
              Connected{summary?.exchangeUserEmail ? <> as <span className="font-mono">{summary.exchangeUserEmail}</span></> : ''}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: live ? 'var(--accent, #00d4aa)' : '#f59e0b' }}>{live ? '✓' : '!'}</span>
            <span>
              {live
                ? 'Kill switch is live — this key can close positions and lock the account.'
                : (summary?.warnings?.[0] || 'Trade permission not confirmed — this key can only send alerts, not enforce.')}
            </span>
          </li>
          <li className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--dash-text-muted)' }}>
            <span>·</span>
            <span>Withdrawal was never requested — Delta doesn&apos;t offer it on API keys, so there&apos;s nothing that can move your funds.</span>
          </li>
        </ul>
        {!live && (
          <p className="mt-3 text-[12px]" style={{ color: 'var(--dash-text-muted)' }}>
            You can fix this any time from the account page — replace the key with one that has Trading enabled and the IP whitelisted.
          </p>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-surface-950 hover:bg-accent-hover"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border px-4 py-4"
      style={{ borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.06)' }}
    >
      <p className="mb-2 text-[13px] font-bold" style={{ color: 'rgb(248,113,113)' }}>
        Could not connect
      </p>
      <p className="mb-4 text-[12.5px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
        {outcome.message}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>API Key</span>
          <input
            type="text"
            autoComplete="off"
            data-lpignore="true"
            spellCheck={false}
            value={apiKey}
            onChange={onApiKeyChange}
            placeholder="Paste API Key"
            className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
            style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)', color: 'var(--dash-text-primary)' }}
          />
        </label>
        <label className="block">
          <span className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>API Secret</span>
          <SecretInput
            value={apiSecret}
            onChange={onApiSecretChange}
            placeholder="Paste API Secret"
            wrapperClassName="mt-1"
            className="w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
            style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)', color: 'var(--dash-text-primary)' }}
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying || !apiKey.trim() || !apiSecret.trim()}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-surface-950 hover:bg-accent-hover disabled:opacity-50"
        >
          {retrying ? 'Retrying…' : 'Retry connection'}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
          style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
        >
          I&apos;ll do this later
        </button>
      </div>
    </div>
  );
}
