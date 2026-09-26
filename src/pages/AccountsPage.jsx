import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { fetchSupportedProps } from '../api/tradingAccountsApi';
import { disconnectExchangeCredentials } from '../api/exchangeCredentialsApi';
import { checkAccountDeletable, deleteTradingAccount } from '../api/tradingAccountsApi';
import { maxTradingAccountsForPlan } from '../lib/planLimits';
import { brokerLabel } from '../lib/labels';
import AddVenueWizard from '../components/dashboard/AddVenueWizard';
import VenueMark, { VenueBetaBadge } from '../components/dashboard/VenueMark';
import { sx } from '../components/dashboard/shell/sx';

/**
 * Accounts — transcribed from the reference (lines 1703–1768) plus the
 * disconnect confirm (417–430). One card per account: tag, label, state
 * chip, venue · server-side enforcement, rules-on count, an action that
 * always navigates, and the exchange API connection block.
 *
 * Creation is the existing AddAccountForm, unchanged — it opens in place of
 * the "Add another account" panel. Never a balance figure anywhere here.
 */

function fmtVerified(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return iso; }
}

export default function AccountsPage() {
  const { session, user } = useAuth();
  const { accounts, accountsLoading, refreshTradingAccounts, setSelectedTradingAccountId, selectedTradingAccountId } = useTradingAccounts();
  const guard = useGuard();
  const toast = useToast();
  const navigate = useNavigate();
  const accessToken = session?.access_token;

  const [showAdd, setShowAdd] = useState(false);
  const [supportedProps, setSupportedProps] = useState([]);
  const [propsLoading, setPropsLoading] = useState(false);
  const [dc, setDc] = useState(null); // account pending disconnect
  const [dcBusy, setDcBusy] = useState(false);
  /**
   * Delete flow. `del` is the account being considered, `delCheck` the
   * server's answer about whether it may go and what goes with it.
   *
   * The check is asked for BEFORE the confirmation is shown, so the dialog can
   * name what will be destroyed rather than warn in the abstract. Every FK
   * into trading_accounts is ON DELETE CASCADE — the journal, the trades, the
   * breach history, the rules, and the records the tax centre reads.
   */
  const [del, setDel] = useState(null);
  const [delCheck, setDelCheck] = useState(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delTyped, setDelTyped] = useState('');

  const openDelete = async (a) => {
    setDel(a);
    setDelCheck(null);
    setDelTyped('');
    try {
      setDelCheck(await checkAccountDeletable({ accessToken, accountId: a.id }));
    } catch (e) {
      setDelCheck({ deletable: false, blockers: [{ code: 'CHECK_FAILED', message: e?.message || 'Could not check this account.' }], counts: null });
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setDelBusy(true);
    try {
      await deleteTradingAccount({ accessToken, accountId: del.id });
      toast.success('Account removed', `${del.name} is gone from your dashboard. Its records are kept for tax.`);
      setDel(null);
      await refreshTradingAccounts();
      await guard.refresh();
    } catch (e) {
      toast.error('Could not delete', e?.message || 'Try again.');
    } finally {
      setDelBusy(false);
    }
  };
  /** Venue chosen from the picker; opening the wizard modal. */
  const [addSlug, setAddSlug] = useState('');

  /**
   * One connection block open at a time — the account you are actually on.
   *
   * Every card used to render its API-connection panel expanded, so with three
   * accounts the page was three full connection blocks deep and connecting a
   * key meant scrolling past the two you did not want. The summary row stays
   * visible on every card (name, guard state, venue, rules on): that is enough
   * to compare accounts at a glance, which is what this page is for. The
   * details behind it — key status, account id, replace/disconnect — are only
   * ever about one account at a time.
   *
   * DERIVED from the selection rather than synced into state. An effect that
   * copied it would cascade a render on every switch and then need a second
   * effect to drop a manual toggle when the selection moved. Tying the
   * override to the selection it was made under does both: change account and
   * the override is no longer current, so it lapses on its own.
   */
  const [override, setOverride] = useState(null);
  const manual = override && override.forSelection === selectedTradingAccountId ? override : null;
  const openId = manual ? manual.id : selectedTradingAccountId || accounts[0]?.id || null;
  const toggleCard = (id) =>
    setOverride({ forSelection: selectedTradingAccountId, id: openId === id ? null : id });

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

  // Before the subscription answers the plan is unknown, not free. Capping a
  // paying user at the free limit for that second disabled the one button
  // they came to press; the server enforces the real limit either way.
  const planKnown = Boolean(user?.planKnown);
  const maxAccounts = planKnown ? maxTradingAccountsForPlan(user?.plan) : null;
  const planName = planKnown ? user.planLabel || 'Free' : '';
  const capLine = !planKnown
    ? 'Checking your plan…'
    : maxAccounts == null
      ? `Your ${planName} plan has no account limit.`
      : `Your ${planName} plan covers ${maxAccounts === 1 ? 'one' : maxAccounts === 5 ? 'five' : maxAccounts}.`;
  const atCap = planKnown && maxAccounts != null && accounts.length >= maxAccounts;

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
        // "Not connected" is a claim; make it only once the fetch has landed.
        const key = !st.loaded
          ? { has: false, badge: 'Checking…', fg: 'var(--ink-3)', bg: 'var(--surface-3)', scope: 'Reading this account’s key status', note: '' }
          : !hasKey
          ? { has: false, badge: 'Not connected', fg: 'var(--red)', bg: 'var(--red-tint)', scope: 'No key — nothing is being enforced on this account', note: '' }
          : st.enforcement === 'watching' || conn.enforcementCapable === false
            ? { has: true, badge: 'Read-only', fg: 'var(--amber)', bg: 'var(--amber-tint)', scope: 'Read-only scope — we can see fills but cannot close anything', note: locked ? 'Key changes are blocked while the kill switch runs.' : 'Replace this with a trading-scope key and the engine starts enforcing on the next fill.' }
            : { has: true, badge: 'Connected', fg: 'var(--mint)', bg: 'var(--mint-tint)', scope: 'Trading scope — can cancel orders and close positions', note: locked ? 'Key changes are blocked while the kill switch runs. That is deliberate: swapping the key would be a way to switch the lockout off.' : '' };
        const action = d.action;
        const to = d.to;
        return (
          <section key={a.id} style={sx('margin-bottom:12px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden', { border: `1px solid var(--${tone}-line)` })}>
            {/* A hairline in the guard's colour: the card's state is readable
                before any text is, and it costs no vertical space. */}
            <div style={sx('height:3px', { background: `var(--${tone}-solid)`, opacity: 0.85 })} />
            <div style={sx('display:flex;align-items:center;gap:14px;padding:16px 19px;flex-wrap:wrap')}>
              <VenueMark slug={a.propFirmSlug} name={a.name} size={40} radius={12} />
              <span style={sx('flex:1;min-width:min(200px,100%)')}>
                <span style={sx('display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
                  <span style={sx('font-size:15px;font-weight:600;letter-spacing:-.006em')}>{a.name}</span>
                  <span style={sx("font:700 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;padding:4px 8px;border-radius:999px", { background: `var(--${tone}-tint)`, color: `var(--${tone})` })}>{d.label}</span>
                </span>
                <span style={sx('display:flex;align-items:center;gap:7px;margin-top:5px;font-size:12.5px;color:var(--ink-3);flex-wrap:wrap')}>
                  <span>{venue}</span>
                  <VenueBetaBadge slug={a.propFirmSlug} />
                  <span style={sx('width:3px;height:3px;border-radius:50%;background:var(--ink-faint)')} />
                  <span>server-side enforcement</span>
                </span>
              </span>
              <span style={sx('flex:none;text-align:right;min-width:92px')}>
                {locked ? (
                  <span style={sx('display:block;font-size:12px;color:var(--ink-3);max-width:20ch')}>Rules and keys locked while the lockout runs</span>
                ) : (
                  <>
                    <span style={sx("display:block;font:600 18px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: st.rulesOn > 0 ? 'var(--ink)' : 'var(--ink-3)' })}>{st.rulesOn}<span style={sx('font-size:13px;color:var(--ink-faint)')}>/{st.rulesTotal}</span></span>
                    <span style={sx("display:block;margin-top:3px;font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-faint)")}>rules on</span>
                  </>
                )}
              </span>
              <button type="button" onClick={() => go(a.id, to)} style={sx('flex:none;padding:9px 15px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700')}>{action}</button>
              {/* Its own control, not a click handler on the whole row: the row
                  already holds a primary action, and a card that navigates OR
                  expands depending on where you land is a coin toss. */}
              <button
                type="button"
                onClick={() => toggleCard(a.id)}
                className="acct-card__chevron"
                aria-expanded={openId === a.id}
                aria-label={`${openId === a.id ? 'Hide' : 'Show'} ${a.name} connection details`}
                style={sx('flex:none;display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink-3);cursor:pointer;transition:transform .18s ease', { transform: openId === a.id ? 'rotate(180deg)' : 'none' })}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </div>

            {openId === a.id && (
            <div style={sx('padding:16px 19px 18px;border-top:1px solid var(--line);background:var(--surface-2)')}>
              <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:12px;flex-wrap:wrap')}>
                <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint)")}>{venue} API connection</span>
                <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;padding:4px 8px;border-radius:999px", { background: key.bg, color: key.fg })}>{key.badge}</span>
              </div>

              {key.has ? (
                <div style={sx('padding:15px 16px;border:1px solid var(--line);border-radius:13px;background:var(--surface)')}>
                  <div style={sx('display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:12.5px;align-items:baseline')}>
                    {[
                      ['Exchange user', user?.email ?? '—', false],
                      ['Account ID', conn.exchangeAccountId ?? '—', true],
                      ['Last verified', fmtVerified(conn.lastValidatedAt), false],
                    ].map(([k, val, mono]) => (
                      <Fragment key={k}>
                        <span style={sx('color:var(--ink-faint);white-space:nowrap')}>{k}</span>
                        <span style={sx('color:var(--ink);font-weight:600;overflow-wrap:anywhere', mono ? { fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: 'tabular-nums' } : {})}>{val}</span>
                      </Fragment>
                    ))}
                  </div>
                  <div style={sx('display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:12.5px', { color: `var(--${key.has && key.badge === 'Connected' ? 'mint' : 'amber'})` })}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M20 6L9 17l-5-5" /></svg>
                    <span style={sx('color:var(--ink-2)')}>{key.scope}</span>
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
                  <span style={sx('flex:1;min-width:min(230px,100%);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{key.scope}</span>
                  <button type="button" onClick={() => go(a.id, '/dashboard/connect')} style={sx('flex:none;padding:9px 14px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>Connect key</button>
                  {/* Only offered with no key attached — a connected key is
                      itself a blocker, so showing Delete beside a live
                      connection would be an button that always refuses. It is
                      still gated server-side; this only avoids offering it. */}
                  {!locked && (
                    <button type="button" onClick={() => openDelete(a)} style={sx('flex:none;padding:9px 12px;border:0;background:none;color:var(--ink-3);font-size:12px;font-weight:600;text-decoration:underline;cursor:pointer')}>Delete account</button>
                  )}
                </div>
              )}
            </div>
            )}
          </section>
        );
      })}

      {showAdd ? (
        /* The picker stays on the page; choosing a venue opens the rest in a
           modal. Adding an account is a short, complete task — inline it sat
           under the existing accounts and the page kept growing beneath it,
           so the thing you were doing was never the thing in front of you. */
        <section style={sx('padding:19px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card)')}>
          <p style={sx("margin:0 0 12px;font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-faint)")}>Choose your venue</p>
          {propsLoading && supportedProps.length === 0 ? (
            <p style={sx('margin:0;font-size:12.5px;color:var(--ink-3)')}>Loading venues…</p>
          ) : (
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:9px')}>
              {supportedProps.map((pf) => {
                const planned = pf.status === 'planned';
                return (
                  <button
                    key={pf.brokerId}
                    type="button"
                    disabled={planned}
                    onClick={() => setAddSlug(pf.brokerId)}
                    style={sx('display:flex;align-items:center;gap:10px;padding:12px 13px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2);text-align:left;cursor:pointer', planned ? { opacity: 0.5, cursor: 'not-allowed' } : {})}
                  >
                    <VenueMark slug={pf.brokerId} name={pf.name} size={30} radius={9} />
                    <span style={sx('flex:1;min-width:0')}>
                      <span style={sx('display:block;font-size:13px;font-weight:600')}>{pf.name}</span>
                      <span style={sx('display:block;margin-top:2px;font-size:11.5px;color:var(--ink-3)')}>{planned ? 'Coming soon' : 'Server-side enforcement'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" onClick={() => setShowAdd(false)} style={sx('margin-top:13px;padding:0;border:0;background:none;color:var(--ink-3);font-size:12px;font-weight:600;text-decoration:underline;cursor:pointer')}>Cancel</button>
        </section>
      ) : (
        <section style={sx('padding:20px;border:1px dashed var(--line-strong);border-radius:16px;background:var(--surface-2)')}>
          <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
            <div style={sx('font-size:14.5px;font-weight:600')}>Add another account</div>
            {/* The venues, shown rather than listed — the marks answer "is my
                exchange here?" faster than the sentence below does. */}
            <div style={sx('display:flex;align-items:center;gap:6px')}>
              <VenueMark slug="delta_india" name="Delta" size={22} radius={7} />
              <VenueMark slug="coindcx" name="CoinDCX" size={22} radius={7} />
              <VenueBetaBadge slug="coindcx" />
            </div>
          </div>
          <p style={sx('margin:7px 0 13px;font-size:12.5px;line-height:1.6;color:var(--ink-2);max-width:70ch')}>{capLine} Delta Exchange and CoinDCX Futures are the venues we enforce on today — prop-firm support is in progress, and we will say so plainly rather than list it as if it works.</p>
          <button type="button" disabled={atCap} onClick={() => setShowAdd(true)} style={sx('padding:10px 15px;border-radius:10px;font-size:12.5px;font-weight:700', atCap ? { border: '1px solid var(--surface-3)', background: 'var(--surface-3)', color: 'var(--ink-3)', cursor: 'not-allowed' } : { border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--surface)' })}>{atCap ? `Plan limit reached (${maxAccounts})` : 'Choose a venue'}</button>
        </section>
      )}

      {addSlug && (
        /* The wizard in a modal. Adding a venue is a short task with a clear
           end, and inline it sat below the existing accounts with the page
           growing beneath it — so the thing being done was never the thing in
           front of you. The backdrop does NOT close it: three stages in, a
           stray tap outside would discard a created account and a pasted key. */
        <motion.div
          data-tgx-modal="1"
          className="wiz-modal"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
          style={sx('position:fixed;inset:0;z-index:70;background:rgba(3,5,10,.72);backdrop-filter:blur(6px);display:grid;place-items:start center;padding:24px;overflow-y:auto')}
        >
          {/* Rises slightly rather than appearing. A dialog that snaps into
              existence reads as a page change; a short lift reads as something
              opening on top of what you were doing — which is what it is. */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Add a venue"
            className="wiz-dialog"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={sx('position:relative;width:min(720px,100%);margin:auto 0')}
          >
            {/* Top right, matching the kill-switch modal — the corner is where
                people look to leave a dialog, and it stays reachable at any
                stage without scrolling to the bottom of a three-stage form. */}
            <button
              type="button"
              onClick={() => setAddSlug('')}
              aria-label="Close"
              style={sx('position:absolute;top:14px;right:14px;z-index:2;width:28px;height:28px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink-3);display:grid;place-items:center;cursor:pointer')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <AddVenueWizard
              accessToken={accessToken}
              supportedProps={supportedProps}
              propsLoading={propsLoading}
              toast={toast}
              presetSlug={addSlug}
              onCancel={() => setAddSlug('')}
              onDone={async () => { setAddSlug(''); setShowAdd(false); await refreshTradingAccounts(); await guard.refresh(); }}
            />
          </motion.div>
        </motion.div>
      )}

      {del && (
        <div data-tgx-modal="1" onClick={() => !delBusy && setDel(null)} role="presentation" style={sx('position:fixed;inset:0;z-index:70;background:rgba(3,5,10,.72);backdrop-filter:blur(6px);display:grid;place-items:center;padding:24px')}>
          <div role="dialog" aria-modal="true" aria-label="Delete account" onClick={(e) => e.stopPropagation()} style={sx('width:min(480px,100%);padding:20px;border:1px solid var(--red-line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-card)')}>
            <h3 style={sx("margin:0;font:600 16px/1.25 'Space Grotesk',sans-serif")}>Delete {del.name}?</h3>

            {!delCheck ? (
              <p style={sx('margin:10px 0 0;font-size:12.5px;color:var(--ink-3)')}>Checking this account…</p>
            ) : !delCheck.deletable ? (
              <>
                {/* Not an error — the account is simply in a state where this
                    is not allowed yet, and each blocker says what to do. */}
                <p style={sx('margin:10px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>This account cannot be deleted yet:</p>
                <ul style={sx('margin:9px 0 0;padding-left:18px;font-size:12.5px;line-height:1.6;color:var(--ink-2)')}>
                  {delCheck.blockers.map((b) => <li key={b.code}>{b.message}</li>)}
                </ul>
                <div style={sx('display:flex;gap:9px;margin-top:16px')}>
                  <button type="button" onClick={() => setDel(null)} style={sx('padding:10px 14px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:700')}>Close</button>
                </div>
              </>
            ) : (
              <>
                {/* Says what actually happens. The account is hidden, not
                    erased: its journal and tax records are retained, because
                    someone tidying a stale account should not also lose the
                    evidence for a filing. Counting what is kept is more
                    honest than a warning about what is lost. */}
                <p style={sx('margin:10px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>
                  {del.name} disappears from your dashboard, the account switcher, the journal and your trades.
                  {delCheck.counts && (delCheck.counts.journalTrades > 0 || delCheck.counts.breachEvents > 0)
                    ? ` Its ${delCheck.counts.journalTrades} journal trade${delCheck.counts.journalTrades === 1 ? '' : 's'} and ${delCheck.counts.breachEvents} breach event${delCheck.counts.breachEvents === 1 ? '' : 's'} are kept for your tax records, not deleted.`
                    : ''}
                </p>
                <p style={sx('margin:8px 0 0;font-size:12px;line-height:1.5;color:var(--ink-3)')}>
                  You cannot undo this yourself — contact support if you need it back.
                </p>
                <label style={sx('display:block;margin-top:14px;font-size:12px;color:var(--ink-3)')}>
                  Type <strong style={sx('color:var(--ink)')}>{del.name}</strong> to confirm
                  <input
                    value={delTyped}
                    onChange={(e) => setDelTyped(e.target.value)}
                    autoComplete="off"
                    style={sx("width:100%;margin-top:6px;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font:400 13px/1.3 'JetBrains Mono',monospace")}
                  />
                </label>
                <div style={sx('display:flex;gap:9px;margin-top:16px;flex-wrap:wrap')}>
                  <button
                    type="button"
                    disabled={delBusy || delTyped.trim() !== del.name}
                    onClick={confirmDelete}
                    style={sx('flex:1;min-width:150px;padding:11px;border-radius:10px;font-size:12.5px;font-weight:700', delTyped.trim() === del.name && !delBusy
                      ? { border: '1px solid var(--red-btn)', background: 'var(--red-btn)', color: '#fff' }
                      : { border: '1px solid var(--line)', background: 'var(--surface-3)', color: 'var(--ink-faint)', cursor: 'default' })}
                  >
                    {delBusy ? 'Deleting…' : 'Delete permanently'}
                  </button>
                  <button type="button" disabled={delBusy} onClick={() => setDel(null)} style={sx('padding:11px 15px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600')}>Keep it</button>
                </div>
              </>
            )}
          </div>
        </div>
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
