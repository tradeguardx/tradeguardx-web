import { useEffect, useRef, useState } from 'react';
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
import VenuePath from '../components/dashboard/VenuePath';
import { useIsMobile } from '../hooks/useIsMobile';
import VenueFormReplica from '../components/dashboard/VenueFormReplica';
import VenueAfterCreate from '../components/dashboard/VenueAfterCreate';
import { useNoAutofill } from '../lib/noAutofill';
import SecretInput from '../components/common/SecretInput';

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
  const noAutofill = useNoAutofill();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, summary | message }
  const resultRef = useRef(null);

  /**
   * Bring the verdict to the person who asked for it.
   *
   * The banner renders at the top of the page and Connect is at the bottom of
   * step three, so pressing it produced a result nobody saw — and the success
   * case also collapses the whole guide, which changes the page height under
   * you at the same moment. The answer to "did that work?" was somewhere above
   * the fold, on a page that had just got shorter.
   *
   * This is the one scroll worth taking from the user: they pressed a button
   * that either armed enforcement on their money or did not.
   */
  useEffect(() => {
    if (!result) return;
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [result]);
  const [replacing, setReplacing] = useState(false); // he asked to swap a working key
  const [guideOpen, setGuideOpen] = useState(false);
  const isMobile = useIsMobile();

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
      toast.success(summary?.enforcementCapable === false ? 'Connected — read-only' : 'Connected and checked', summary?.enforcementCapable === false ? 'This key can watch but not close. Make a new one with trading turned on.' : 'This key can close positions. We start watching from your next trade.');
    } catch (e) {
      setResult({ ok: false, message: e?.message || `${venue} rejected the connection. Try again.` });
    } finally { setBusy(false); }
  };

  /*
   * THREE STEPS, NOT FOUR. The IP and the permission were separate steps, which
   * split one screen of the exchange's form across two of ours — someone read
   * "paste the IP", tabbed over, pasted it, tabbed back, and was then told
   * about a checkbox on the form they had just left.
   *
   * They are now one "fill in their form" step rendering VenueFormReplica: the
   * exchange's form drawn as it will look, values filled, copy button on each.
   * The filtering that used to drop the permission step for CoinDCX moves into
   * the replica, which says "there is no permission control here" rather than
   * silently omitting it — an absence nobody can see is not an instruction.
   */
  /**
   * On a phone, with a venue that has a working app flow, the key is made in
   * the app — so there is no page to open and no second tab to keep.
   *
   * Only Delta qualifies today. CoinDCX and Shark have no create-key screen in
   * their apps at all (desktopOnly), so on a phone the honest answer there is
   * still the link plus desktopOnlyNote telling them to find a computer —
   * hiding the link would leave that step with nothing in it.
   */
  const inApp = isMobile && !v.desktopOnly && Boolean(v.mobilePath) && Boolean(v.appGuide?.length);

  /*
   * The titles say what you DO, in the order you do it: open, create, paste.
   *
   * They have to work collapsed, because that is how most of them are read —
   * one line in a closed row, scanned to find where you are. "Create the key
   * in the Delta app" and "Fill in Delta Exchange's form" described the same
   * screen twice and used two different names for the same venue in adjacent
   * rows. And the old first title, "Open your key page on Delta Exchange",
   * named a thing ("your key page") that is not what Delta calls anything.
   *
   * Venue naming is v.name throughout — the short one. `venue` is the account
   * label, which is "Delta Exchange" here, and mixing the two in one card
   * reads as two different integrations.
   */
  const steps = [
    {
      title: inApp ? `Open the key form in the ${v.name} app` : `Open ${v.name}'s key form`,
      body: inApp
        ? 'Three taps to the form, then come back here with the key and secret. The screenshots below show each screen.'
        : 'We link straight to it. Keep both tabs open — you will paste in each direction.',
      kind: 'link',
    },
    {
      title: 'Fill it in and create the key',
      body: v.afterCreate
        ? 'Copy these two values across and press Create. One more screen follows.'
        : 'Copy these two values across and press Create.',
      kind: 'form',
    },
    /*
     * Shark's fourth step, and only Shark's.
     *
     * It used to be drawn inside step two, under the create form — which put
     * two different screens of the exchange in one step of ours, the second of
     * them below a Create button that ends the first. That is the same mistake
     * the IP and permission steps made before they were merged, run the other
     * way: merging is right when it is ONE screen, wrong when it is two.
     *
     * It earns a step because it is where the job is finished and where it is
     * most often abandoned — the secret is shown only there, and the key is
     * issued without the permission that makes it useful.
     */
    ...(v.afterCreate
      ? [{
          title: `Copy both, then tick ${v.scopeLabel}`,
          body: `${v.name} shows the secret on this screen and nowhere else, and issues the key read-only. Both are fixed here.`,
          kind: 'after',
        }]
      : []),
    { title: 'Paste the key and secret here', body: 'If you copied both together we will split them for you.', kind: 'paste' },
  ].map((st, i) => ({ ...st, n: i + 1 }));
  const pasteStep = steps.find((s) => s.kind === 'paste')?.n ?? steps.length;

  // A key that is in place and can act. A read-only key counts as connected
  // to the exchange and NOT as protection, so it does not hide the guide.
  const connected = g.connection?.status === 'active' && !g.readOnly;
  const showGuide = !connected || replacing;

  // Dot rail: the paste step while pasting, one past the last step when the
  // key is in, 1 until a key exists. Derived from the list so a venue with
  // one step fewer doesn't leave the rail stuck.
  const step = result?.ok ? pasteStep + 1 : keyVal || secretVal ? pasteStep : g.connection?.status === 'active' ? pasteStep + 1 : 1;

  /**
   * Which step is open, and which are behind you.
   *
   * `step` above is derived from what has actually happened — a key typed, a
   * key accepted — and it cannot see the part of this that happens on the
   * exchange's site. Nothing we can observe distinguishes "reading step one"
   * from "has created the key and is coming back", so the progress rail sat on
   * 1 through the entire job and all three steps stayed open the whole time.
   *
   * `picked` is the user saying where they are, by opening a step. Moving on
   * to step two is the signal that step one is behind them — which is the only
   * signal there is, and it costs nothing to give, unlike a button asking
   * someone to confirm what they just did. It wins over the derived value,
   * because after they have told us, they are driving. 0 means everything
   * collapsed, which is why this is `??` and not `||`.
   */
  const [picked, setPicked] = useState(null);
  const openStep = picked ?? step;
  /** Behind the open one, or behind what we can prove — either finishes it. */
  const isDone = (n) => n < openStep || n < step;
  const toggleStep = (n) => setPicked((prev) => ((prev ?? step) === n ? 0 : n));

  if (!selectedAccount) {
    return (
      <div style={sx('max-width:900px')}>
        <div style={sx('margin-bottom:16px;max-width:76ch')}>
          <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Connect your API key</h1>
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
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Connect your API key</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>{connected && !replacing
          ? `${venue} is connected and we can close positions on this account. Your rules decide when we do.`
          : `This is the step that turns your rules from a note into something that acts. ${steps.length === 3 ? 'Three' : 'Four'} short moves${inApp ? '' : ', two tabs'}, about three minutes.`}</p>
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
            <div style={sx('font-size:13.5px;font-weight:700', { color: g.readOnly ? 'var(--amber)' : 'var(--mint)' })}>{g.readOnly ? 'Connected, but this key cannot close positions' : 'Connected and able to close positions'}</div>
            <p style={sx('margin:4px 0 0;font-size:12.5px;color:var(--ink-2);max-width:92ch')}>{g.readOnly ? 'Make a new key with trading turned on and we start watching from your next trade.' : replacing ? 'Pasting a new key below replaces it. Nothing changes until the new one is checked.' : 'Checked and working. We are connected to your account and watching it live.'}</p>
          </div>
        </div>
      )}

      {result && (
        <div ref={resultRef} style={sx('display:flex;align-items:flex-start;gap:12px;padding:15px 18px;margin-bottom:16px;border-radius:13px', result.ok ? (result.summary?.enforcementCapable === false ? { border: '1px solid var(--amber-line)', background: 'var(--amber-tint)' } : { border: '1px solid var(--mint-line)', background: 'var(--mint-tint)' }) : { border: '1px solid var(--red-line)', background: 'var(--red-tint)' })}>
          <div style={sx('flex:1')}>
            <div style={sx('font-size:13.5px;font-weight:700', { color: result.ok ? (result.summary?.enforcementCapable === false ? 'var(--amber)' : 'var(--mint)') : 'var(--red)' })}>
              {result.ok ? (result.summary?.enforcementCapable === false ? 'Connected — but this key cannot close positions' : 'Connected and checked') : 'That key did not connect'}
            </div>
            <p style={sx('margin:4px 0 0;font-size:12.5px;color:var(--ink-2);max-width:92ch')}>
              {result.ok ? (result.summary?.enforcementCapable === false ? 'It connects and looks healthy, and it cannot close anything. Make a new key with trading turned on and we start watching from your next trade.' : 'We are connected to your account and watching it live. Switch on a rule and it starts working straight away.') : result.message}
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
            <p style={sx('margin:4px 0 0;font-size:12.5px;color:var(--ink-3);max-width:70ch')}>Nothing to do here. You only need a new key if {venue} cancelled this one, you replaced it yourself, or our IP address changed. Pasting a new one swaps it, and nothing changes until we have checked it.</p>
          </div>
          <button type="button" onClick={() => setReplacing(true)} style={sx('flex:none;padding:9px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:700')}>Replace key</button>
        </section>
      )}

      {/* Each step is its own card, and the open one is outlined brightly.
          As one bordered panel with hairline dividers, every row looked the
          same weight and the only thing marking where you were was a chevron
          pointing the other way — on a page you come back to repeatedly, from
          another tab, having lost your place. The border is the answer to
          "where was I". */}
      {showGuide && (
      <section style={sx('display:flex;flex-direction:column;gap:9px')}>
        {steps.map((st) => {
          const done = isDone(st.n);
          const open = openStep === st.n;
          return (
          <div
            key={st.n}
            style={sx(
              'border-radius:15px;overflow:hidden;transition:border-color .15s ease,box-shadow .15s ease',
              open
                ? { border: '1.5px solid var(--ink)', background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }
                : done
                  ? { border: '1px solid var(--mint-line)', background: 'var(--surface)' }
                  : { border: '1px solid var(--line)', background: 'var(--surface-2)' },
            )}
          >
            {/* The whole header is the control. A chevron alone is a 15px
                target on a phone, on a page people are working through
                one-handed while switching to another app. */}
            <button type="button" className="cx-head" onClick={() => toggleStep(st.n)} aria-expanded={open}>
              <span className="cx-step__n" style={sx("flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:600 12.5px/1 'Space Grotesk',sans-serif", {
                background: done ? 'var(--mint-solid)' : open ? 'var(--ink)' : 'var(--surface-3)',
                color: done ? '#04241d' : open ? 'var(--surface)' : 'var(--ink-3)',
                boxShadow: open && !done ? '0 0 0 4px var(--mint-tint)' : 'none',
              })}>{done ? '✓' : st.n}</span>
              <span style={sx('flex:1;min-width:0;font-size:14.5px;font-weight:600;letter-spacing:-.005em', done && !open ? { color: 'var(--ink-3)' } : {})}>{st.title}</span>
              {done && !open && (
                <span style={sx('flex:none;font-size:11.5px;font-weight:700;color:var(--mint)')}>Done</span>
              )}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open && (
            <div className="cx-body">
              <p style={sx('margin:0 0 0;font-size:12.5px;line-height:1.6;color:var(--ink-2);max-width:74ch')}>{st.body}</p>

              {st.kind === 'link' && (
                <>
                  {/* Equal width, same weight. Wrapped, these were two
                      differently-sized buttons with ragged right edges and two
                      different colour treatments — which reads as one being
                      more important, when they are simply two ways to do the
                      same step.

                      ON A PHONE, FOR A VENUE WITH AN APP FLOW, THERE IS NO
                      LINK. Delta's key page is a desktop web page; tapping it
                      from a phone hands someone a site they are meant to do
                      this in the app, and the app is already installed and
                      already logged in. The walkthrough becomes the action
                      instead, and the taps to reach it sit under it. */}
                  {/* The taps come first: they are the instruction, and on a
                      phone a filled full-width button above them read as the
                      thing to press rather than the thing to fall back on. */}
                  <VenuePath venue={v} />

                  <div className="cx-actions" style={sx('display:flex;flex-wrap:wrap;gap:9px;margin-top:12px')}>
                    {!inApp && (
                      <a href={v.keysUrl(exchangeSlug)} target="_blank" rel="noreferrer" className="cx-link" style={sx('display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none')}>
                        Open the key page
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
                      </a>
                    )}

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
                    /* Said once, here, where someone decides whether to carry
                       on. It was a thin amber line here AND a repeat in the
                       page footer that prefixed it with "X cannot issue a key
                       from a phone — ", making one sentence with two em dashes
                       that said the same thing twice. */
                    <p style={sx('margin:11px 0 0;padding:11px 13px;border:1px solid var(--amber-line);border-radius:10px;background:var(--amber-tint);font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:70ch')}>
                      <strong style={sx('font-weight:700', { color: 'var(--amber)' })}>Do this on a laptop or desktop.</strong>{' '}
                      {v.desktopOnlyNote}
                    </p>
                  )}

                </>
              )}

              {st.kind === 'form' && (
                <VenueFormReplica venue={v} onCopy={copy} copiedValue={copied} />
              )}
              {st.kind === 'after' && <VenueAfterCreate venue={v} />}
              {st.kind === 'paste' && (
                <div style={sx('margin-top:13px')}>
                  <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:12px;flex-wrap:wrap')}>
                    <span style={sx('font-size:12px;color:var(--ink-3)')}>Suggested name</span>
                    <code style={sx("padding:7px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);font:500 12.5px/1 'JetBrains Mono',monospace")}>{keyName}</code>
                    <button type="button" onClick={() => copy(keyName)} style={sx('padding:7px 11px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:600')}>{copied === keyName ? 'Copied' : 'Copy'}</button>
                  </div>
                  <label htmlFor="cx-key" style={sx('display:block;font-size:11.5px;font-weight:600;color:var(--ink-2);margin-bottom:6px')}>API key</label>
                  <input id="cx-key" name="tgx-cx-a" className="cx-input" {...noAutofill} value={keyVal} onChange={(e) => onKey(e.target.value)} disabled={cooled} placeholder="paste key — or paste key and secret together" style={sx("width:100%;padding:11px 13px;border-radius:10px;background:var(--surface-2);color:var(--ink);font:400 13px/1.3 'JetBrains Mono',monospace;margin-bottom:12px")} />
                  <label htmlFor="cx-secret" style={sx('display:block;font-size:11.5px;font-weight:600;color:var(--ink-2);margin-bottom:6px')}>API secret</label>
                  <SecretInput id="cx-secret" name="tgx-cx-b" className="cx-input" value={secretVal} onChange={(e) => setSecretVal(e.target.value)} disabled={cooled} placeholder="paste secret" wrapperStyle={sx('margin-bottom:12px')} style={sx("width:100%;padding:11px 40px 11px 13px;border-radius:10px;background:var(--surface-2);color:var(--ink);font:400 13px/1.3 'JetBrains Mono',monospace")} />
                  <button type="button" disabled={!ready || busy} onClick={submit} style={sx('padding:11px 16px;border-radius:10px;font-size:13px;font-weight:700', { border: `1px solid ${ready ? 'var(--ink)' : 'var(--surface-3)'}`, background: ready ? 'var(--ink)' : 'var(--surface-3)', color: ready ? 'var(--surface)' : 'var(--ink-3)' })}>{busy ? 'Checking…' : cooled ? 'Blocked while your lockout runs' : 'Connect and check'}</button>
                  {cooled && (
                    <p style={sx('margin:11px 0 0;padding:11px 13px;border:1px solid var(--red-line);border-radius:9px;background:var(--red-tint);font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:70ch')}><strong style={sx('color:var(--red);font-weight:700')}>Key changes are blocked while your lockout runs.</strong> Removing the key would stop us closing anything, which would make the lockout pointless. This unblocks itself when the lock expires.</p>
                  )}
                  <p style={sx('margin:11px 0 0;font-size:12px;line-height:1.55;color:var(--ink-3);max-width:70ch')}>Your secret is encrypted before we store it and is never shown again. We test the key the moment you connect it and tell you straight away if it cannot close a position — we will not let you think you are protected when you are not.</p>
                </div>
              )}
            </div>
            )}
          </div>
          );
        })}
        {/* Only a venue with an app flow has anything to say here. For the
            desktop-only two this repeated step one's callout verbatim. */}
        {!v.desktopOnly && (
          <div style={sx('display:flex;align-items:flex-start;gap:10px;padding:15px 18px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ flex: 'none', marginTop: 2, color: 'var(--ink-faint)' }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            {/* Was "Doing this on your phone?" — asked of someone who is
                plainly on a phone, and asked of desktop users as an aside about
                a screen they are not looking at. Each audience now gets the one
                sentence that is about them. */}
            <span>{inApp
              ? `In the ${v.name} app the allowed-IP field sits under advanced settings.`
              : `On a phone, the ${v.name} app hides the allowed-IP field under advanced settings.`} <a href="/help" target="_blank" rel="noreferrer">Read the walkthrough</a>.</span>
          </div>
        )}
        {connected && !g.readOnly && (
          <div style={sx('padding:13px 18px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)')}>
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
