import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { connectExchangeCredentials, exchangeFromBrokerSlug } from '../api/exchangeCredentialsApi';
import { trySplitPastedCredentials, SUGGESTED_KEY_NAME } from '../components/dashboard/deltaConnectShared';
import { ENGINE_EGRESS_IP, venueFor } from '../lib/venues';
import { brokerLabel } from '../lib/labels';
import { sx } from '../components/dashboard/shell/sx';
import AppGuide from '../components/dashboard/AppGuide';
import VenueSteps from '../components/dashboard/VenueSteps';

/**
 * Connect enforcement — transcribed from the reference (lines 1620–1702).
 * Four steps, one tab (Exchange API key). Submits through the same
 * connectExchangeCredentials call the account page uses; scope is verified
 * server-side and reported plainly in the result.
 */

/**
 * The connect-a-key flow.
 *
 * Exported separately from the page so the add-a-venue wizard can show the
 * SAME screen as its second stage rather than a reduced copy of it. Connecting
 * a key is the step that turns rules into something that acts, and it had two
 * implementations drifting apart — this is the one that was kept.
 *
 * `embedded` drops the page heading, because inside the wizard the stage rail
 * is already saying where you are. `onConnected` lets the wizard advance once
 * the key verifies; the standalone page passes neither and behaves as before.
 */
export function ConnectKeyFlow({ embedded = false, onConnected }) {
  const { session } = useAuth();
  const { selectedAccount, refreshTradingAccounts } = useTradingAccounts();
  const { selected: g, refresh } = useGuard();
  const toast = useToast();
  const navigate = useNavigate();
  const accessToken = session?.access_token;

  const [keyVal, setKeyVal] = useState('');
  const [secretVal, setSecretVal] = useState('');
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, summary | message }
  const [replacing, setReplacing] = useState(false); // he asked to swap a working key
  const [guideOpen, setGuideOpen] = useState(false);

  const venue = selectedAccount ? brokerLabel(selectedAccount.propFirmSlug) : 'your exchange';
  /**
   * The same name the venue flow suggests, and the same one printed in the
   * walkthrough screenshots.
   *
   * This page used to suggest `TradeGuardX-<account>-guard`, so the same person
   * connecting from here rather than from Accounts was told to type something
   * different — and, now that the screenshots render on this page too,
   * something the picture directly beneath contradicts. Whoever is following
   * the guide is the one least able to tell which to trust.
   *
   * A per-account name would genuinely help someone running several accounts on
   * one exchange tell their keys apart on the venue's side. If that is worth
   * having it belongs in SUGGESTED_KEY_NAME, applied everywhere at once,
   * including the screenshots.
   */
  const keyName = SUGGESTED_KEY_NAME;
  const ip = ENGINE_EGRESS_IP || '13.205.214.83';
  const cooled = g.guard === 'locked';
  const exchangeSlug = selectedAccount ? exchangeFromBrokerSlug(selectedAccount.propFirmSlug) : null;
  const v = venueFor(exchangeSlug) ?? venueFor('delta_india');
  const ready = !cooled && keyVal.trim().length > 4 && secretVal.trim().length > 4 && !!exchangeSlug;

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(''), 1500); } catch { /* ignore */ }
  };
  const onKey = (v) => {
    const split = trySplitPastedCredentials(v);
    if (split && split.key && split.secret) { setKeyVal(split.key); setSecretVal(split.secret); } else setKeyVal(v);
  };
  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const summary = await connectExchangeCredentials({ accessToken, accountId: selectedAccount.id, exchange: exchangeSlug, apiKey: keyVal.trim(), apiSecret: secretVal.trim() });
      onConnected?.(summary);
      setResult({ ok: true, summary });
      setKeyVal(''); setSecretVal('');
      await refreshTradingAccounts?.(); await refresh();
      toast.success(summary?.enforcementCapable === false ? 'Connected — read-only' : 'Connected and verified', summary?.enforcementCapable === false ? 'The key cannot act. Replace it with a trading-scope key to enforce.' : 'Trading scope confirmed. The engine starts on the next fill.');
    } catch (e) {
      setResult({ ok: false, message: e?.message || `${venue} rejected the connection. Try again.` });
    } finally { setBusy(false); }
  };

  // Numbered AFTER filtering: a venue whose key form has no permission choice
  // (CoinDCX — label, IP bind, OTP, done) would otherwise read 1, 2, 4.
  const steps = [
    { title: `Open your key page on ${venue}`, body: 'We link straight to it. Keep both tabs open — you will paste in each direction.', kind: 'link' },
    { title: `Paste our IP into ${v.ipField}`, body: v.ipRequired ? 'The exchange will only accept requests from this one address. It is the same address for everyone, and it is ours.' : `${v.name} lets you leave a key unbound; binding it to our address means the key works from our engine and nowhere else. Same address for everyone, and it is ours.`, kind: 'ip' },
    { title: `Give the key ${v.scopeLabel} permission`, body: 'Read-only will connect and look fine, and nothing will ever be enforced.', kind: 'scope' },
    { title: 'Name it and paste it back here', body: 'Paste key and secret. If you copied both together we will split them for you.', kind: 'paste' },
  ]
    .filter((s) => s.kind !== 'scope' || v.scopeChoice !== false)
    .map((s, i) => ({ ...s, n: i + 1 }));
  const pasteStep = steps.find((s) => s.kind === 'paste')?.n ?? steps.length;

  // A key that is in place and can act. A read-only key counts as connected
  // to the exchange and NOT as protection, so it does not hide the guide.
  const connected = g.connection?.status === 'active' && !g.readOnly;
  const showGuide = !connected || replacing;

  // Dot rail: the paste step while pasting, one past the last step when the
  // key is in, 1 until a key exists. Derived from the list so a venue with
  // one step fewer doesn't leave the rail stuck.
  const step = result?.ok ? pasteStep + 1 : keyVal || secretVal ? pasteStep : g.connection?.status === 'active' ? pasteStep + 1 : 1;

  if (!selectedAccount) {
    return (
      <div style={sx('max-width:900px')}>
        <div style={sx('margin-bottom:16px;max-width:76ch')}>
          <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Connect enforcement</h1>
          <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>There is no account to connect a key to yet.</p>
        </div>
        <button type="button" onClick={() => navigate('/dashboard/account/trading')} style={sx('padding:10px 14px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>Add an account</button>
      </div>
    );
  }

  return (
    <div style={sx(embedded ? '' : 'max-width:900px')}>
      {!embedded && (
      <div style={sx('margin-bottom:16px;max-width:76ch')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Connect enforcement</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>{connected && !replacing
          ? `${venue} is connected and the engine can act on your account. Your rules decide when it does.`
          : `This is the step that turns your rules from a note into something that acts. ${steps.length === 3 ? 'Three' : 'Four'} short moves, two tabs, about three minutes.`}</p>
      </div>
      )}

      {/* A tab strip with exactly one tab, left from when there was a second
          connection method. It still anchors the section on the standalone
          page; inside the wizard the stage rail already says "Connect key",
          so it is a control that does nothing next to a label that repeats. */}
      {!embedded && (
      <div style={sx('display:inline-flex;gap:3px;margin-bottom:20px;padding:4px;border:1px solid var(--line);border-radius:999px;background:var(--surface-2);box-shadow:inset 0 1px 2px rgba(0,0,0,.35)')}>
        <button type="button" style={sx('padding:8px 16px;border:0;border-radius:999px;font-size:12.5px;font-weight:600;letter-spacing:-.005em;background:var(--ink);color:var(--bg-deep)')}>Exchange API key</button>
      </div>
      )}

      {g.connection?.status === 'active' && !result && (
        <div style={sx('display:flex;align-items:flex-start;gap:12px;padding:15px 18px;margin-bottom:16px;border-radius:13px', g.readOnly ? { border: '1px solid var(--amber-line)', background: 'var(--amber-tint)' } : { border: '1px solid var(--mint-line)', background: 'var(--mint-tint)' })}>
          <div style={sx('flex:1')}>
            <div style={sx('font-size:13.5px;font-weight:700', { color: g.readOnly ? 'var(--amber)' : 'var(--mint)' })}>{g.readOnly ? 'A read-only key is connected' : 'A trading-scope key is connected'}</div>
            <p style={sx('margin:4px 0 0;font-size:12.5px;color:var(--ink-2);max-width:92ch')}>{g.readOnly ? 'Replace this with a trading-scope key and the engine starts enforcing on the next fill.' : replacing ? 'Pasting a new key below replaces it. Nothing changes until the new one verifies.' : 'Scope verified. The engine holds a live socket to your account.'}</p>
          </div>
        </div>
      )}

      {result && (
        <div style={sx('display:flex;align-items:flex-start;gap:12px;padding:15px 18px;margin-bottom:16px;border-radius:13px', result.ok ? (result.summary?.enforcementCapable === false ? { border: '1px solid var(--amber-line)', background: 'var(--amber-tint)' } : { border: '1px solid var(--mint-line)', background: 'var(--mint-tint)' }) : { border: '1px solid var(--red-line)', background: 'var(--red-tint)' })}>
          <div style={sx('flex:1')}>
            <div style={sx('font-size:13.5px;font-weight:700', { color: result.ok ? (result.summary?.enforcementCapable === false ? 'var(--amber)' : 'var(--mint)') : 'var(--red)' })}>
              {result.ok ? (result.summary?.enforcementCapable === false ? 'Connected — but this key is read-only' : 'Connected. Trading scope verified.') : 'That key did not connect'}
            </div>
            <p style={sx('margin:4px 0 0;font-size:12.5px;color:var(--ink-2);max-width:92ch')}>
              {result.ok ? (result.summary?.enforcementCapable === false ? 'It connects and looks healthy, and it cannot close anything. Replace it with a trading-scope key and the engine starts enforcing on the next fill.' : 'The engine holds a live socket to your account from here on. Switch on a rule and the guard arms itself.') : result.message}
            </p>
            {result.ok && result.summary?.enforcementCapable !== false && (
              <button type="button" onClick={() => navigate('/dashboard/rules')} style={sx('margin-top:10px;padding:8px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700')}>Choose rules</button>
            )}
          </div>
        </div>
      )}

      {/* The guide is onboarding. Once a key is verified and can actually
          act, the most prominent thing on the page should not be a form
          asking for credentials — it is noise, and it trains people to paste
          keys into a form they did not go looking for. Replacing stays one
          click away, because keys expire, get revoked, and outlive IPs.
          A read-only key is the exception: it is connected and useless, so
          the guide stays open — that user's whole job is to replace it. */}
      {connected && !showGuide && (
        <section style={sx('display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:17px 20px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-card)')}>
          <div style={sx('min-width:0')}>
            <div style={sx('font-size:13.5px;font-weight:600')}>Your key is in place</div>
            <p style={sx('margin:4px 0 0;font-size:12.5px;color:var(--ink-3);max-width:70ch')}>Nothing to do here. Replacing only matters if {venue} revoked the key, you rotated it, or our IP changed — pasting a new one replaces it, and nothing changes until the new one verifies.</p>
          </div>
          <button type="button" onClick={() => setReplacing(true)} style={sx('flex:none;padding:9px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:700')}>Replace key</button>
        </section>
      )}

      {showGuide && (
      <section style={sx('border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        {steps.map((st) => (
          <div key={st.n} className="cx-step" style={sx('display:flex;gap:15px;padding:19px 22px;border-bottom:1px solid var(--line)')}>
            <span className="cx-step__n" style={sx("flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:600 12.5px/1 'Space Grotesk',sans-serif", {
              background: step > st.n ? 'var(--mint-solid)' : step === st.n ? 'var(--ink)' : 'var(--surface-3)',
              color: step > st.n ? '#04241d' : step === st.n ? 'var(--surface)' : 'var(--ink-3)',
              boxShadow: step === st.n ? '0 0 0 4px var(--mint-tint)' : 'none',
            })}>{st.n}</span>
            {/* Title and body are siblings, not one nested block, so the grid
                can put the title beside the badge and let the body start at
                the card's edge on a narrow screen. Nested, every line of body
                text carried the badge's 43px indent. */}
            <div className="cx-step__title" style={sx('min-width:0;font-size:14.5px;font-weight:600;letter-spacing:-.005em')}>{st.title}</div>
            <div className="cx-step__body" style={sx('min-width:0')}>
              <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.6;color:var(--ink-2);max-width:74ch')}>{st.body}</p>

              {st.kind === 'link' && (
                <>
                  {/* Equal width, same weight. Wrapped, these were two
                      differently-sized buttons with ragged right edges and two
                      different colour treatments — which reads as one being
                      more important, when they are simply two ways to do the
                      same step. */}
                  <div className="cx-actions" style={sx('display:flex;flex-wrap:wrap;gap:9px;margin-top:12px')}>
                    <a href={v.keysUrl(exchangeSlug)} target="_blank" rel="noreferrer" className="cx-link" style={sx('display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none')}>
                      Open the key page
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
                    </a>

                    {/* This page is called "Connect enforcement" and is where
                        people actually land to connect — yet it was the one
                        surface without the screenshot walkthrough, which lived
                        only on the account page and the settings panel. Same
                        guide, same venue data; venues with no screenshots
                        render no button. */}
                    {v.appGuide?.length ? (
                      <button type="button" onClick={() => setGuideOpen(true)} style={sx('display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:700;cursor:pointer')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8 20.5h8" /></svg>
                        Show me how &middot; {v.appGuide.length} steps
                      </button>
                    ) : null}
                  </div>

                  {v.desktopOnly && (
                    <p style={sx('margin:10px 0 0;font-size:12px;line-height:1.55;color:var(--amber)')}>
                      {v.desktopOnlyNote}
                    </p>
                  )}

                  {/* The venue's own form, named field by field. People stall
                      on the other tab, not on this one — so describe what is
                      in front of them there, in their words. */}
                  <div style={sx('margin-top:14px')}>
                    <VenueSteps venue={v} />
                  </div>
                </>
              )}

              {st.kind === 'ip' && (
                <div style={sx('margin-top:12px;display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
                  <code style={sx("padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);font:500 14px/1 'JetBrains Mono',monospace;color:var(--ink)")}>{ip}</code>
                  <button type="button" onClick={() => copy(ip)} style={sx('padding:9px 13px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>{copied === ip ? 'Copied' : 'Copy IP'}</button>
                  <span style={sx('font-size:12px;color:var(--ink-3)')}>One address, ours, shared by every account.</span>
                </div>
              )}

              {st.kind === 'scope' && (
                <div style={sx('margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px')}>
                  <div style={sx('padding:12px 14px;border:1px solid var(--mint-line);border-radius:10px;background:var(--mint-tint)')}>
                    <div style={sx('font-size:12px;font-weight:700;color:var(--mint)')}>{v.scopeLabel} — required</div>
                    <p style={sx('margin:4px 0 0;font-size:12px;line-height:1.5;color:var(--ink-2)')}>Lets us cancel orders and close positions. Nothing else works without it.</p>
                  </div>
                  <div style={sx('padding:12px 14px;border:1px solid var(--amber-line);border-radius:10px;background:var(--amber-tint)')}>
                    <div style={sx('font-size:12px;font-weight:700;color:var(--amber)')}>Read-only — looks fine, does nothing</div>
                    <p style={sx('margin:4px 0 0;font-size:12px;line-height:1.5;color:var(--ink-2)')}>Connects successfully, evaluates rules, and can never intervene. The quiet failure.</p>
                  </div>
                </div>
              )}

              {st.kind === 'paste' && (
                <div style={sx('margin-top:13px')}>
                  <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:12px;flex-wrap:wrap')}>
                    <span style={sx('font-size:12px;color:var(--ink-3)')}>Suggested name</span>
                    <code style={sx("padding:7px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);font:500 12.5px/1 'JetBrains Mono',monospace")}>{keyName}</code>
                    <button type="button" onClick={() => copy(keyName)} style={sx('padding:7px 11px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:600')}>{copied === keyName ? 'Copied' : 'Copy'}</button>
                  </div>
                  <label htmlFor="cx-key" style={sx('display:block;font-size:11.5px;font-weight:600;color:var(--ink-2);margin-bottom:6px')}>API key</label>
                  <input id="cx-key" value={keyVal} onChange={(e) => onKey(e.target.value)} disabled={cooled} placeholder="paste key — or paste key and secret together" autoComplete="off" style={sx("width:100%;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font:400 13px/1.3 'JetBrains Mono',monospace;margin-bottom:12px")} />
                  <label htmlFor="cx-secret" style={sx('display:block;font-size:11.5px;font-weight:600;color:var(--ink-2);margin-bottom:6px')}>API secret</label>
                  <input id="cx-secret" value={secretVal} onChange={(e) => setSecretVal(e.target.value)} disabled={cooled} type="password" placeholder="paste secret" autoComplete="off" style={sx("width:100%;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font:400 13px/1.3 'JetBrains Mono',monospace;margin-bottom:12px")} />
                  <button type="button" disabled={!ready || busy} onClick={submit} style={sx('padding:11px 16px;border-radius:10px;font-size:13px;font-weight:700', { border: `1px solid ${ready ? 'var(--ink)' : 'var(--surface-3)'}`, background: ready ? 'var(--ink)' : 'var(--surface-3)', color: ready ? 'var(--surface)' : 'var(--ink-3)' })}>{busy ? 'Verifying…' : cooled ? 'Blocked while your lockout runs' : 'Connect and verify scope'}</button>
                  {cooled && (
                    <p style={sx('margin:11px 0 0;padding:11px 13px;border:1px solid var(--red-line);border-radius:9px;background:var(--red-tint);font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:70ch')}><strong style={sx('color:var(--red);font-weight:700')}>Key changes are blocked while your lockout runs.</strong> Pulling the key would stop us enforcing, which would make the lockout meaningless. This unblocks itself when the lock expires.</p>
                  )}
                  <p style={sx('margin:11px 0 0;font-size:12px;line-height:1.55;color:var(--ink-3);max-width:70ch')}>Stored encrypted, used only by the risk engine. We check the scope on connect and tell you plainly if the key cannot enforce — we will not let you believe you are protected when you are not.</p>
                </div>
              )}
            </div>
          </div>
        ))}
        <div style={sx('display:flex;align-items:flex-start;gap:10px;padding:15px 22px;background:var(--surface-2);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ flex: 'none', marginTop: 2, color: 'var(--ink-faint)' }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          {/* Was "the exchange app hides the allowed-IP field under advanced
              settings" for every venue — true of Delta, nonsense for CoinDCX
              and Shark, which have no create-key screen in their app at all. */}
          <span>{v.desktopOnly
            ? `${v.name} cannot issue a key from a phone — ${v.desktopOnlyNote}`
            : 'Doing this on your phone? The exchange app hides the allowed-IP field under advanced settings.'} <a href="/help" target="_blank" rel="noreferrer">Read the walkthrough</a>.</span>
        </div>
        {connected && !g.readOnly && (
          <div style={sx('padding:13px 22px;border-top:1px solid var(--line);background:var(--surface-2)')}>
            <button type="button" onClick={() => { setReplacing(false); setKeyVal(""); setSecretVal(""); }} style={sx('padding:8px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600')}>Cancel — keep the key I have</button>
          </div>
        )}
      </section>
      )}

      {v?.appGuide?.length ? (
        <AppGuide open={guideOpen} onClose={() => setGuideOpen(false)} steps={v.appGuide} docsUrl={v.keysUrl?.(exchangeSlug)} />
      ) : null}
    </div>
  );
}

export default function ConnectKeyPage() {
  return <ConnectKeyFlow />;
}
