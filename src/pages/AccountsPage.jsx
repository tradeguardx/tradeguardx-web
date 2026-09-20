import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { fetchSupportedProps } from '../api/tradingAccountsApi';
import { disconnectExchangeCredentials } from '../api/exchangeCredentialsApi';
import { maxTradingAccountsForPlan } from '../lib/planLimits';
import { brokerLabel } from '../lib/labels';
import { AddAccountForm } from './TradingAccountsPage';
import { sx } from '../components/dashboard/shell/sx';

/**
 * Accounts — transcribed from the reference (lines 1703–1768) plus the
 * disconnect confirm (417–430). One card per account: tag, label, state
 * chip, venue · server-side enforcement, rules-on count, an action that
 * always navigates, and the Delta India API connection block.
 *
 * Creation is the existing AddAccountForm, unchanged — it opens in place of
 * the "Add another account" panel. Never a balance figure anywhere here.
 */

function tagOf(name) {
  const n = (name || '').trim();
  if (!n) return '—';
  const parts = n.split(/[\s·]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : n.slice(0, 2)).toUpperCase();
}

function fmtVerified(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return iso; }
}

export default function AccountsPage() {
  const { session, user } = useAuth();
  const { accounts, accountsLoading, refreshTradingAccounts, setSelectedTradingAccountId } = useTradingAccounts();
  const guard = useGuard();
  const toast = useToast();
  const navigate = useNavigate();
  const accessToken = session?.access_token;

  const [showAdd, setShowAdd] = useState(false);
  const [supportedProps, setSupportedProps] = useState([]);
  const [propsLoading, setPropsLoading] = useState(false);
  const [dc, setDc] = useState(null); // account pending disconnect
  const [dcBusy, setDcBusy] = useState(false);

  useEffect(() => {
    if (!showAdd || !accessToken || supportedProps.length) return undefined;
    let cancelled = false;
    setPropsLoading(true);
    fetchSupportedProps({ accessToken })
      .then((rows) => { if (!cancelled) setSupportedProps(rows); })
      .catch((e) => { if (!cancelled) toast.error('Could not load venues', e?.message); })
      .finally(() => { if (!cancelled) setPropsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdd, accessToken]);

  const maxAccounts = maxTradingAccountsForPlan(user?.plan);
  const planName = user?.planLabel || 'Free';
  const capLine = maxAccounts == null ? `Your ${planName} plan has no account limit.` : `Your ${planName} plan covers ${maxAccounts === 1 ? 'one' : maxAccounts === 5 ? 'five' : maxAccounts}.`;
  const atCap = maxAccounts != null && accounts.length >= maxAccounts;

  const go = (id, to) => { setSelectedTradingAccountId(id); navigate(to); };

  const confirmDisconnect = async () => {
    if (!dc) return;
    setDcBusy(true);
    try {
      await disconnectExchangeCredentials({ accessToken, accountId: dc.id });
      await refreshTradingAccounts?.(); await guard.refresh();
      toast.success('Key disconnected', 'Trade history and tax records are untouched.');
      setDc(null);
    } catch (e) { toast.error('Could not disconnect', e?.message || 'Try again.'); }
    finally { setDcBusy(false); }
  };

  const dcState = dc ? guard.stateFor(dc.id) : null;
  const dcBody = dc
    ? dcState.enforcement === 'armed'
      ? `We delete the key immediately and stop enforcing on ${dc.name}. Your rules stay written down, but nothing will close a position for you until a new key is connected. Trade history and tax records are untouched.`
      : `We delete the stored key for ${dc.name}. Nothing is being enforced on this account today, so this changes what we can see, not what we can stop. Trade history and tax records are untouched.`
    : '';

  return (
    <div style={sx('max-width:980px')}>
      <div style={sx('margin-bottom:16px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Accounts</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Each account has its own rules, its own guard state and its own history. Nothing is shared between them.</p>
      </div>

      {accountsLoading && accounts.length === 0 && <p style={sx('font-size:12.5px;color:var(--ink-3)')}>Loading…</p>}

      {accounts.map((a) => {
        const st = guard.stateFor(a.id);
        const d = st.describe;
        const tone = d.tone;
        const locked = st.guard === 'locked';
        const venue = a.propFirmSlug ? brokerLabel(a.propFirmSlug) : 'No venue yet';
        const conn = st.connection;
        const hasKey = conn && conn.status === 'active';
        const key = !hasKey
          ? { has: false, badge: 'Not connected', fg: 'var(--red)', bg: 'var(--red-tint)', scope: 'No key — nothing is being enforced on this account', note: '' }
          : st.enforcement === 'watching' || conn.enforcementCapable === false
            ? { has: true, badge: 'Read-only', fg: 'var(--amber)', bg: 'var(--amber-tint)', scope: 'Read-only scope — we can see fills but cannot close anything', note: locked ? 'Key changes are blocked while the kill switch runs.' : 'Replace this with a trading-scope key and the engine starts enforcing on the next fill.' }
            : { has: true, badge: 'Connected', fg: 'var(--mint)', bg: 'var(--mint-tint)', scope: 'Trading scope — can cancel orders and close positions', note: locked ? 'Key changes are blocked while the kill switch runs. That is deliberate: swapping the key would be a way to switch the lockout off.' : '' };
        const action = d.action;
        const to = d.to;
        return (
          <section key={a.id} style={sx('margin-bottom:12px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden', { border: `1px solid var(--${tone}-line)` })}>
            <div style={sx('display:flex;align-items:center;gap:15px;padding:17px 19px;flex-wrap:wrap')}>
              <span style={sx("flex:none;width:38px;height:38px;border-radius:11px;background:var(--surface-2);border:1px solid var(--line);display:grid;place-items:center;font:600 12px/1 'JetBrains Mono',monospace;color:var(--ink-2)")}>{tagOf(a.name)}</span>
              <span style={sx('flex:1;min-width:200px')}>
                <span style={sx('display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
                  <span style={sx('font-size:14.5px;font-weight:600')}>{a.name}</span>
                  <span style={sx('font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 8px;border-radius:999px', { background: `var(--${tone}-tint)`, color: `var(--${tone})` })}>{d.label}</span>
                </span>
                <span style={sx('display:block;font-size:12.5px;color:var(--ink-3);margin-top:4px')}>{venue} · server-side enforcement</span>
              </span>
              <span style={sx('flex:none;text-align:right')}>
                <span style={sx('display:block;font-size:12px;color:var(--ink-3)')}>{locked ? 'Rules and keys locked while the lockout runs' : `${st.rulesOn} of ${st.rulesTotal} rules on`}</span>
              </span>
              <button type="button" onClick={() => go(a.id, to)} style={sx('flex:none;padding:9px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700')}>{action}</button>
            </div>

            <div style={sx('padding:16px 19px;border-top:1px solid var(--line);background:var(--surface-2)')}>
              <div style={sx('display:flex;align-items:center;gap:10px;margin-bottom:11px;flex-wrap:wrap')}>
                <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint)")}>Delta India API connection</span>
                <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;padding:4px 8px;border-radius:999px", { background: key.bg, color: key.fg })}>{key.badge}</span>
              </div>

              {key.has ? (
                <div style={sx('padding:14px 15px;border:1px solid var(--line);border-radius:13px;background:var(--surface)')}>
                  <div style={sx('display:grid;gap:5px;font-size:12.5px;color:var(--ink-2)')}>
                    <span>Delta user: <strong style={sx('color:var(--ink);font-weight:600')}>{user?.email ?? '—'}</strong></span>
                    <span>Account ID: <strong style={sx('color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums')}>{conn.exchangeAccountId ?? '—'}</strong></span>
                    <span>Last verified: <strong style={sx('color:var(--ink);font-weight:600')}>{fmtVerified(conn.lastValidatedAt)}</strong></span>
                    <span style={sx('color:var(--ink-3);margin-top:2px')}>{key.scope}</span>
                  </div>
                  {!locked && (
                    <div style={sx('display:flex;gap:9px;margin-top:13px;flex-wrap:wrap')}>
                      <button type="button" onClick={() => go(a.id, '/dashboard/connect')} style={sx('padding:9px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:600')}>Replace key</button>
                      <button type="button" onClick={() => setDc(a)} style={sx('padding:9px 14px;border:1px solid var(--red-line);border-radius:9px;background:transparent;color:var(--red);font-size:12.5px;font-weight:600')}>Disconnect</button>
                    </div>
                  )}
                  {key.note && <p style={sx('margin:12px 0 0;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);font-size:12px;line-height:1.55;color:var(--ink-2)')}>{key.note}</p>}
                </div>
              ) : (
                <div style={sx('display:flex;align-items:center;gap:12px;padding:14px 15px;border:1px dashed var(--line-strong);border-radius:13px;background:var(--surface);flex-wrap:wrap')}>
                  <span style={sx('flex:1;min-width:230px;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{key.scope}</span>
                  <button type="button" onClick={() => go(a.id, '/dashboard/connect')} style={sx('flex:none;padding:9px 14px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>Connect key</button>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {showAdd ? (
        <section style={sx('padding:19px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card)')}>
          {propsLoading && supportedProps.length === 0 ? (
            <p style={sx('margin:0;font-size:12.5px;color:var(--ink-3)')}>Loading venues…</p>
          ) : (
            <AddAccountForm
              accessToken={accessToken}
              supportedProps={supportedProps}
              onCreated={async () => { setShowAdd(false); await refreshTradingAccounts(); await guard.refresh(); }}
              onCancel={() => setShowAdd(false)}
              toast={toast}
            />
          )}
        </section>
      ) : (
        <section style={sx('padding:19px;border:1px dashed var(--line-strong);border-radius:14px;background:var(--surface-2)')}>
          <div style={sx('font-size:14px;font-weight:600')}>Add another account</div>
          <p style={sx('margin:5px 0 12px;font-size:12.5px;color:var(--ink-2);max-width:70ch')}>{capLine} Delta Exchange is the only venue we support today — CoinDCX and prop-firm support are in progress, and we will say so plainly rather than list them as if they work.</p>
          <button type="button" disabled={atCap} onClick={() => setShowAdd(true)} style={sx('padding:9px 14px;border-radius:9px;font-size:12.5px;font-weight:700', atCap ? { border: '1px solid var(--surface-3)', background: 'var(--surface-3)', color: 'var(--ink-3)', cursor: 'not-allowed' } : { border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--surface)' })}>{atCap ? `Plan limit reached (${maxAccounts})` : 'Choose a venue'}</button>
        </section>
      )}

      {dc && (
        <div data-tgx-modal="1" onClick={() => !dcBusy && setDc(null)} role="presentation" style={sx('position:fixed;inset:0;z-index:70;background:rgba(3,5,10,.72);backdrop-filter:blur(6px);display:grid;place-items:center;padding:24px')}>
          <div role="dialog" aria-modal="true" aria-labelledby="dc-title" onClick={(e) => e.stopPropagation()} style={sx('width:100%;max-width:430px;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxSlide .18s ease-out')}>
            <div style={sx('padding:21px 23px 17px')}>
              <h2 id="dc-title" style={sx("margin:0;font:600 17px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>Disconnect the key on {dc.name}?</h2>
              <p style={sx('margin:9px 0 0;font-size:13px;line-height:1.6;color:var(--ink-2)')}>{dcBody}</p>
            </div>
            <div style={sx('display:flex;gap:9px;padding:15px 23px;border-top:1px solid var(--line);background:var(--surface-2)')}>
              <button type="button" disabled={dcBusy} onClick={confirmDisconnect} style={sx('flex:1;padding:11px;border:1px solid var(--red-btn);border-radius:10px;background:var(--red-btn);color:#fff;font-size:12.5px;font-weight:700')}>{dcBusy ? 'Disconnecting…' : 'Disconnect key'}</button>
              <button type="button" disabled={dcBusy} onClick={() => setDc(null)} style={sx('padding:11px 15px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600')}>Keep it connected</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
