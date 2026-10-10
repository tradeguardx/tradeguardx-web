import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTradingAccounts } from '../../../context/TradingAccountContext';
import { useGuard } from '../../../context/GuardContext';
import { useShare } from '../../../context/ShareContext';
import { acknowledgeBreaches } from '../../../api/breachesApi';
import { sx } from './sx';
import { isUnenforced, ruleNameOf } from '../../../lib/lifecycle';

/**
 * Breach toast — reference lines 394–415. Shows the newest unacknowledged
 * breach on ANY of the user's accounts, once, while the dashboard is open.
 * Auto-dismisses after 9s; "See what happened" goes to Live guard.
 *
 * Deliberately not scoped to the selected account. A kill switch firing is
 * the most urgent thing this product ever says, and which account happens to
 * be on screen has nothing to do with which account is in trouble — someone
 * watching CoinDCX would have seen nothing while their Delta account was
 * being flattened. The row names its account, and switching to it is one
 * click on "See what happened".
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
  const { accounts, selectedTradingAccountId, setSelectedTradingAccountId } = useTradingAccounts();
  const { unreadList } = useGuard();
  const { openShare, canShare } = useShare();
  const navigate = useNavigate();
  const [breach, setBreach] = useState(null);
  const [seen, setSeen] = useState(() => new Set());
  const accessToken = session?.access_token;

  // Newest unread breach on any account that has not been shown yet.
  const candidate = useMemo(
    () => (unreadList ?? []).find((b) => !seen.has(b.id)) ?? null,
    [unreadList, seen],
  );
  const breachAccountName = breach
    ? accounts.find((a) => a.id === breach.tradingAccountId)?.name ?? 'your account'
    : '';

  useEffect(() => {
    if (candidate) setBreach(candidate);
  }, [candidate]);

  const dismiss = () => {
    if (!breach) return;
    setSeen((s) => new Set(s).add(breach.id));
    acknowledgeBreaches({ accessToken, ids: [breach.id] }).catch(() => {});
    setBreach(null);
  };

  // Sharing the save hides the toast — the modal would otherwise open behind
  // it and the 9s timer would keep running underneath. Unlike dismiss() this
  // does not acknowledge: the breach stays unread for the bell, same as the
  // timeout path, because opening a share card is not reading the breach.
  const share = () => {
    if (!breach) return;
    setSeen((s) => new Set(s).add(breach.id));
    setBreach(null);
    openShare('trade');
  };

  useEffect(() => {
    if (!breach) return undefined;
    // Time running out is not the user reading it: hide, but leave it unread for the bell.
    const t = setTimeout(() => { setSeen((s) => new Set(s).add(breach.id)); setBreach(null); }, AUTO_MS);
    return () => clearTimeout(t);
  }, [breach]);

  if (!breach) return null;
  /*
   * Three kinds, three faces. A rule the guard acted on is red "Limit hit"
   * and goes to Live guard. A rule reached with no plan is amber "Not
   * enforced" and goes to Plan & billing — Live guard is locked for them, so
   * sending them there led to a locked page. A warning is amber, not a hit.
   */
  const notEnforced = isUnenforced(breach);
  const warning = !notEnforced && String(breach.severity).toLowerCase() === 'warning';
  const tone = notEnforced || warning ? 'amber' : 'red';
  const kicker = notEnforced ? 'Not enforced' : warning ? 'Warning' : 'Limit hit';
  const name = notEnforced ? ruleNameOf(breach.ruleSlug) : String(breach.ruleSlug || breach.breachType || 'Rule').replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const headline = notEnforced ? `${name} reached on ${breachAccountName}` : `${name} fired on ${breachAccountName}`;
  const go = notEnforced && breach.context?.reason === 'unentitled'
    ? { label: 'See plans', to: '/dashboard/account/billing' }
    : { label: 'See what happened', to: '/dashboard/live' };

  return (
    <div data-tgx-toast="1" role="status" style={sx('position:fixed;top:76px;right:24px;z-index:80;width:370px;max-width:calc(100vw - 40px);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxSlide .2s ease-out', { border: `1px solid var(--${tone}-line)` })}>
      <div style={sx('height:3px', { background: `var(--${tone}-solid)` })} />
      <div style={sx('display:flex;align-items:flex-start;gap:12px;padding:15px 16px')}>
        <span style={sx('flex:none;width:32px;height:32px;border-radius:10px;display:grid;place-items:center', { background: `var(--${tone}-tint)`, color: `var(--${tone})` })}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3.6L21 19H3l9-15.4z" /><path d="M12 10v4M12 16.8h.01" /></svg>
        </span>
        <div style={sx('flex:1;min-width:0')}>
          <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
            <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.13em;text-transform:uppercase", { color: `var(--${tone})` })}>{kicker}</span>
            <span style={sx('font-size:11.5px;color:var(--ink-faint);font-variant-numeric:tabular-nums')}>{timeOf(breach.createdAt)}</span>
          </div>
          <div style={sx('margin-top:6px;font-size:13.5px;font-weight:600;line-height:1.4')}>{headline}</div>
          <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{breach.message}</p>
          <div style={sx('display:flex;gap:8px;margin-top:11px;flex-wrap:wrap')}>
            {canShare && !notEnforced && <button
              type="button"
              onClick={share}
              style={sx('display:flex;align-items:center;gap:6px;padding:7px 12px;border:0;border-radius:8px;background:var(--mint-solid);color:#02241d;font-size:12px;font-weight:700')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 13v6h14v-6" /></svg>
              Share this save
            </button>}
            <button
              type="button"
              onClick={() => {
                // Switch to the account that breached first — otherwise Live
                // guard opens on a different account and shows nothing wrong.
                const id = breach.tradingAccountId;
                dismiss();
                if (id && id !== selectedTradingAccountId) setSelectedTradingAccountId?.(id);
                navigate(go.to);
              }}
              style={sx('padding:7px 12px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface-2);color:var(--ink);font-size:12px;font-weight:700')}
            >
              {go.label}
            </button>
            <button type="button" onClick={dismiss} style={sx('padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink-3);font-size:12px;font-weight:600')}>Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}
