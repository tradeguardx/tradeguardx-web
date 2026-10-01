import { sx } from './shell/sx';
import { ENGINE_EGRESS_IP } from '../../lib/venues';
import { accentOf } from './venueAccent';

/**
 * The screen a venue shows AFTER Create, drawn as it is drawn.
 *
 * Only Shark has one, and it is a step of its own rather than a footnote to
 * the create form, because it is where the job is actually finished. Three
 * things happen on it and two of them are easy to walk past:
 *
 *   - the secret is visible here and never again
 *   - the key is issued Read-only, so Trade Futures has to be ticked
 *   - Save & Complete is inert until the "I have noted & stored" box is ticked
 *
 * Someone who copies the credentials and closes the tab at that point has a
 * key that connects to us, passes the connect check, and can never close a
 * position. That is the worst failure this flow has: they believe they are
 * covered. A picture of the screen is the warning.
 *
 * NOTHING HERE IS A REAL CONTROL — every box is a span, same as the create
 * form replica. And the key and secret shown are deliberately not real values:
 * we cannot know theirs, and drawing something key-shaped that is ours would
 * be the one thing worse than drawing nothing.
 */

const HEADING = 'display:block;font-size:12px;font-weight:600;color:var(--ink-3);border-bottom:1px solid var(--line);padding-bottom:4px;margin-bottom:8px';

/** Their copy / reveal glyphs, so the rows read as theirs. */
function Glyphs({ eye }) {
  return (
    <span style={sx('display:inline-flex;align-items:center;gap:9px;color:var(--ink-faint)')} aria-hidden>
      {eye && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
          <path d="M9.9 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a12 12 0 01-2.4 3.3M6.3 6.7A12.4 12.4 0 003 12c0 2.5 4 7 9 7a9.6 9.6 0 003.3-.6" />
        </svg>
      )}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 012-2h8" />
      </svg>
    </span>
  );
}

/** Their checkbox, ticked or not, with our reason underneath when it matters. */
function CheckRow({ label, on, accent, note, callout }) {
  return (
    <span style={sx('display:block')}>
      <span style={sx('display:flex;align-items:center;gap:9px')}>
        <span
          aria-hidden
          style={sx(
            'flex:none;display:grid;place-items:center;width:19px;height:19px;border-radius:5px;font-size:11px;font-weight:800',
            on
              ? { border: `1px solid ${accent.line}`, background: accent.solid, color: 'var(--surface)' }
              : { border: '1px solid var(--line-strong)', background: 'var(--surface-2)', color: 'transparent' },
          )}
        >
          ✓
        </span>
        <span style={sx('font-size:13.5px;font-weight:600', on ? {} : { color: 'var(--ink-3)' })}>{label}</span>
      </span>
      {note && (
        <span style={sx('display:block;margin:4px 0 0 28px;font-size:11.5px;line-height:1.5;color:var(--ink-faint);max-width:56ch')}>{note}</span>
      )}
      {callout && (
        <span style={sx('display:block;margin:4px 0 0 28px;font-size:12px;line-height:1.5;font-weight:700;max-width:56ch', { color: accent.text })}>
          {callout}
        </span>
      )}
    </span>
  );
}

export default function VenueAfterCreate({ venue }) {
  const a = venue?.afterCreate;
  if (!a) return null;
  const accent = accentOf(venue);

  return (
    <figure style={sx('margin:13px 0 0;border:1px solid var(--line);border-radius:13px;background:var(--surface);overflow:hidden')}>
      <figcaption style={sx('padding:11px 16px;border-bottom:1px solid var(--line);background:var(--surface-3);font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
        This is the screen {venue.name} shows next —{' '}
        <span style={sx('color:var(--ink-faint)')}>a picture of it, not a live form.</span>
      </figcaption>

      <div style={sx('padding:16px')}>
        <span style={sx('display:block;padding:10px 12px;border:1px solid var(--amber-line);border-radius:9px;background:var(--amber-tint);font-size:12px;line-height:1.55;color:var(--ink-2);max-width:62ch')}>
          {a.lead}
        </span>

        {/* Their key and secret rows. The values are drawn as masks on
            purpose: we cannot know theirs, and anything key-shaped here would
            be read as something to copy. */}
        <div style={sx('margin-top:16px')}>
          <span style={sx(HEADING)}>{a.keyLabel}</span>
          <span style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
            <span style={sx("font:600 13px/1.3 'JetBrains Mono',monospace;color:var(--ink-3);letter-spacing:.06em")}>
              ••••••••••••••••••••
            </span>
            <Glyphs />
            <span style={sx('font-size:11.5px;color:var(--ink-faint)')}>yours appears here — copy it</span>
          </span>
        </div>

        <div style={sx('margin-top:14px')}>
          <span style={sx(HEADING)}>{a.secretLabel}</span>
          <span style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
            <span style={sx("font:600 13px/1.3 'JetBrains Mono',monospace;color:var(--ink-3);letter-spacing:.06em")}>
              ••••••••••••••••••••
            </span>
            <Glyphs eye />
            <span style={sx('font-size:11.5px;font-weight:600', { color: accent.text })}>copy it now — this is the only screen it is shown on</span>
          </span>
        </div>

        <div style={sx('margin-top:16px')}>
          <span style={sx(HEADING)}>{a.restrictionsHeading}</span>
          <div style={sx('display:flex;gap:26px;flex-wrap:wrap')}>
            <CheckRow label={a.readScopeLabel} on accent={accent} note={a.readScopeNote} />
            <CheckRow
              label={venue.scopeLabel}
              on
              accent={accent}
              callout="Tick this — it is what lets us close a position"
              note={a.scopeNote}
            />
          </div>
        </div>

        <div style={sx('margin-top:16px')}>
          <span style={sx(HEADING)}>{a.ipHeading}</span>
          <span style={sx('display:block;font-size:13px;font-weight:600')}>{a.ipMode}</span>
          {/* The IP added on the create form is already here as a chip, so
              there is nothing to do in this block — which is worth drawing,
              because an empty-looking input beside a Confirm button reads as
              an unfinished field. */}
          <span style={sx('display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:9px')}>
            <span style={sx("display:inline-flex;align-items:center;gap:8px;padding:6px 11px;border-radius:999px;background:var(--surface-3);font:500 12.5px/1 'JetBrains Mono',monospace")}>
              {ENGINE_EGRESS_IP}
              <span aria-hidden style={sx('color:var(--ink-faint)')}>✕</span>
            </span>
            <span style={sx('font-size:11.5px;color:var(--ink-faint)')}>already there from the last screen — leave it</span>
          </span>
        </div>

        <ul style={sx('margin:16px 0 0;padding:0 0 0 18px;font-size:12px;line-height:1.7', { color: 'var(--amber)' })}>
          {a.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>

        <div style={sx('margin-top:15px')}>
          <CheckRow label={a.confirmLabel} on accent={accent} />
        </div>

        <span
          aria-hidden
          style={sx('display:inline-block;margin-top:14px;padding:11px 18px;border-radius:9px;font-size:13px;font-weight:700', {
            border: `1px solid ${accent.line}`,
            background: accent.tint,
            color: accent.text,
          })}
        >
          {a.submitLabel}
        </span>
        {a.submitNote && (
          <span style={sx('display:block;margin-top:7px;font-size:11.5px;color:var(--ink-faint)')}>{a.submitNote}</span>
        )}
      </div>
    </figure>
  );
}
