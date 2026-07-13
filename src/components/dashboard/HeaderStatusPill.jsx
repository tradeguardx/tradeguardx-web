import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { getExchangeCredentialsStatus, exchangeFromBrokerSlug } from '../../api/exchangeCredentialsApi';

function fmtShort(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (x) => String(x).padStart(2, '0');
  if (h > 0) return `${h}h ${pad(m)}m`;
  const sec = s % 60;
  return `${m}m ${pad(sec)}s`;
}

/**
 * Compact account-status pill for the dashboard header — always visible so the
 * user knows their state from any page. Priority: Locked (cooldown) > Unprotected
 * (no enforcing key) > Protected. Only renders for Delta accounts.
 */
export default function HeaderStatusPill() {
  const { session } = useAuth();
  const { selectedAccount } = useTradingAccounts();
  const accessToken = session?.access_token;

  const isDelta = Boolean(selectedAccount && exchangeFromBrokerSlug(selectedAccount.propFirmSlug));
  const [conn, setConn] = useState(undefined);
  const [now, setNow] = useState(() => Date.now());

  // Fetch connection status (for protected/unprotected) when the account changes.
  useEffect(() => {
    if (!accessToken || !selectedAccount?.id || !isDelta) {
      setConn(undefined);
      return;
    }
    const ctrl = new AbortController();
    getExchangeCredentialsStatus({ accessToken, accountId: selectedAccount.id, signal: ctrl.signal })
      .then((c) => setConn(c))
      .catch(() => {});
    return () => ctrl.abort();
  }, [accessToken, selectedAccount?.id, isDelta]);

  const cooldownUntil = selectedAccount?.cooldownUntil ?? selectedAccount?.cooldown_until ?? null;
  const locked = Boolean(cooldownUntil && new Date(cooldownUntil).getTime() > now);

  // Tick every second only while locked (for the countdown).
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked]);

  const state = useMemo(() => {
    if (!isDelta) return null;
    if (locked) {
      const left = new Date(cooldownUntil).getTime() - now;
      return { key: 'locked', label: `Locked · ${fmtShort(left)}`, color: '#f59e0b', dot: '#f59e0b' };
    }
    // Not locked — reflect enforcement capability once the connection loads.
    if (conn === undefined) return null; // still loading; show nothing yet
    const isProtected =
      conn && (conn.protected ?? (conn.status === 'active' && conn.enforcementCapable !== false));
    if (isProtected) return { key: 'protected', label: 'Protected', color: '#34d399', dot: '#34d399' };
    return { key: 'unprotected', label: 'Unprotected', color: '#ef4444', dot: '#ef4444' };
  }, [isDelta, locked, cooldownUntil, now, conn]);

  if (!state) return null;

  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide sm:inline-flex"
      title={state.key === 'locked' ? 'Kill switch cooldown active' : state.key === 'unprotected' ? 'No enforcing key — rules are not being enforced' : 'Kill switch active'}
      style={{ borderColor: `${state.color}55`, backgroundColor: `${state.color}14`, color: state.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: state.dot, boxShadow: `0 0 6px ${state.dot}` }} />
      {state.label}
    </span>
  );
}
