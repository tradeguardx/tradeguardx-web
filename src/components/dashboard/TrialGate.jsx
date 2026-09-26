import { Link } from 'react-router-dom';
import { sx } from './shell/sx';
import { useAuth } from '../../context/AuthContext';

/**
 * Thin banner shown while the free full-access trial is running.
 * Renders nothing for paid, free, or expired users.
 */
export function TrialBanner() {
  const { user } = useAuth();
  if (!user?.isTrial) return null;

  const days = user.trialDaysLeft;
  const left =
    days == null ? 'Your free trial is active' : days <= 0 ? 'Your trial ends today' : `${days} day${days === 1 ? '' : 's'} left`;

  return (
    /* Same shape as the guard band, and for the same reason: data-tgx-stack
       gives every child width:100% on a phone, which stretched this 28px badge
       across the banner and turned Upgrade into a full-bleed button. */
    <div className="guard-band" style={sx('display:flex;align-items:center;gap:14px;padding:12px 15px;margin-bottom:16px;border:1px solid var(--mint-line);border-radius:14px;background:var(--mint-tint)')}>
      <div className="guard-band__main" style={sx('flex:1;min-width:0;display:flex;align-items:center;gap:12px')}>
        <span style={sx('flex:none;width:28px;height:28px;border-radius:8px;background:var(--surface);display:grid;place-items:center;color:var(--mint)')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3L4 14h7l-1 7 9-11h-7z" /></svg>
        </span>
        <p style={sx('flex:1;min-width:0;margin:0;font-size:13px;line-height:1.5;color:var(--ink-2)')}>
          <strong style={sx('color:var(--ink);font-weight:700')}>Free trial — everything unlocked.</strong> {left}. Upgrade any time to keep full access.
        </p>
      </div>
      <Link className="guard-band__cta" to="/pricing" style={sx('flex:none;padding:8px 13px;border:1px solid var(--mint-solid);border-radius:9px;background:var(--mint-solid);color:#05221c;font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap')}>Upgrade</Link>
    </div>
  );
}

/**
 * Full-content upgrade wall shown when the trial has lapsed and there's no paid
 * plan. Rendered in place of the page content (sidebar + Billing stay reachable).
 */
export function UpgradeWall() {
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
