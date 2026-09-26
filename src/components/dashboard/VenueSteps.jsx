import { sx } from './shell/sx';

/**
 * The venue's own key-creation flow, field by field, in the venue's own words.
 *
 * One component because three surfaces show this and they had drifted. Connect
 * key rendered `venue.createSteps` — the real, checked list. The Accounts page
 * and the settings panel rendered a hardcoded three-item list instead:
 *
 *   1. Open the {venue} app → tap {mobilePath}
 *   2. {ipField}: paste our IP
 *   3. Tick {scopeLabel}, create the key, paste it below
 *
 * Which was wrong in three ways at once by the time venues differed. CoinDCX
 * and Shark have no mobile key flow at all, so step 1 named an app screen that
 * does not exist. Shark's real flow is six steps including an SMS code that
 * list never mentioned. And CoinDCX has no permission control, so step 3 sent
 * people hunting for a tick box that is not on the form.
 *
 * createSteps is the checked data — corrected against live screenshots for all
 * three venues — so every surface reads it and nobody maintains a second copy.
 */
export default function VenueSteps({ venue, title }) {
  const steps = venue?.createSteps ?? [];
  if (steps.length === 0) return null;

  return (
    <div style={sx('border:1px solid var(--line);border-radius:12px;background:var(--surface-2);overflow:hidden')}>
      <div
        style={sx(
          "padding:10px 14px;border-bottom:1px solid var(--line);font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-faint)",
        )}
      >
        {title ?? `What ${venue.name} asks for`}
      </div>
      <ol style={sx('margin:0;padding:6px 0;list-style:none')}>
        {steps.map((cs, n) => (
          <li key={cs.title} className="venue-step" style={sx('display:flex;gap:11px;padding:9px 14px')}>
            <span
              style={sx(
                "flex:none;width:19px;height:19px;border-radius:6px;display:grid;place-items:center;margin-top:1px;background:var(--surface-3);font:700 10px/1 'JetBrains Mono',monospace;color:var(--ink-3)",
              )}
            >
              {n + 1}
            </span>
            <span style={sx('flex:1;min-width:0')}>
              <span style={sx('display:block;font-size:12.5px;font-weight:600')}>{cs.title}</span>
              <span style={sx('display:block;margin-top:2px;font-size:12px;line-height:1.55;color:var(--ink-3)')}>{cs.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
