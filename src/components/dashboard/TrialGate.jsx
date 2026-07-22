import { Link } from 'react-router-dom';
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
    <div
      className="mb-4 flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: 'rgba(0,212,170,0.28)',
        background: 'linear-gradient(135deg, rgba(0,212,170,0.10), rgba(0,212,170,0.045))',
      }}
    >
      <div className="flex items-start gap-2.5 sm:items-center">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(0,212,170,0.15)' }}>
          <svg className="h-4 w-4" style={{ color: 'var(--accent, #00d4aa)' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </span>
        <p className="text-sm" style={{ color: 'var(--dash-text-primary)' }}>
          <span className="font-bold">Free trial — everything unlocked.</span>{' '}
          <span style={{ color: 'var(--dash-text-secondary)' }}>{left}. Upgrade any time to keep full access.</span>
        </p>
      </div>
      <Link
        to="/pricing"
        className="block w-full shrink-0 rounded-lg px-3.5 py-2 text-center text-xs font-bold transition-transform hover:scale-[1.02] sm:w-auto sm:py-1.5"
        style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
      >
        Upgrade
      </Link>
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
        You had 30 days of full access. To keep your guardrails running and configure your rules, upgrade to a paid plan.
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
