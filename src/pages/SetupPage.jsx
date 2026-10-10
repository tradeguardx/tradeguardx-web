import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGuard } from '../context/GuardContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { fetchSupportedProps } from '../api/tradingAccountsApi';
import { AddAccountForm } from './TradingAccountsPage';
import { ConnectKeyFlow } from './ConnectKeyPage';
import BillingStep from '../components/dashboard/billing/BillingStep';
import VenuePicker from '../components/dashboard/VenuePicker';
import VenueMark from '../components/dashboard/VenueMark';
import { venueFor } from '../lib/venues';
import { sx } from '../components/dashboard/shell/sx';
import { useToast } from '../components/common/ToastProvider';
import { UNPROTECTED_STATES } from '../lib/lifecycle';

/**
 * Setup, as a page.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY A PAGE AND NOT A DIALOG.
 *
 * This was a modal over the dashboard. Six steps, one of which asks for an
 * API key and another for a payment mandate, is not an interruption to what
 * someone was doing — it IS what they are doing, and for a new account it is
 * the whole product until it is finished. A card floating over a blurred page
 * reads as dismissible, which is the wrong posture for the only ten minutes
 * that decide whether this account is ever protected.
 *
 * It also gives the steps room. Six numbers across the top of a 880px dialog
 * is a cramped progress bar; across a page it is a map.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * THE STAGES ARE THE REAL SCREENS. AddAccountForm, ConnectKeyFlow,
 * BillingStep and ConnectKeyFlow are the same components
 * their standalone routes render. A setup flow with its own simplified copies
 * is a second implementation of the most important steps in the product, and
 * it drifts from the real ones within a release.
 *
 * RESUMABLE. Steps are ticked from real state, not from how far the user got
 * in this sitting, so leaving for Dodo's checkout and coming back lands on
 * what is still undone rather than at the beginning.
 */

/*
 * FOUR STEPS, AND THEY ARE THE FOUR THAT CANNOT HAPPEN LATER.
 *
 * Rules and alerts used to be steps five and six here. They are genuinely
 * editable afterwards — rules are meant to be revisited, and alerts are the
 * one part of the product that is optional by design — so putting them in the
 * flow made onboarding 50% longer with the two steps that lose nothing by
 * waiting. Overview carries them instead: `gapsOf` reports both, and "what to
 * do next" names whichever is outstanding.
 *
 * What is left is the four that are load-bearing. Without an exchange, an
 * account, a key and a subscription the engine arms nothing at all, so a user
 * who stops short of any of them is unprotected and does not know it.
 */
const STEPS = [
  { key: 'venue', label: 'Choose exchange', h: 'Which exchange do you trade on?', p: 'This is the account the guard will watch. You can add others later.' },
  { key: 'name', label: 'Name account', h: 'Name the account', p: 'Just a label so you can tell this account from the others. The key comes next.' },
  { key: 'key', label: 'Connect key', h: 'Connect the key', p: 'This is the step that makes your rules real. Until it is done the account is listed here but nothing is watching it.' },
  { key: 'billing', label: 'Set up billing', h: 'Set up billing', p: 'Free for 7 days and nothing is charged today. The guard only runs once this is done.' },
];

function Rail({ at, done }) {
  return (
    <ol className="wiz-rail" style={sx('display:flex;align-items:center;gap:0;margin:0 0 26px;padding:0;list-style:none;flex-wrap:wrap;row-gap:10px')}>
      {STEPS.map((s, i) => {
        const isDone = done[i];
        const here = at === i;
        return (
          <li key={s.key} style={sx('display:flex;align-items:center;gap:9px;min-width:0')}>
            <span
              aria-current={here ? 'step' : undefined}
              style={sx(
                "flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:8px;font:700 11px/1 'JetBrains Mono',monospace",
                isDone
                  ? { background: 'var(--mint-solid)', color: 'var(--surface)' }
                  : here
                    ? { background: 'var(--ink)', color: 'var(--surface)' }
                    : { background: 'var(--surface-3)', color: 'var(--ink-faint)' },
              )}
            >
              {isDone ? '✓' : i + 1}
            </span>
            <span className="wiz-rail__label" style={sx('font-size:12.5px;font-weight:600;white-space:nowrap', here ? {} : { color: 'var(--ink-3)' })}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className="wiz-rail__bar" style={sx('flex:none;width:22px;height:1px;margin:0 11px', { background: isDone ? 'var(--mint-solid)' : 'var(--line)' })} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function SetupPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { session, user } = useAuth();
  const guard = useGuard();
  const { accounts, accountsLoading, selectedAccount, refreshTradingAccounts, setSelectedTradingAccountId } = useTradingAccounts();

  const accessToken = session?.access_token;
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [slug, setSlug] = useState(params.get('venue') || '');
  /*
   * ADDING ANOTHER ACCOUNT IS NOT RESUMING THE LAST ONE.
   *
   * The resume rule below lands on the first undone step, which is right for
   * someone coming back to finish — and wrong for "Add another account". A
   * user with one half-finished account pressed "Choose an exchange" and was
   * dropped onto Connect key for the account they already had, with no way to
   * create a second one. `?new=1` says which of the two this is.
   */
  const fresh = params.get('new') === '1';
  /* Whether an account was created in THIS pass, so a fresh run does not tick
     its first two steps off the back of accounts that already existed. */
  const [createdHere, setCreatedHere] = useState(false);
  /* Null until they navigate. The step shown is derived from what is actually
     done, and this only overrides it once they move themselves — see `at`. */
  const [pickedStep, setPickedStep] = useState(() => {
    if (params.get('venue')) return 1;
    return fresh ? 0 : null;
  });

  useEffect(() => {
    let alive = true;
    fetchSupportedProps({ accessToken })
      .then((r) => { if (alive) setVenues(r ?? []); })
      .catch(() => { if (alive) setVenues([]); })
      .finally(() => { if (alive) setVenuesLoading(false); });
    return () => { alive = false; };
  }, [accessToken]);

  /*
   * Ticked from real state. The alternative — remembering how far they got —
   * survives neither the redirect to Dodo's checkout nor a reload, and both
   * happen in the middle of this flow.
   */
  const g = guard.selected;
  /*
   * HAS A PAYMENT METHOD — NOT "HAS ACCESS".
   *
   * This read `isTrial || access === 'active'`, which ticks the billing step
   * for anyone on ANY trial. The users who signed up under the old no-card
   * trial are on one with nothing attached, so they saw billing already
   * ticked and `afterKey` skipped the step entirely — the flow never asked
   * them, and on the day the trial lapses the guard simply stops.
   *
   * A cancelled mandate still counts: a method is attached, they just told us
   * to stop using it, and re-running setup is not where that is fixed.
   */
  const hasMandate =
    user?.access === 'active' || Boolean(user?.trialAutoRenews) || Boolean(user?.subscriptionCanceled);
  /*
   * NO ACTIVE PLAN: THE NEW ACCOUNT INHERITS IT (lifecycle spec, pf te pe pg
   * lf). Billing is not this account's step — the plan is the user's, and
   * Plan & billing is where it is restarted — so the flow ends at the key.
   * Read from the server's plan state, not the guard's case: while the new
   * account has no key yet the guard reads "setup" for it.
   */
  const planOff = UNPROTECTED_STATES.includes(user?.planState);
  const toast = useToast();
  const hasAccount = Boolean(selectedAccount) || (Array.isArray(accounts) && accounts.length > 0);
  const done = useMemo(() => {
    const noGap = (k) => Boolean(g?.gaps) && !g.gaps.some((x) => x.key === k);
    /* On a fresh run the accounts they already have say nothing about the one
       they are creating now, so only an account made in this pass counts. */
    const account = fresh ? createdHere : hasAccount;
    return [
      Boolean(slug) || account,
      account,
      account && noGap('key'),
      hasMandate || planOff,
    ];
  }, [slug, hasAccount, hasMandate, planOff, fresh, createdHere, g]);

  /*
   * RESUME WHERE THEY STOPPED.
   *
   * Someone who created an account and came back was shown step one again —
   * two ticked steps above a question they had already answered, offering the
   * exchange they had already chosen. The first undone step is the only
   * sensible place to land.
   *
   * Derived rather than stored, so there is nothing to keep in sync: on the
   * first render nothing has loaded and everything reads undone, and the
   * moment accounts and guard state arrive this lands on the right step by
   * itself. `pickedStep` takes over as soon as they move, so Back goes back
   * instead of being yanked forward again.
   */
  const firstUndone = done.indexOf(false);
  const at = pickedStep ?? Math.max(0, firstUndone);
  const step = STEPS[at];

  const go = (i) => {
    setPickedStep(i);
    /* Each step starts at the top. Guarded because jsdom has no scrollTo and
       a setup flow should not be the thing that breaks a test run. */
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* not implemented */ }
    }
  };

  const afterCreate = async (created) => {
    await refreshTradingAccounts();
    if (created?.id) setSelectedTradingAccountId(created.id);
    setCreatedHere(true);
    go(2);
  };

  /* Someone who already has a method attached has nothing to buy, so billing
     is skipped rather than shown and dismissed. With billing last, that means
     they are done. A no-card trialist is NOT in that group. */
  const afterKey = () => {
    if (planOff) {
      toast.info('Account connected. Your guard is off until your plan is active.');
      return finish();
    }
    return hasMandate ? finish() : go(3);
  };

  const finish = async () => {
    await refreshTradingAccounts();
    await guard.refresh?.();
    navigate('/dashboard/overview');
  };

  /*
   * Once the guard can actually act, forget that they ever said "not now".
   * The flag exists to stop Overview looping someone who declined; a user who
   * has since finished has not declined anything, and if they later
   * disconnect the key the redirect should come back on its own.
   */
  useEffect(() => {
    if (!done.every(Boolean)) return;
    try { window.localStorage?.removeItem('tgx_setup_dismissed'); } catch { /* blocked storage */ }
  }, [done]);

  /* Everything already done — they followed a stale link or finished in
     another tab. There is nothing to set up, so do not pretend otherwise. */
  if (!accountsLoading && guard.loaded !== false && done.every(Boolean)) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  const venue = slug ? venueFor(slug) : null;

  /*
   * Step 4 owns its whole screen — band, stepper, headline and plan panel —
   * so the page chrome below would be a second stepper above its own and a
   * second heading above its headline. The reference is explicit that this
   * step replaces them.
   */
  if (at === 3) {
    return <BillingStep onStarted={() => setPickedStep(3)} />;
  }

  return (
    <div style={sx('max-width:1040px;margin:0 auto;padding-bottom:56px')}>
      <header style={sx('margin-bottom:20px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Set up your guard</h1>
        <p style={sx('margin:7px 0 0;font-size:13.5px;color:var(--ink-3)')}>
          Four steps. Until they are done nothing is watching your account. Rules and alerts come after.
        </p>
        {venue && (
          <div style={sx('display:flex;align-items:center;gap:10px;margin-top:16px')}>
            <VenueMark slug={slug} name={venue.name} size={30} radius={9} />
            <span style={sx('font-size:15px;font-weight:600;letter-spacing:-.01em')}>{venue.longName ?? venue.name}</span>
          </div>
        )}
      </header>

      <Rail at={at} done={done} />

      <div style={sx('margin-bottom:18px;max-width:74ch')}>
        <h2 style={sx("margin:0;font:600 23px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.026em")}>{step.h}</h2>
        <p style={sx('margin:7px 0 0;font-size:13.5px;line-height:1.6;color:var(--ink-3)')}>{step.p}</p>
      </div>

      {at === 0 && (
        <VenuePicker
          venues={venues}
          loading={venuesLoading}
          onPick={(picked) => {
            setSlug(picked);
            setParams({ venue: picked }, { replace: true });
            go(1);
          }}
        />
      )}

      {at === 1 && (
        <AddAccountForm
          accessToken={accessToken}
          supportedProps={venues}
          onCreated={afterCreate}
          onCancel={() => go(0)}
          toast={{ success: () => {}, error: () => {} }}
          presetSlug={slug}
          /* The key is step three's job. Collecting it here too left that step
             with nothing to do and put two instruction lists on screen. */
          skipKey
        />
      )}

      {at === 2 && <ConnectKeyFlow embedded onConnected={afterKey} />}

      {at > 0 && (
        <footer style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:30px;padding-top:18px;border-top:1px solid var(--line)')}>
          <button type="button" onClick={() => go(at - 1)} style={sx('padding:9px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600;cursor:pointer')}>
            Back
          </button>
          <span style={{ flex: 1 }} />
          {/* Every skip is named for what it costs, never "Skip" — leaving any
              of these undone means nothing is enforced, and the user should
              read that in the button they are about to press. */}
          {at === 2 && (
            <button
              type="button"
              onClick={() => {
                try { window.localStorage?.setItem('tgx_setup_dismissed', '1'); } catch { /* blocked storage */ }
                afterKey();
              }}
              style={sx('padding:9px 13px;border:0;background:none;color:var(--ink-3);font-size:12.5px;font-weight:600;text-decoration:underline;cursor:pointer')}
            >
              I&apos;ll connect the key later
            </button>
          )}
          {at < STEPS.length - 1 ? (
            <button type="button" onClick={() => go(at + 1)} style={sx('padding:10px 16px;border:1px solid var(--ink);border-radius:10px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700;cursor:pointer')}>
              Next
            </button>
          ) : (
            <button type="button" onClick={finish} style={sx('padding:10px 16px;border:1px solid var(--ink);border-radius:10px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700;cursor:pointer')}>
              Done
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
