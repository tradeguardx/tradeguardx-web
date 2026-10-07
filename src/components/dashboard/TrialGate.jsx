import { Link } from 'react-router-dom';
import { sx } from './shell/sx';
import { useAuth } from '../../context/AuthContext';

/** "14 Oct" — short, unambiguous, and the same shape everywhere. */
function fmtDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * The way back for anyone who never finished paying.
 *
 * Shown on every dashboard page while access is `none` — which now covers two
 * people: someone who has just signed up, and someone who opened checkout and
 * did not complete it (abandoned the page, or a mandate the bank refused).
 *
 * The second case is the one this exists for. Their account is set up, their
 * key is connected, and nothing is protecting them. Without a standing prompt
 * they have no route back except remembering a URL — which is exactly how a
 * user ended up trading on a live account for six weeks with no enforcement
 * and nothing anywhere asking him to fix it.
 */
export function SetupBanner() {
  const { user } = useAuth();
  if (!user?.needsMandate) return null;

  return (
    <div className="guard-band" style={sx('align-items:center;gap:14px;padding:12px 15px;margin-bottom:16px;border:1px solid var(--amber-line,rgba(245,158,11,.3));border-radius:14px;background:var(--amber-tint,rgba(245,158,11,.1))')}>
      <div className="guard-band__main" style={sx('flex:1;min-width:0;align-items:center;gap:12px')}>
        <span style={sx('flex:none;width:28px;height:28px;border-radius:8px;background:var(--surface);display:grid;place-items:center;color:#f59e0b')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
        </span>
        <p style={sx('flex:1;min-width:0;margin:0;font-size:13px;line-height:1.5;color:var(--ink-2)')}>
          <strong style={sx('color:var(--ink);font-weight:700')}>Your guard is off.</strong>{' '}
          Nothing is watching this account yet. Finish setup to switch it on — 7 days free, nothing charged today.
        </p>
      </div>
      <Link className="guard-band__cta" to="/dashboard/activate" style={sx('flex:none;padding:8px 13px;border:1px solid var(--mint-solid);border-radius:9px;background:var(--mint-solid);color:#05221c;font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap')}>Finish setup</Link>
    </div>
  );
}

/**
 * Thin banner shown while the free full-access trial is running.
 * Renders nothing for paid, free, or expired users.
 *
 * TWO TRIALS, TWO SENTENCES. A mandate-backed trial converts — autopay is
 * attached and there is a date on which we take money, which is the single
 * thing that person needs from this banner and the thing they will be angry
 * about if they only find out afterwards. A no-card trial simply stops. The
 * copy is written so neither one can be mistaken for the other.
 */
export function TrialBanner() {
  const { user } = useAuth();
  if (!user?.isTrial) return null;

  const days = user.trialDaysLeft;
  const left =
    days == null ? 'Your free trial is active' : days <= 0 ? 'Your trial ends today' : `${days} day${days === 1 ? '' : 's'} left`;
  const chargeOn = fmtDay(user.trialEndsAt);

  /*
   * Cancelled, but the window they were promised is still running. They keep
   * access to the end of it and are never charged — and the banner must stop
   * naming a payment date, because the whole point of what they just did was
   * that there will not be one.
   */
  if (user.subscriptionCanceled) {
    return (
      <div className="guard-band" style={sx('align-items:center;gap:14px;padding:12px 15px;margin-bottom:16px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2,rgba(255,255,255,.03))')}>
        <div className="guard-band__main" style={sx('flex:1;min-width:0;align-items:center;gap:12px')}>
          <p style={sx('flex:1;min-width:0;margin:0;font-size:13px;line-height:1.5;color:var(--ink-2)')}>
            <strong style={sx('color:var(--ink);font-weight:700')}>Cancelled.</strong>{' '}
            {chargeOn ? <>Your access runs until <strong style={sx('color:var(--ink);font-weight:700')}>{chargeOn}</strong>.</> : <>Your access runs to the end of the trial.</>}{' '}
            You won&rsquo;t be charged.
          </p>
        </div>
        <Link className="guard-band__cta" to="/dashboard/account/billing" style={sx('flex:none;padding:8px 13px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap')}>Resubscribe</Link>
      </div>
    );
  }

  if (user.trialAutoRenews) {
    return (
      <div className="guard-band" style={sx('align-items:center;gap:14px;padding:12px 15px;margin-bottom:16px;border:1px solid var(--mint-line);border-radius:14px;background:var(--mint-tint)')}>
        <div className="guard-band__main" style={sx('flex:1;min-width:0;align-items:center;gap:12px')}>
          <span style={sx('flex:none;width:28px;height:28px;border-radius:8px;background:var(--surface);display:grid;place-items:center;color:var(--mint)')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3L4 14h7l-1 7 9-11h-7z" /></svg>
          </span>
          <p style={sx('flex:1;min-width:0;margin:0;font-size:13px;line-height:1.5;color:var(--ink-2)')}>
            <strong style={sx('color:var(--ink);font-weight:700')}>Free trial — everything unlocked.</strong>{' '}
            {left}.{' '}
            {chargeOn
              ? <>Your first payment is on <strong style={sx('color:var(--ink);font-weight:700')}>{chargeOn}</strong>. Cancel before then and you won&rsquo;t be charged.</>
              : <>Cancel before it ends and you won&rsquo;t be charged.</>}
          </p>
        </div>
        <Link className="guard-band__cta" to="/dashboard/account/billing" style={sx('flex:none;padding:8px 13px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap')}>Manage</Link>
      </div>
    );
  }

  return (
    /* Same shape as the guard band, and for the same reason: data-tgx-stack
       gives every child width:100% on a phone, which stretched this 28px badge
       across the banner and turned Upgrade into a full-bleed button. */
    <div className="guard-band" style={sx('align-items:center;gap:14px;padding:12px 15px;margin-bottom:16px;border:1px solid var(--mint-line);border-radius:14px;background:var(--mint-tint)')}>
      <div className="guard-band__main" style={sx('flex:1;min-width:0;align-items:center;gap:12px')}>
        <span style={sx('flex:none;width:28px;height:28px;border-radius:8px;background:var(--surface);display:grid;place-items:center;color:var(--mint)')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3L4 14h7l-1 7 9-11h-7z" /></svg>
        </span>
        <p style={sx('flex:1;min-width:0;margin:0;font-size:13px;line-height:1.5;color:var(--ink-2)')}>
          <strong style={sx('color:var(--ink);font-weight:700')}>Free trial — everything unlocked.</strong>{' '}
          {left}.{' '}
          {/* The carried-days rule makes this honest: setting up autopay now
              keeps the days they have left, so there is nothing to lose by
              doing it today and nothing to gain by waiting. */}
          Set up payment to keep access when it ends — you keep the days you have left.
        </p>
      </div>
      <Link className="guard-band__cta" to="/pricing" style={sx('flex:none;padding:8px 13px;border:1px solid var(--mint-solid);border-radius:9px;background:var(--mint-solid);color:#05221c;font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap')}>Set up</Link>
    </div>
  );
}

/**
 * Full-content wall shown when there is no entitlement. Rendered in place of
 * the page content (sidebar + Billing stay reachable).
 *
 * TWO DIFFERENT PEOPLE SEE THIS. One had a trial and it ran out. The other
 * has never started — they signed up and have not set up payment yet. Telling
 * the second "your free trial has ended" is both false and discouraging: it
 * reads as a door closing on someone who has not walked through it, and the
 * offer they are actually being made — a free week — gets hidden behind a
 * sentence about something they lost.
 */
export function UpgradeWall() {
  const { user } = useAuth();

  if (user?.needsMandate) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)' }}>
          <svg className="h-7 w-7" style={{ color: 'var(--accent, #00d4aa)' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7z" /></svg>
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold" style={{ color: 'var(--dash-text-primary)' }}>Start your 7 days free</h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
          Set up payment to switch your guardrails on. You won&rsquo;t be charged for seven days, we&rsquo;ll tell you the exact date your first payment lands, and you can cancel any time before it.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/pricing"
            className="rounded-xl px-5 py-2.5 text-sm font-bold transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
          >
            Start free trial
          </Link>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--dash-text-faint)' }}>
          Cancel in one click from Billing. Nothing is charged until day 8.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
        <svg className="h-7 w-7" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </span>
      <h2 className="mt-5 font-display text-2xl font-bold" style={{ color: 'var(--dash-text-primary)' }}>Your free trial has ended</h2>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
        You had full access to every feature. To keep your guardrails running and configure your rules, upgrade to a paid plan.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/pricing"
          className="rounded-xl px-5 py-2.5 text-sm font-bold transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
        >
          See plans &amp; upgrade
        </Link>
        <Link
          to="/dashboard/account/billing"
          className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors"
          style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
        >
          Manage billing
        </Link>
      </div>
    </div>
  );
}
