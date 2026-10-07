import VenueMark from './VenueMark';
import { sx } from './shell/sx';

/**
 * Choose the exchange. The first real decision in setup, and the only one in
 * it that is genuinely the user's — everything after is derived, pasted or
 * defaulted.
 *
 * Extracted because it is now rendered on the accounts page and as step one
 * of the setup flow. Two copies of the list of venues we support is two
 * places to forget a venue, and the one that gets forgotten is always the
 * newest — the one people are being told about.
 */
export default function VenuePicker({ venues, loading, onPick, columns = 'repeat(auto-fit,minmax(min(100%,190px),1fr))' }) {
  if (loading && venues.length === 0) {
    return <p style={sx('margin:0;font-size:12.5px;color:var(--ink-3)')}>Loading exchanges…</p>;
  }

  return (
    <div style={sx('display:grid;gap:9px', { gridTemplateColumns: columns })}>
      {venues.map((pf) => {
        /* `planned` venues are shown rather than hidden: "is my exchange
           coming" is a question people ask before they sign up, and an empty
           space does not answer it. */
        const planned = pf.status === 'planned';
        return (
          <button
            key={pf.brokerId}
            type="button"
            disabled={planned}
            onClick={() => onPick(pf.brokerId)}
            style={sx(
              'display:flex;align-items:center;gap:10px;padding:12px 13px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2);text-align:left;cursor:pointer',
              planned ? { opacity: 0.5, cursor: 'not-allowed' } : {},
            )}
          >
            <VenueMark slug={pf.brokerId} name={pf.name} size={30} radius={9} />
            <span style={sx('flex:1;min-width:0')}>
              <span style={sx('display:block;font-size:13px;font-weight:600')}>{pf.name}</span>
              <span style={sx('display:block;margin-top:2px;font-size:11.5px;color:var(--ink-3)')}>
                {planned ? 'Coming soon' : 'Runs on our servers'}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
