import { sx } from './shell/sx';

/**
 * How to reach the venue's create-key form, as the two or three taps it is.
 *
 * Step one of the connect flow used to render the whole createSteps list —
 * every field of the form written out — directly above step two, which draws
 * that same form already filled in. Two descriptions of one screen, the first
 * arriving before the reader has seen the screen at all. Finding the page is
 * the only job step one has.
 *
 * The venue-specific detail did not go anywhere: the fields are in the replica,
 * where they sit beside the value to paste, and the code the venue texts you is
 * in otpNote under the same replica, at the point it arrives. The full written
 * walkthrough is still what the account page and the settings panel render, and
 * still what shows if the screenshots fail to load.
 *
 * LAYOUT IS THE WHOLE DIFFICULTY HERE, because the one screen this is for is a
 * phone. Two things broke it:
 *
 *   - The label sat inline with the chips, so "In the Delta app" ate a third of
 *     the row and forced a wrap after two taps. It is a caption; it belongs on
 *     its own line.
 *   - Each chip was grouped with the separator BEFORE it, so a wrap put a
 *     dangling "› Create API key" at the start of the next line, which reads as
 *     a rendering fault rather than a breadcrumb. The separator now trails the
 *     chip it follows, the way every breadcrumb does, so a wrapped line begins
 *     with a word.
 */
export default function VenuePath({ venue }) {
  const path = venue?.navPath;
  if (!path?.length) return null;

  // Delta is the one venue with a working app flow, and its desktop users get
  // a direct link, so the taps are the phone path. The other two have no app
  // create-key screen at all, so theirs is the only path there is.
  const where = venue.desktopOnly ? `On ${venue.name}` : `In the ${venue.name} app`;

  return (
    <div style={sx('margin-top:13px')}>
      <span style={sx('display:block;margin-bottom:7px;font-size:11.5px;color:var(--ink-faint)')}>{where}</span>
      <div style={sx('display:flex;align-items:center;gap:7px;flex-wrap:wrap')}>
        {path.map((tap, i) => (
          <span key={tap} style={sx('display:inline-flex;align-items:center;gap:7px;white-space:nowrap')}>
            <span style={sx('padding:6px 11px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface-2);font-size:12.5px;font-weight:600')}>
              {tap}
            </span>
            {i < path.length - 1 && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
