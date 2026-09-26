import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { AddAccountForm } from '../../pages/TradingAccountsPage';
import { ConnectKeyFlow } from '../../pages/ConnectKeyPage';
import { AlertsSettings } from '../../pages/AlertsPage';
import { venueFor } from '../../lib/venues';
import VenueMark from './VenueMark';
import { sx } from './shell/sx';

/**
 * Adding a venue, end to end, in one place.
 *
 * It used to be three destinations a user had to find for themselves: create
 * the account here, connect a key on another page, set up alerts on a third.
 * Nothing said the second and third existed, so accounts sat created and
 * unconnected — which is the worst of the three states, because the dashboard
 * lists the account and nothing is being enforced on it.
 *
 * The stages are deliberately the REAL screens, not reduced copies:
 * ConnectKeyFlow and AlertsSettings are the same components the standalone
 * pages render. A wizard with its own simplified connect form is a second
 * implementation of the most important step in the product, and it would drift
 * from the real one within a release.
 *
 * ORDER IS THE ARGUMENT. Account, then key, then alerts — each stage is
 * useless without the one before, and the middle one is the only one that
 * makes the guard real. Alerts are last because they are the only optional
 * step: the guard acts whether or not you can be told about it.
 */

const STAGES = [
  { n: 1, key: 'account', label: 'Account' },
  { n: 2, key: 'key', label: 'Connect key' },
  { n: 3, key: 'alerts', label: 'Alerts' },
];

function Rail({ at }) {
  return (
    <ol
      className="wiz-rail"
      style={sx('display:flex;align-items:center;gap:0;margin:0;padding:0;list-style:none')}
    >
      {STAGES.map((s, i) => {
        const done = at > s.n;
        const here = at === s.n;
        return (
          <li key={s.key} style={sx('display:flex;align-items:center;gap:9px;min-width:0')}>
            <span
              aria-current={here ? 'step' : undefined}
              style={sx(
                "flex:none;display:grid;place-items:center;width:25px;height:25px;border-radius:8px;font:700 11px/1 'JetBrains Mono',monospace",
                done
                  ? { background: 'var(--mint-solid)', color: 'var(--surface)' }
                  : here
                    ? { background: 'var(--ink)', color: 'var(--surface)' }
                    : { background: 'var(--surface-3)', color: 'var(--ink-faint)' },
              )}
            >
              {done ? '✓' : s.n}
            </span>
            {/* The label is hidden on a phone; the numbers and the heading
                below already say where you are, and three labels plus two
                connectors do not fit without wrapping into a second row. */}
            <span
              className="wiz-rail__label"
              style={sx('font-size:12.5px;font-weight:600;white-space:nowrap', {
                color: here ? 'var(--ink)' : 'var(--ink-3)',
              })}
            >
              {s.label}
            </span>
            {i < STAGES.length - 1 && (
              <span
                aria-hidden
                className="wiz-rail__bar"
                style={sx('flex:1;min-width:14px;height:1px;margin:0 11px', {
                  background: done ? 'var(--mint-solid)' : 'var(--line)',
                })}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function AddVenueWizard({ accessToken, supportedProps, propsLoading, onDone, onCancel, toast, presetSlug = '' }) {
  const { refreshTradingAccounts, setSelectedTradingAccountId } = useTradingAccounts();
  const [at, setAt] = useState(1);
  const venue = presetSlug ? venueFor(presetSlug) : null;

  // Stage 2 and 3 read the SELECTED account, not a prop — that is how the real
  // pages work, and pointing the selection at the new account is what lets the
  // wizard reuse them untouched. It also leaves the rest of the dashboard
  // scoped to the account you just made, which is where you want to be when
  // the wizard closes.
  const afterCreate = async (created) => {
    await refreshTradingAccounts();
    if (created?.id) setSelectedTradingAccountId(created.id);
    setAt(2);
  };

  const heading =
    at === 1
      ? { h: 'Name the account', p: 'Just a label so you can tell this account from the others. The key comes next.' }
      : at === 2
        ? { h: 'Connect the key', p: 'This is the step that turns your rules into something that acts. Until it is done the account is listed but nothing is enforced on it.' }
        : { h: 'How you hear about it', p: 'The guard acts whether or not you are watching. This is how you find out it did — and it is the one step you can skip.' };

  return (
    /*
     * Header / body / footer, like any product dialog — not one padded box
     * with everything stacked in it. The rail is chrome and belongs against
     * the top edge; the stage content scrolls independently so a long stage
     * (alerts) never pushes the rail off screen and leaves you unsure where
     * you are.
     */
    <section className="wiz-card" style={sx('display:flex;flex-direction:column;max-height:calc(100vh - 96px);border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
      {/*
        * The dialog has a SUBJECT, not just a progress rail. A header of three
        * bare numbers could belong to any flow in the product; the venue's mark
        * and name say what you are actually in the middle of — which matters
        * most at stage 2, where the screen fills with that venue's own
        * instructions and it is easy to forget which account they are for.
        *
        * Right padding leaves the close button its corner — without it the
        * third stage label runs under the X on a narrow modal.
        */}
      <header style={sx('flex:none;padding:14px 52px 12px 18px;border-bottom:1px solid var(--line);background:var(--surface-2)')}>
        {venue && (
          <div style={sx('display:flex;align-items:center;gap:10px;margin-bottom:12px')}>
            <VenueMark slug={presetSlug} name={venue.name} size={28} radius={9} />
            <span style={sx('display:flex;flex-direction:column;min-width:0')}>
              <span style={sx('font-size:13.5px;font-weight:600;letter-spacing:-.006em')}>{venue.longName ?? venue.name}</span>
              <span style={sx("font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);margin-top:3px")}>Adding an account</span>
            </span>
          </div>
        )}
        <Rail at={at} />
      </header>

      <div className="wiz-body" style={sx('flex:1;min-height:0;overflow-y:auto;padding:18px 20px')}>
        {/* Each stage animates in rather than snapping. The direction is
            always forward-on-advance, back-on-Back, so the motion says which
            way you moved — a cross-fade alone would not. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={at}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
        <div style={sx('margin-bottom:16px;max-width:74ch')}>
          <h2 style={sx("margin:0;font:600 18px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>{heading.h}</h2>
          <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-3)')}>{heading.p}</p>
        </div>

        {at === 1 && (
          propsLoading && supportedProps.length === 0 ? (
            <p style={sx('margin:0;font-size:12.5px;color:var(--ink-3)')}>Loading venues…</p>
          ) : (
            <AddAccountForm
              accessToken={accessToken}
              supportedProps={supportedProps}
              onCreated={afterCreate}
              onCancel={onCancel}
              toast={toast}
              presetSlug={presetSlug}
              /* The key belongs to stage 2. Collecting it here too made stage 2
                 a no-op and put two different instruction lists on screen. */
              skipKey
            />
          )
        )}

        {at === 2 && <ConnectKeyFlow embedded onConnected={() => setAt(3)} />}

        {at === 3 && <AlertsSettings embedded />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* The footer is the wizard's, so every stage ends the same way and the
          actions stay put instead of moving with the content above them. */}
      {at > 1 && (
        <footer style={sx('flex:none;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:13px 20px;border-top:1px solid var(--line);background:var(--surface-2)')}>
          <button type="button" onClick={() => setAt(at - 1)} style={sx('padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600;cursor:pointer')}>
            Back
          </button>
          <span style={{ flex: 1 }} />
          {at === 2 && (
            /* Leaving without a key is a real choice — they may not have the
               venue open. Named for what it costs rather than "Skip". */
            <button type="button" onClick={() => setAt(3)} style={sx('padding:9px 13px;border:0;background:none;color:var(--ink-3);font-size:12.5px;font-weight:600;text-decoration:underline;cursor:pointer')}>
              I&apos;ll connect the key later
            </button>
          )}
          {at === 3 && (
            <button type="button" onClick={onDone} style={sx('padding:10px 16px;border:1px solid var(--ink);border-radius:10px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700;cursor:pointer')}>
              Done
            </button>
          )}
        </footer>
      )}
    </section>
  );
}
