import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTradingAccounts } from '../../../context/TradingAccountContext';
import { useGuard } from '../../../context/GuardContext';
import { acknowledgeBreaches } from '../../../api/breachesApi';
import { sx } from './sx';

/**
 * Breach toast — reference lines 394–415. Shows the newest unacknowledged
 * breach for the selected account, once, while the dashboard is open.
 * Auto-dismisses after 9s; "See what happened" goes to Live guard.
 *
 * Reads the unread list GuardContext already polls rather than polling
 * /breaches itself: it was the third consumer of that endpoint on a 30s
 * timer, asking for rows the context had fetched seconds earlier.
 */
const AUTO_MS = 9_000;

function timeOf(iso) {
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST'; } catch { return ''; }
}

export default function BreachToast() {
  const { session } = useAuth();
  const { selectedTradingAccountId, selectedAccount } = useTradingAccounts();
  const { unreadList } = useGuard();
  const navigate = useNavigate();
  const [breach, setBreach] = useState(null);
  const [seen, setSeen] = useState(() => new Set());
  const accessToken = session?.access_token;

  // Newest unread breach on this account that has not been shown yet.
  const candidate = useMemo(() => {
    if (!selectedTradingAccountId) return null;
    return (unreadList ?? []).find((b) => b.tradingAccountId === selectedTradingAccountId && !seen.has(b.id)) ?? null;
  }, [unreadList, selectedTradingAccountId, seen]);

  useEffect(() => {
    if (candidate) setBreach(candidate);
  }, [candidate]);

  const dismiss = () => {
    if (!breach) return;
    setSeen((s) => new Set(s).add(breach.id));
    acknowledgeBreaches({ accessToken, ids: [breach.id] }).catch(() => {});
    setBreach(null);
  };

  useEffect(() => {
    if (!breach) return undefined;
    // Time running out is not the user reading it: hide, but leave it unread for the bell.
    const t = setTimeout(() => { setSeen((s) => new Set(s).add(breach.id)); setBreach(null); }, AUTO_MS);
    return () => clearTimeout(t);
  }, [breach]);

  if (!breach) return null;
  const rule = breach.ruleSlug || breach.breachType || 'Rule';
  const name = String(rule).replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div data-tgx-toast="1" role="status" style={sx('position:fixed;top:76px;right:24px;z-index:80;width:370px;max-width:calc(100vw - 40px);border:1px solid var(--red-line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxSlide .2s ease-out')}>
      <div style={sx('height:3px;background:var(--red-solid)')} />
      <div style={sx('display:flex;align-items:flex-start;gap:12px;padding:15px 16px')}>
        <span style={sx('flex:none;width:32px;height:32px;border-radius:10px;background:var(--red-tint);display:grid;place-items:center;color:var(--red)')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3.6L21 19H3l9-15.4z" /><path d="M12 10v4M12 16.8h.01" /></svg>
        </span>
        <div style={sx('flex:1;min-width:0')}>
          <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
            <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.13em;text-transform:uppercase;color:var(--red)")}>Rule breached</span>
            <span style={sx('font-size:11.5px;color:var(--ink-faint);font-variant-numeric:tabular-nums')}>{timeOf(breach.createdAt)}</span>
          </div>
          <div style={sx('margin-top:6px;font-size:13.5px;font-weight:600;line-height:1.4')}>{name} fired on {selectedAccount?.name}</div>
          <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{breach.message}</p>
          <div style={sx('display:flex;gap:8px;margin-top:11px;flex-wrap:wrap')}>
            <button type="button" onClick={() => { dismiss(); navigate('/dashboard/live'); }} style={sx('padding:7px 12px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface-2);color:var(--ink);font-size:12px;font-weight:700')}>See what happened</button>
            <button type="button" onClick={dismiss} style={sx('padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink-3);font-size:12px;font-weight:600')}>Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}
