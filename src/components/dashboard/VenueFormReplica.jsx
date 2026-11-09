import { sx } from './shell/sx';
import { ENGINE_EGRESS_IP } from '../../lib/venues';
import { SUGGESTED_KEY_NAME } from './deltaConnectShared';
import { accentOf } from './venueAccent';

/**
 * The exchange's own key-creation form, drawn as it is drawn, with our values
 * already in the fields.
 *
 * WHY A REPLICA RATHER THAN A LIST OF STEPS. VenueSteps describes the form in
 * words — accurate, checked, and still asking someone to hold five
 * instructions in their head while tabbing between two sites. Showing the form
 * itself, filled, turns "read this, then go and do it" into "make your screen
 * look like this screen". That is the whole idea, and it is why this renders
 * controls in the venue's own layout rather than label/value pairs.
 *
 * NOTHING HERE IS A REAL CONTROL. Every box is a span. No <input>, no <select>,
 * no <form>. Two reasons, and both matter more than the small amount of CSS it
 * costs: a convincing input invites someone to type their key into the picture,
 * and a real input is something a browser can autofill — the connect page has
 * already had a password manager write a login into a credential box once. The
 * only interactive things here are the Copy buttons.
 *
 * EVERY FIELD IS VENUE DATA, NOT DELTA'S FORM. The design this came from was
 * drawn against Delta and would have been wrong on the other two:
 *
 *   - CoinDCX has NO permission control at all (scopeChoice: false). A
 *     permissions block there sends people hunting for a checkbox that is not
 *     on the page — the exact failure VenueSteps was written to stop.
 *   - Shark issues every key Read-only and lets you edit restrictions only
 *     AFTER the key exists, so "tick the box, then press Create" is the wrong
 *     order and strands people at the moment they think they are finished.
 *   - Delta's IP whitelist is required and its form opens with an account
 *     dropdown; CoinDCX's binding is optional and it has no account picker.
 *
 * So each part draws only when the venue supplies it. A venue whose form has
 * not been read off a live screenshot degrades to the fields we are sure of,
 * which is the right failure: a missing row costs a glance, an invented one
 * costs a key.
 *
 * NO WITHDRAWAL ROW. None of the three exchanges offers a withdrawal
 * permission on an API key, so a row saying "leave this empty" describes a
 * control that does not exist. The stronger true statement — there is nothing
 * to give away — belongs in the copy under the form, not as a fake field.
 */

const FIELD =
  'display:flex;align-items:center;min-height:44px;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2)';

/**
 * A box that looks like their input, holding the value to paste, with Copy
 * inside it.
 *
 * Copy used to sit outside, beside the box — which on Delta's IP row put a
 * real button immediately next to the drawn "+ Add", same size, same shape,
 * one of them live and one of them a picture. On a phone that is a coin flip.
 * Inside the box it is unmistakably ours, and the row beside the field is left
 * showing only what the venue's own row shows.
 */
function FilledBox({ value, mono, onCopy, copied }) {
  return (
    <span style={sx(FIELD, 'flex:1;min-width:min(200px,100%);justify-content:space-between;gap:10px')}>
      <span style={sx(mono ? "font:500 13px/1.3 'JetBrains Mono',monospace" : 'font-size:13.5px;font-weight:600', 'overflow:hidden;text-overflow:ellipsis')}>
        {value}
      </span>
      {onCopy && (
        <button
          type="button"
          onClick={() => onCopy(value)}
          style={sx(
            'flex:none;margin:-4px -5px -4px 0;padding:5px 9px;border-radius:7px;font-size:11.5px;font-weight:700;cursor:pointer',
            copied
              ? { border: '1px solid var(--mint-line)', background: 'var(--mint-tint)', color: 'var(--mint)' }
              : { border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink-2)' },
          )}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </span>
  );
}

/**
 * `hint` reads under the label, `note` under the control.
 *
 * The IP field had three notes and all of them landed underneath: the
 * suggestions caption, the amber callout, and then "Delta requires this for a
 * key that can trade" — a fact about the field arriving two paragraphs after
 * the field, where it reads as an afterthought about the callout above it.
 * A requirement belongs beside the label it qualifies.
 */
function Field({ label, hint, note, children, tight }) {
  return (
    <div style={sx(tight ? 'margin-bottom:0' : 'margin-bottom:20px')}>
      <span style={sx('display:flex;align-items:center;font-size:12.5px;font-weight:600;color:var(--ink-2)')}>{label}</span>
      {hint && (
        <span style={sx('display:block;margin-top:3px;font-size:11.5px;line-height:1.5;color:var(--ink-faint);max-width:62ch')}>{hint}</span>
      )}
      <span style={sx('display:block;height:7px')} />
      {children}
      {note && (
        <span style={sx('display:block;margin-top:7px;font-size:11.5px;line-height:1.55;color:var(--ink-faint);max-width:62ch')}>
          {note}
        </span>
      )}
    </div>
  );
}

/** Their permission card. `locked` is one the venue turns on and you cannot. */
function PermissionCard({ title, note, locked, off, accent, callout }) {
  return (
    <div
      style={sx(
        'flex:1;min-width:210px;padding:14px 15px;border-radius:11px',
        locked || off
          ? { border: off ? '1px dashed var(--line-strong)' : '1px solid var(--line)', background: 'var(--surface-2)' }
          : { border: `1px solid ${accent.line}`, background: accent.tint },
      )}
    >
      <span style={sx('display:flex;align-items:center;gap:10px')}>
        <span
          aria-hidden
          style={sx(
            'flex:none;display:grid;place-items:center;width:20px;height:20px;border-radius:6px;font-size:12px;font-weight:800',
            off
              ? { border: '1.5px solid var(--line-strong)', background: 'transparent' }
              : locked
                ? { background: 'var(--surface-3)', color: 'var(--ink-faint)' }
                : { background: accent.solid, color: 'var(--surface)' },
          )}
        >
          {off ? '' : '✓'}
        </span>
        <span style={sx('font-size:14px;font-weight:700', locked || off ? { color: 'var(--ink-3)' } : {})}>{title}</span>
      </span>
      {note && (
        <span style={sx('display:block;margin-top:7px;font-size:12px;line-height:1.5;color:var(--ink-faint)')}>{note}</span>
      )}
      {callout && (
        <span style={sx('display:block;margin-top:8px;font-size:12px;line-height:1.5;font-weight:700', { color: accent.text })}>
          {callout}
        </span>
      )}
    </div>
  );
}

const CHECK_ON = (accent) => ({ background: accent.solid, color: 'var(--surface)', border: `1.5px solid ${accent.solid}` });
const CHECK_OFF = { border: '1.5px solid var(--line-strong)', background: 'transparent' };

/** The step number from the checklist above, so list and picture line up. */
function Num({ n, small, gutter }) {
  return (
    <span
      aria-hidden
      style={sx(
        "flex:none;display:inline-grid;place-items:center;border-radius:50%;border:1px solid var(--line-strong);background:var(--surface-3);font:700 10.5px/1 'Space Grotesk',sans-serif;color:var(--ink-2);vertical-align:middle",
        small ? 'width:16px;height:16px;margin-right:7px;font-size:9.5px' : gutter ? 'width:20px;height:20px' : 'width:20px;height:20px;margin-right:8px',
      )}
    >
      {n}
    </span>
  );
}

/**
 * A numbered row: the number sits in its own gutter, so every label, box and
 * card starts on one left edge instead of being pushed right by its badge.
 */
function Step({ n, children }) {
  return (
    <div style={sx('display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:clamp(8px,2vw,12px);align-items:start')}>
      <span style={sx('padding-top:1px;line-height:0')}><Num n={n} gutter /></span>
      <div style={sx('min-width:0')}>{children}</div>
    </div>
  );
}

/** "Tick this" / "Leave off": what to do with a control, always on its right. */
function Tag({ children, pick, accent }) {
  return (
    <span
      style={sx(
        'margin-left:auto;flex:none;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap',
        pick ? { background: accent.solid, color: 'var(--surface)' } : { background: 'var(--surface-3)', color: 'var(--ink-3)' },
      )}
    >
      {children}
    </span>
  );
}

/** Their square checkbox, drawn. */
function Tick({ on, accent }) {
  return (
    <span
      aria-hidden
      style={sx('flex:none;display:grid;place-items:center;width:18px;height:18px;border-radius:5px;font-size:11px;font-weight:800', on ? CHECK_ON(accent) : CHECK_OFF)}
    >
      {on ? '✓' : ''}
    </span>
  );
}

/** Their round radio, drawn. */
function Radio({ on, accent }) {
  return (
    <span
      aria-hidden
      style={sx('flex:none;display:grid;place-items:center;width:18px;height:18px;border-radius:50%', on ? { border: `1.5px solid ${accent.solid}` } : CHECK_OFF)}
    >
      {on && <span style={sx('width:9px;height:9px;border-radius:50%', { background: accent.solid })} />}
    </span>
  );
}

/** A drawn dropdown showing the value to pick. */
function Dropdown({ value, muted }) {
  return (
    <span style={sx(FIELD, 'justify-content:space-between;gap:10px')}>
      <span style={sx('min-width:0;font-size:13.5px;font-weight:600;line-height:1.35;overflow-wrap:anywhere', muted ? { color: 'var(--ink-3)' } : {})}>{value}</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" aria-hidden>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function SectionRule({ children }) {
  return (
    <span style={sx('display:flex;align-items:center;gap:12px;margin:6px 0 18px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)')}>
      <span style={sx('flex:1;height:1px;background:var(--line)')} />
      {children}
      <span style={sx('flex:1;height:1px;background:var(--line)')} />
    </span>
  );
}

/**
 * EXNESS'S "NEW API KEY" PANEL, as it is laid out (read off live screenshots,
 * 24 Oct 2026, my.exness.com/pa/settings/api-management):
 *
 *   Name
 *   ── Scopes ──
 *   [✓] Trading
 *        (•) Full access — "can be used with single account only"
 *             Account ▾   ← the account picker lives INSIDE Full access
 *        ( ) Read-only
 *   [ ] Partnership
 *   [ ] Transfers
 *   ── Security ──
 *   Expiry date ▾ (Never)
 *   Allowed IPs
 *   Public key: (•) Generate key for me / ( ) I'll use my own public key
 *   [Create API key]
 *
 * It does not fit the generic layout — the account is a child of the scope,
 * the IP sits in a Security block after the scopes, and there are radios and
 * a key-type choice nobody else has — so it gets its own drawing rather than
 * flags that would bend the shared one out of shape.
 */
function ExnessForm({ venue, onCopy, copiedValue, accent }) {
  return (
    <div>
      <Step n={1}>
        <Field label="Name" hint="English letters and digits only, up to 16.">
          <FilledBox value={SUGGESTED_KEY_NAME} onCopy={onCopy} copied={copiedValue === SUGGESTED_KEY_NAME} />
        </Field>
      </Step>

      <SectionRule>Scopes</SectionRule>
      <Step n={2}>
        <div style={sx('margin-bottom:20px;border:1px solid var(--line-strong);border-radius:11px;overflow:hidden')}>
          <div style={sx('padding:14px 14px 16px', { background: accent.tint, borderBottom: `1px solid ${accent.line}` })}>
            <span style={sx('display:flex;align-items:center;gap:10px')}>
              <Tick on accent={accent} />
              <span style={sx('font-size:14px;font-weight:700')}>Trading</span>
              <Tag accent={accent} pick>Tick this</Tag>
            </span>

            {/* One indent for everything under Trading: the options line up with
                the word "Trading", and the account picker with "Full access". */}
            <div style={sx('display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin:14px 0 0 clamp(0px,4vw,28px)')}>
              <div style={sx('min-width:0')}>
                <span style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px')}>
                  <Radio on accent={accent} />
                  <span style={sx('display:flex;align-items:center;font-size:13.5px;font-weight:700;white-space:nowrap')}><Num n={3} small />Full access</span>
                  <Tag accent={accent} pick>Pick this</Tag>
                </span>
                <span style={sx('display:block;margin:3px 0 0 28px;font-size:12px;line-height:1.5;color:var(--ink-3)')}>
                  Place orders and manage positions — what lets us close a trade.
                </span>
                <div style={sx('margin:12px 0 0 clamp(0px,4vw,28px)')}>
                  <Field label={<><Num n={4} small />Account</>} hint={venue.accountNote} tight>
                    <Dropdown value={venue.accountDefault} />
                  </Field>
                </div>
              </div>

              <div style={sx('min-width:0;opacity:.7')}>
                <span style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px')}>
                  <Radio accent={accent} />
                  <span style={sx('font-size:13.5px;font-weight:600;color:var(--ink-3)')}>Read-only</span>
                  <Tag accent={accent}>Not this</Tag>
                </span>
                <span style={sx('display:block;margin:3px 0 0 28px;font-size:12px;line-height:1.5;color:var(--ink-faint)')}>
                  It can watch but never close a position, so we refuse it when you connect.
                </span>
              </div>
            </div>
          </div>
          {['Partnership', 'Transfers'].map((label, i) => (
            <div key={label} style={sx('display:flex;align-items:center;gap:10px;padding:12px 14px', i === 0 ? { borderBottom: '1px solid var(--line)' } : {})}>
              <Tick accent={accent} />
              <span style={sx('font-size:13.5px;font-weight:600;color:var(--ink-3)')}>{label}</span>
              <Tag accent={accent}>Leave off</Tag>
            </div>
          ))}
        </div>
      </Step>

      <SectionRule>Security</SectionRule>
      <Step n={5}>
        <Field label="Expiry date" hint="Never — a key that expires switches your protection off on the day it lapses.">
          <Dropdown value="Never" />
        </Field>
      </Step>
      <Step n={6}>
        <Field label={venue.ipField} hint={venue.ipHint}>
          <FilledBox value={ENGINE_EGRESS_IP} mono onCopy={onCopy} copied={copiedValue === ENGINE_EGRESS_IP} />
        </Field>
      </Step>
      <Step n={7}>
        <Field label="Public key">
          <span style={sx('display:grid;gap:11px')}>
            <span style={sx('display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-3);opacity:.7')}>
              <Radio accent={accent} /> I&apos;ll use my own public key
            </span>
            <span style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;font-size:13.5px;font-weight:700')}>
              <Radio on accent={accent} /> <span style={sx('white-space:nowrap')}>Generate key for me</span>
              <Tag accent={accent} pick>Pick this</Tag>
            </span>
          </span>
        </Field>
      </Step>
    </div>
  );
}

/**
 * BLOFIN'S "CREATE API KEY" FORM, in the order BloFin's docs and the key
 * guides other platforms publish describe it (1 Nov 2026):
 *
 *   API Key Usage: ( ) Third-Party  (•) API Transaction  ( ) Tax Report  ( ) BloFin MCP
 *   API Key Name
 *   Permissions: [✓] Read  [✓] Trade  [ ] Withdraw  [ ] Transfer
 *   Passphrase
 *   IP (Optional)
 *   [Next] → email code (+ 2FA) → Submit → API Key / Secret Key → Confirm
 *
 * PLACEHOLDER UNTIL SCREENSHOTS: this has not been checked against a live
 * screenshot of BloFin's form. The order and labels come from venues.js and
 * are the documented ones; when the owner sends screenshots of the form, the
 * verification step and the key summary, correct the strings in venues.js and
 * the layout here. The numbers are ours, so list and picture can be checked
 * against each other item by item.
 */
function BloFinForm({ venue, onCopy, copiedValue, accent }) {
  return (
    <div style={sx('max-width:420px')}>
      <Field label={<><Num n={1} />{venue.usageField}</>} hint={venue.usageNote}>
        <span style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:8px 14px')}>
          {venue.usageOptions.map((o) => {
            const on = o === venue.usageChoice;
            return (
              <span key={o} style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:13px', on ? 'font-weight:700' : 'font-weight:600;color:var(--ink-3)')}>
                <Radio on={on} accent={accent} /> <span>{o}</span>
                {on && <Tag accent={accent} pick>Pick this</Tag>}
              </span>
            );
          })}
        </span>
      </Field>

      <Field label={<><Num n={2} />{venue.keyNameField}</>} hint={venue.keyNameHint}>
        <FilledBox value={SUGGESTED_KEY_NAME} onCopy={onCopy} copied={copiedValue === SUGGESTED_KEY_NAME} />
      </Field>

      <div style={sx('margin-bottom:17px')}>
        <span style={sx('display:flex;align-items:center;margin-bottom:9px;font-size:12px;color:var(--ink-3)')}><Num n={3} />Permissions</span>
        <div style={sx('border:1px solid var(--line-strong);border-radius:11px;overflow:hidden')}>
          {[
            { label: venue.readScopeLabel, note: venue.readScopeNote, on: true },
            { label: venue.scopeLabel, note: venue.scopeNote, on: true, callout: 'Tick this' },
            ...(venue.offScopes ?? []).map((o) => ({ label: o.label, note: o.note, on: false })),
          ].map((row, i, all) => (
            <div
              key={row.label}
              style={sx(
                'display:flex;align-items:flex-start;gap:10px;padding:12px 14px',
                row.on ? { background: accent.tint } : {},
                i < all.length - 1 ? { borderBottom: `1px solid ${row.on ? accent.line : 'var(--line)'}` } : {},
              )}
            >
              <Tick on={row.on} accent={accent} />
              <span style={sx('min-width:0;flex:1')}>
                <span style={sx('display:flex;align-items:center;gap:8px')}>
                  <span style={sx('font-size:13.5px;font-weight:700', row.on ? {} : { color: 'var(--ink-3)' })}>{row.label}</span>
                  <span style={sx('margin-left:auto;font-size:11.5px;font-weight:700', row.on ? { color: accent.text } : { color: 'var(--ink-faint)', fontWeight: 400 })}>
                    {row.callout ?? (row.on ? 'On' : 'Leave off')}
                  </span>
                </span>
                {row.note && <span style={sx('display:block;margin-top:3px;font-size:12px;line-height:1.5;color:var(--ink-faint)')}>{row.note}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Field label={<><Num n={4} />{venue.passphraseField}</>} hint={venue.passphraseNote}>
        <span style={sx(FIELD, 'color:var(--ink-faint);font-size:13px')}>Your own passphrase</span>
      </Field>

      <Field label={<><Num n={5} />{venue.ipField}</>} hint={venue.ipHint}>
        <FilledBox value={ENGINE_EGRESS_IP} mono onCopy={onCopy} copied={copiedValue === ENGINE_EGRESS_IP} />
      </Field>
    </div>
  );
}

/** A row of their radios, ours ticked and tagged "Pick this". */
function RadioRow({ options, choice, accent }) {
  return (
    <span style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:8px 14px')}>
      {options.map((o) => {
        const on = o === choice;
        return (
          <span key={o} style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:13px', on ? 'font-weight:700' : 'font-weight:600;color:var(--ink-3)')}>
            <Radio on={on} accent={accent} /> <span style={sx('min-width:0')}>{o}</span>
            {on && <Tag accent={accent} pick>Pick this</Tag>}
          </span>
        );
      })}
    </span>
  );
}

/**
 * BYBIT'S "CREATE NEW KEY" FORM, in the order Bybit's help centre and the
 * integration guides describe it (checked 9 Nov 2026, not yet against a
 * screenshot of our own):
 *
 *   Key type: (•) System-generated API Keys  ( ) Self-generated
 *   API Key Usage: (•) API Transaction  ( ) Connect to Third-Party Applications
 *   Name for the API key
 *   API Key Permissions: (•) Read-Write  ( ) Read-Only
 *   IP restriction: (•) Only IPs with permissions granted … [our IP]  ( ) No IP restriction
 *   Contract (Unified Trading on UTA): [✓] Orders  [✓] Positions
 *   Assets: [ ] Withdrawal
 *   [Submit] → Google Authenticator code → API Key / Secret Key
 *
 * The IP is required here, not optional as Bybit draws it: user-service
 * refuses a key with none, because Bybit deletes it after 90 days.
 */
function BybitForm({ venue, onCopy, copiedValue, accent }) {
  return (
    <div style={sx('max-width:440px')}>
      <Field label={<><Num n={1} />API key type</>}>
        <RadioRow options={venue.keyTypeOptions} choice={venue.keyTypeChoice} accent={accent} />
      </Field>

      <Field label={<><Num n={2} />{venue.usageField}</>} hint={venue.usageNote}>
        <RadioRow options={venue.usageOptions} choice={venue.usageChoice} accent={accent} />
      </Field>

      <Field label={<><Num n={3} />{venue.keyNameField}</>} hint={venue.keyNameHint}>
        <FilledBox value={SUGGESTED_KEY_NAME} onCopy={onCopy} copied={copiedValue === SUGGESTED_KEY_NAME} />
      </Field>

      <Field label={<><Num n={4} />{venue.accessField}</>} hint="Read-Only can watch but never close a position, so we refuse it.">
        <RadioRow options={venue.accessOptions} choice={venue.accessChoice} accent={accent} />
      </Field>

      <Field label={<><Num n={5} />{venue.ipField}</>} hint={venue.ipHint}>
        <span style={sx('display:grid;gap:10px')}>
          <span style={sx('display:flex;flex-wrap:wrap;align-items:flex-start;gap:6px 8px;font-size:13px;font-weight:700;line-height:1.4')}>
            <Radio on accent={accent} /> <span style={sx('flex:1;min-width:0')}>{venue.ipChoice}</span>
            <Tag accent={accent} pick>Pick this</Tag>
          </span>
          <FilledBox value={ENGINE_EGRESS_IP} mono onCopy={onCopy} copied={copiedValue === ENGINE_EGRESS_IP} />
          <span style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:13px;font-weight:600;color:var(--ink-3)')}>
            <Radio accent={accent} /> <span>{venue.ipOther}</span>
            <Tag accent={accent}>Not this</Tag>
          </span>
        </span>
      </Field>

      <div style={sx('margin-bottom:17px')}>
        <span style={sx('display:flex;align-items:center;margin-bottom:4px;font-size:12px;color:var(--ink-3)')}><Num n={6} />Permissions</span>
        <span style={sx('display:block;margin:0 0 9px;font-size:11.5px;line-height:1.5;color:var(--ink-faint)')}>{venue.scopeGroupNote}</span>
        <div style={sx('border:1px solid var(--line-strong);border-radius:11px;overflow:hidden')}>
          <div style={sx('padding:12px 14px', { background: accent.tint, borderBottom: `1px solid ${accent.line}` })}>
            <span style={sx('display:flex;align-items:center;gap:8px')}>
              <span style={sx('font-size:13.5px;font-weight:700')}>{venue.scopeGroup}</span>
              <span style={sx('margin-left:auto;font-size:11.5px;font-weight:700', { color: accent.text })}>Tick both</span>
            </span>
            <span style={sx('display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:9px')}>
              {venue.scopeTicks.map((t) => (
                <span key={t} style={sx('display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700')}>
                  <Tick on accent={accent} /> {t}
                </span>
              ))}
            </span>
            <span style={sx('display:block;margin-top:7px;font-size:12px;line-height:1.5;color:var(--ink-faint)')}>{venue.scopeNote}</span>
          </div>
          {(venue.offScopes ?? []).map((o) => (
            <div key={o.label} style={sx('display:flex;align-items:flex-start;gap:10px;padding:12px 14px')}>
              <Tick accent={accent} />
              <span style={sx('min-width:0;flex:1')}>
                <span style={sx('display:flex;align-items:center;gap:8px')}>
                  <span style={sx('font-size:13.5px;font-weight:700;color:var(--ink-3)')}>{o.label}</span>
                  <span style={sx('margin-left:auto;font-size:11.5px;color:var(--ink-faint)')}>Leave off</span>
                </span>
                {o.note && <span style={sx('display:block;margin-top:3px;font-size:12px;line-height:1.5;color:var(--ink-faint)')}>{o.note}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VenueFormReplica({ venue, onCopy, copiedValue }) {
  if (!venue) return null;
  const hasScopeChoice = venue.scopeChoice !== false;
  const accent = accentOf(venue);

  return (
    <figure style={sx('margin:0;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);overflow:hidden')}>
      {/* A window, not a form: a title bar saying whose page this is and that
          it is a picture, then their panel on its own card. The backdrop
          either side of the card is the page around their panel — it reads as
          a screenshot, where a full-width box with a narrow column in it read
          as a broken form with empty space. */}
      <figcaption style={sx('display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--line);background:var(--surface-3)')}>
        <span aria-hidden style={sx('display:flex;gap:5px;flex:none')}>
          {[0, 1, 2].map((i) => <span key={i} style={sx('width:8px;height:8px;border-radius:50%;background:var(--line-strong)')} />)}
        </span>
        <span style={sx('min-width:0;font-size:12px;font-weight:600;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
          {venue.name} · {venue.formTitle ?? 'New API key'}
        </span>
        <span style={sx('margin-left:auto;flex:none;font-size:11px;color:var(--ink-faint)')}>Picture only</span>
      </figcaption>

      <div style={sx('padding:clamp(12px,3vw,26px) clamp(10px,3vw,26px)')}>
      <div style={sx('max-width:520px;margin:0 auto;padding:clamp(16px,3vw,24px);border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:0 1px 2px rgba(15,23,42,.04),0 8px 24px -12px rgba(15,23,42,.12)')}>
        {venue.family === 'exness' ? (
          <ExnessForm venue={venue} onCopy={onCopy} copiedValue={copiedValue} accent={accent} />
        ) : venue.family === 'blofin' ? (
          <BloFinForm venue={venue} onCopy={onCopy} copiedValue={copiedValue} accent={accent} />
        ) : venue.family === 'bybit' ? (
          <BybitForm venue={venue} onCopy={onCopy} copiedValue={copiedValue} accent={accent} />
        ) : (
        <>
        {venue.accountField && (
          /* Delta only. A key made on the wrong account connects and passes
             the scope check, then cannot touch the position the user holds. */
          <Field label={venue.accountField} hint={venue.accountNote}>
            <span style={sx(FIELD, 'max-width:420px;justify-content:space-between')}>
              <span style={sx('font-size:13.5px;font-weight:600')}>{venue.accountDefault ?? 'Main'}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" aria-hidden>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Field>
        )}

        {venue.suggestsKeyName && (
          <Field label={venue.keyNameField ?? 'Name'} hint={venue.keyNameHint ?? 'Any label you will recognise later.'}>
            <FilledBox value={SUGGESTED_KEY_NAME} onCopy={onCopy} copied={copiedValue === SUGGESTED_KEY_NAME} />
          </Field>
        )}

        {venue.hasPassphrase && (
          /* A venue whose key has a passphrase (BloFin draws its own form
             above). The user chooses it on their form — so there is no
             value of ours to copy, only the instruction to keep it. */
          <Field label={venue.passphraseField ?? 'Passphrase'} hint={venue.passphraseNote}>
            <span style={sx(FIELD, 'max-width:420px;color:var(--ink-faint);font-size:13px')}>Your own passphrase</span>
          </Field>
        )}

        <Field
          label={venue.ipField}
          hint={
            venue.ipHint ? venue.ipHint : venue.ipRequired
              ? `${venue.name} requires this for a key that can trade.`
              : 'Optional on their form — we use it, so the key works from us and nowhere else.'
          }
        >
          {venue.ipChips?.length > 0 && (
            /* Their one-click chips, drawn so the replica matches the screen,
               and drawn struck through because "My IP Address" is the likeliest
               wrong turn on the page: it whitelists the user's own computer,
               and the key then connects, verifies, and fails from us. */
            <span style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px')}>
              {venue.ipChips.map((chip) => (
                <span
                  key={chip}
                  style={sx('padding:5px 10px;border:1px dashed var(--line);border-radius:999px;font-size:11.5px;color:var(--ink-faint);text-decoration:line-through')}
                >
                  {chip}
                </span>
              ))}
              <span style={sx('width:100%;font-size:11.5px;color:var(--ink-faint)')}>
                {venue.name}&apos;s own suggestions — none of them is us.
              </span>
            </span>
          )}

          <span style={sx('display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
            <FilledBox value={ENGINE_EGRESS_IP} mono onCopy={onCopy} copied={copiedValue === ENGINE_EGRESS_IP} />
            {venue.ipAddButton && (
              <span
                aria-hidden
                style={sx('flex:none;padding:11px 16px;border-radius:9px;font-size:13px;font-weight:700', {
                  border: `1px solid ${accent.line}`,
                  background: accent.tint,
                  color: accent.text,
                })}
              >
                {venue.ipAddButton}
              </span>
            )}
          </span>

          {venue.ipAddNote && (
            <span
              style={sx('display:block;margin-top:10px;padding:10px 12px;border-radius:9px;font-size:12px;line-height:1.55;max-width:62ch', {
                border: `1px solid ${accent.line}`,
                background: accent.tint,
                color: 'var(--ink-2)',
              })}
            >
              <strong style={sx('font-weight:700', { color: accent.text })}>Press {venue.ipAddButton ?? 'Add'}.</strong>{' '}
              The box is not the list — an IP typed in and left sitting there is dropped when you create the key.
            </span>
          )}
        </Field>

        <div style={sx('margin-bottom:17px')}>
          <span style={sx('display:block;margin-bottom:9px;font-size:12px;color:var(--ink-3)')}>Permissions</span>

          {hasScopeChoice ? (
            <>
              <div style={sx('display:flex;gap:11px;flex-wrap:wrap')}>
                {venue.readScopeLabel && (
                  /* Already on and not yours to change. Drawn so the block
                     looks like theirs, and so nobody reads "all API keys have
                     read permissions" as meaning the key is finished. */
                  <PermissionCard title={venue.readScopeLabel} note={venue.readScopeNote} locked={!venue.readScopeSelectable} accent={accent} />
                )}
                <PermissionCard
                  title={venue.scopeLabel}
                  note={venue.scopeNote}
                  accent={accent}
                  callout="Tick this — it is what lets us close a position"
                />
                {(venue.offScopes ?? []).map((o) => (
                  /* Drawn unticked: a permission on their form that must stay
                     off. Leaving it out would let someone tick it unwarned. */
                  <PermissionCard key={o.label} title={o.label} note={o.note} off accent={accent} />
                ))}
              </div>
            </>
          ) : venue.afterCreate ? (
            /* Shark. Not absent — deferred. Saying "there is nothing to tick"
               here, as CoinDCX's branch does, would be the more dangerous
               wrong answer of the two: it reads as "you are done". */
            <span style={sx('display:block;font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:62ch')}>
              Not on this form. {venue.name} sets permissions <strong>after</strong> the key exists, which is the next step.
            </span>
          ) : (
            /* CoinDCX's form has no permission control. Saying "there is
               nothing to tick" is the instruction — otherwise people look. */
            <span style={sx('display:block;font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:62ch')}>
              {venue.name} has no permission checkbox — there is nothing to tick here. We check the key can act the moment
              you connect it and say so plainly if it cannot.
            </span>
          )}
        </div>
        </>
        )}

        {venue.submitLabel && (
          <span style={sx('display:flex;align-items:center;gap:12px;margin-top:4px')}>
          {venue.family === 'exness' && <Num n={8} gutter />}
          {venue.family === 'blofin' && <Num n={6} />}
          {venue.family === 'bybit' && <Num n={7} />}
          <span
            aria-hidden
            style={sx('display:inline-block;padding:13px 22px;border-radius:10px;font-size:14px;font-weight:700', {
              border: `1px solid ${accent.line}`,
              background: accent.tint,
              color: accent.text,
            })}
          >
            {venue.submitLabel}
          </span>
          </span>
        )}

        {venue.otpNote && (
          /* The confirmation code, said where it arrives rather than in a list
             read before any of this started. CoinDCX sends two, by two
             different routes; Shark's expires. Both are the kind of thing that
             strands someone mid-flow if it is a surprise. */
          <span style={sx('display:block;margin-top:13px;font-size:12px;line-height:1.55;color:var(--ink-3);max-width:62ch')}>
            {venue.otpNote}
          </span>
        )}
      </div>
      </div>

      <div style={sx('padding:11px 16px;border-top:1px solid var(--line);background:var(--surface-3);font-size:11.5px;line-height:1.55;color:var(--ink-3)')}>
        {venue.noWithdrawNote ?? (
          <>
            There is no withdrawal permission on {venue.name} to give away — the key can read your account and place trades,
            and nothing else.
          </>
        )}
      </div>
    </figure>
  );
}
