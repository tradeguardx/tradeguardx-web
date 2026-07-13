import { useEffect, useState } from 'react';
import { getExchangeCredentialsStatus, exchangeFromBrokerSlug } from '../../api/exchangeCredentialsApi';

/**
 * "Unprotected" banner for the Live dashboard. For a Delta account, the kill
 * switch is only live when a Trading-scoped key is connected. If the key is
 * disconnected (no connection) or read-only (enforcementCapable === false), the
 * engine can monitor but cannot flatten — the user must know their guardrails
 * aren't enforcing. Renders nothing when protected or for non-Delta accounts.
 */
export default function ProtectionBanner({ accessToken, account }) {
  const isDelta = Boolean(account && exchangeFromBrokerSlug(account.propFirmSlug));
  const [conn, setConn] = useState(undefined); // undefined = loading, null = none

  useEffect(() => {
    if (!accessToken || !account?.id || !isDelta) {
      setConn(undefined);
      return;
    }
    const ctrl = new AbortController();
    getExchangeCredentialsStatus({ accessToken, accountId: account.id, signal: ctrl.signal })
      .then((c) => setConn(c))
      .catch(() => {});
    return () => ctrl.abort();
  }, [accessToken, account?.id, isDelta]);

  if (!isDelta || conn === undefined) return null;

  // protected flag from the API; fall back to deriving it for older responses.
  const isProtected =
    conn && (conn.protected ?? (conn.status === 'active' && conn.enforcementCapable !== false));
  if (isProtected) return null;

  const readOnly = conn && conn.enforcementCapable === false && conn.status === 'active';
  const title = readOnly ? 'Alerts only — enforcement is off' : 'Unprotected — kill switch is off';
  const body = readOnly
    ? 'Your key is read-only, so rules can alert but cannot auto-close positions. Reconnect with a Trading-scoped, IP-whitelisted key to enforce.'
    : 'No enforcing key is connected. Your rules are not being enforced on this account — reconnect Delta to turn the kill switch back on.';

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3"
      style={{ borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.06)' }}
    >
      <svg className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.48 14.7A1.5 1.5 0 003.11 21h17.78a1.5 1.5 0 001.3-2.44l-8.48-14.7a1.5 1.5 0 00-2.6 0z" />
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>{body}</p>
      </div>
    </div>
  );
}
