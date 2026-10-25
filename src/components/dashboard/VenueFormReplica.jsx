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
    <span style={sx(FIELD, 'flex:1;min-width:190px;max-width:420px;justify-content:space-between;gap:10px')}>
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
function Field({ label, hint, note, children }) {
  return (
    <div style={sx('margin-bottom:17px')}>
      <span style={sx('display:block;font-size:12px;color:var(--ink-3)')}>{label}</span>
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
function Num({ n }) {
  return (
    <span aria-hidden style={sx("flex:none;display:inline-grid;place-items:center;width:18px;height:18px;margin-right:7px;border-radius:50%;border:1px solid var(--line-strong);background:var(--surface-3);font:700 10.5px/1 'Space Grotesk',sans-serif;color:var(--ink);vertical-align:middle")}>{n}</span>
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
    <span style={sx(FIELD, 'max-width:420px;justify-content:space-between;gap:10px')}>
      <span style={sx('font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis', muted ? { color: 'var(--ink-3)' } : {})}>{value}</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" aria-hidden>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function SectionRule({ children }) {
  return (
    <span style={sx('display:flex;align-items:center;gap:12px;margin:4px 0 14px;font-size:12px;color:var(--ink-faint)')}>
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
  // One column as wide as the input boxes, so the Scopes card, the section
  // rules and the fields share a right edge instead of a ragged one.
  return (
    <div style={sx('max-width:420px')}>
      <Field label={<><Num n={1} />Name</>} hint="English letters and digits only, up to 16.">
        <FilledBox value={SUGGESTED_KEY_NAME} onCopy={onCopy} copied={copiedValue === SUGGESTED_KEY_NAME} />
      </Field>

      <SectionRule>Scopes</SectionRule>
      <div style={sx('margin-bottom:18px;border:1px solid var(--line-strong);border-radius:11px;overflow:hidden')}>
        <div style={sx('padding:13px 14px', { background: accent.tint, borderBottom: `1px solid ${accent.line}` })}>
          <span style={sx('display:flex;align-items:center;gap:10px')}>
            <Num n={2} />
            <Tick on accent={accent} />
            <span style={sx('font-size:14px;font-weight:700')}>Trading</span>
            <span style={sx('margin-left:auto;font-size:11.5px;font-weight:700', { color: accent.text })}>Tick this</span>
          </span>
          <div style={sx('margin:12px 0 0 28px')}>
            <span style={sx('display:flex;align-items:flex-start;gap:10px')}>
              <Radio on accent={accent} />
              <span>
                <span style={sx('display:flex;align-items:center;font-size:13.5px;font-weight:700')}><Num n={3} />Full access</span>
                <span style={sx('display:block;margin-top:2px;font-size:12px;line-height:1.5;color:var(--ink-faint)')}>
                  Place orders and manage positions — what lets us close a trade.
                </span>
              </span>
            </span>
            <div style={sx('margin:11px 0 0 28px')}>
              <Field label={<><Num n={4} />Account</>} hint={venue.accountNote}>
                <Dropdown value={venue.accountDefault} />
              </Field>
            </div>
            <span style={sx('display:flex;align-items:flex-start;gap:10px;margin-top:-4px')}>
              <Radio accent={accent} />
              <span>
                <span style={sx('display:block;font-size:13.5px;font-weight:600;color:var(--ink-3)')}>Read-only</span>
                <span style={sx('display:block;margin-top:2px;font-size:12px;line-height:1.5;color:var(--ink-faint)')}>
                  Not this one — it can watch but never close a position, and we turn it away.
                </span>
              </span>
            </span>
          </div>
        </div>
        {['Partnership', 'Transfers'].map((label, i) => (
          <div key={label} style={sx('display:flex;align-items:center;gap:10px;padding:12px 14px', i === 0 ? { borderBottom: '1px solid var(--line)' } : {})}>
            <Tick accent={accent} />
            <span style={sx('font-size:13.5px;font-weight:600;color:var(--ink-3)')}>{label}</span>
            <span style={sx('margin-left:auto;font-size:11.5px;color:var(--ink-faint)')}>Leave off</span>
          </div>
        ))}
      </div>

      <SectionRule>Security</SectionRule>
      <Field label={<><Num n={5} />Expiry date</>} hint="Never — a key that expires switches your protection off on the day it lapses.">
        <Dropdown value="Never" />
      </Field>
      <Field label={<><Num n={6} />{venue.ipField}</>} hint={venue.ipHint}>
        <FilledBox value={ENGINE_EGRESS_IP} mono onCopy={onCopy} copied={copiedValue === ENGINE_EGRESS_IP} />
      </Field>
      <Field label={<><Num n={7} />Public key</>}>
        <span style={sx('display:grid;gap:10px')}>
          <span style={sx('display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-3)')}>
            <Radio accent={accent} /> I&apos;ll use my own public key
          </span>
          <span style={sx('display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:700')}>
            <Radio on accent={accent} /> Generate key for me
          </span>
        </span>
      </Field>
  </div>
  );
}

export default function VenueFormReplica({ venue, onCopy, copiedValue }) {
  if (!venue) return null;
  const hasScopeChoice = venue.scopeChoice !== false;
  const accent = accentOf(venue);

  return (
    <figure style={sx('margin:0;border:1px solid var(--line);border-radius:13px;background:var(--surface);overflow:hidden')}>
      {!venue.formStepBody && (
      <figcaption style={sx('padding:11px 16px;border-bottom:1px solid var(--line);background:var(--surface-3);font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
        This is {venue.name}&apos;s form, filled in. Make yours look like this —{' '}
        <span style={sx('color:var(--ink-faint)')}>nothing below is live, the boxes are a picture.</span>
      </figcaption>
      )}

      <div style={sx('padding:18px 16px 16px')}>
        {venue.family === 'exness' ? (
          <ExnessForm venue={venue} onCopy={onCopy} copiedValue={copiedValue} accent={accent} />
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
          /* BloFin. The user chooses it here, on their form — so there is no
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
          <>
          {venue.family === 'exness' && <Num n={8} />}
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
          </>
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
