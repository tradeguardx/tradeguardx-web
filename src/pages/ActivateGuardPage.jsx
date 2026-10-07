import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { createCheckoutSession } from '../api/paymentsApi';
import { getPricingPlans } from '../api/pricingApi';
import { trialDaysOnOffer, firstChargeDate } from '../lib/trialOffer';

/**
 * The paywall, at the only place in the journey it belongs: straight after
 * the exchange key is connected, before the guard is armed.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY HERE AND NOT AT SIGNUP.
 *
 * This is the first moment we take on cost and liability. Everything before
 * it is a read-only key and some arithmetic. From here the risk engine opens
 * a live socket on this account, watches it tick by tick, and puts cancel and
 * close orders on their exchange with their credentials.
 *
 * It is also peak intent. Someone who has just handed over an API key has
 * already decided they want this; asking a stranger to authorise a recurring
 * mandate at signup, before they have seen a single number of their own, is
 * the same ask at a fraction of the willingness.
 *
 * And the moment after connect was DEAD SPACE — a confirmation alert and
 * nothing else. Putting the ask here adds no friction to the journey; it
 * fills a gap in it.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * The number on this page is their own account balance, not a feature list.
 * A 2% daily loss limit expressed in rupees against the equity they just
 * connected is the whole product stated in one line.
 */

const DEFAULT_LIMIT_PCT = 0.02;

function inr(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function ActivateGuardPage() {
  const navigate = useNavigate();
  const { user, session, refetchSubscription } = useAuth();
  const { selectedAccount } = useTradingAccounts();
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getPricingPlans().then(setPlans).catch(() => setPlans([])); }, []);

  /* Already entitled — they came back to this URL, or a webhook landed while
     they were reading. Nothing to sell; send them to the guard. */
  useEffect(() => {
    if (user?.planKnown && (user.isTrial || user.access === 'active')) {
      navigate('/dashboard/live', { replace: true });
    }
  }, [user?.planKnown, user?.isTrial, user?.access, navigate]);

  const freeDays = trialDaysOnOffer(user);
  const chargeOn = useMemo(
    () => firstChargeDate(freeDays)?.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) ?? null,
    [freeDays],
  );

  const pro = plans.find((p) => String(p.slug || '').toLowerCase() === 'pro');
  const monthly = pro?.intervals?.find((i) => i.interval === 'monthly');
  const priceLabel = typeof monthly?.price === 'number' ? inr(monthly.price) : null;

  const equity = Number(selectedAccount?.accountSize);
  const equityLabel = inr(equity);
  const limitLabel = inr(equity * DEFAULT_LIMIT_PCT);
  const venue = selectedAccount?.propFirmSlug || selectedAccount?.name || 'your account';

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await createCheckoutSession({
        accessToken: session?.access_token,
        planSlug: 'pro',
        interval: 'monthly',
      });
      const url = res?.checkoutUrl;
      if (!url) throw new Error('Could not open checkout. Please try again.');
      window.location.href = url;
    } catch (e) {
      setError(e?.message || 'Could not open checkout. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg py-6">
      <div
        className="rounded-2xl border p-6 sm:p-8"
        style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--accent, #00d4aa)' }}>
          Last step
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-[28px]" style={{ color: 'var(--dash-text-primary)' }}>
          Switch on your guard
        </h1>

        {/* Their own money, their own limit. Everything else on this page is
            secondary to these two numbers. */}
        {equityLabel ? (
          <div
            className="mt-5 rounded-xl border p-4"
            style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)' }}
          >
            <p className="text-[12px]" style={{ color: 'var(--dash-text-faint)' }}>{venue}</p>
            <p className="mt-0.5 font-display text-xl font-bold" style={{ color: 'var(--dash-text-primary)' }}>{equityLabel}</p>
            {limitLabel && (
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                A 2% daily loss limit on this account is <strong style={{ color: 'var(--dash-text-primary)' }}>{limitLabel}</strong>.
                Past that we cancel your orders, close your positions and lock you out for the rest of the day — from our
                servers, whether or not you are at the screen.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-[13px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
            Your rules run on our servers and act on your account even when you are not at the screen — orders cancelled,
            positions closed, locked out for the day.
          </p>
        )}

        <div className="mt-6">
          <p className="font-display text-lg font-bold" style={{ color: 'var(--dash-text-primary)' }}>
            {freeDays > 0 ? <>₹0 today{priceLabel ? ` · ${priceLabel} on ${chargeOn}` : ''}</> : <>{priceLabel ?? 'Pro'} · billed monthly</>}
          </p>
          {freeDays > 0 && (
            <p className="mt-1 text-[13px]" style={{ color: 'var(--dash-text-secondary)' }}>
              Cancel any time before {chargeOn} and you pay nothing.
            </p>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl px-3 py-2 text-[12.5px]" style={{ backgroundColor: 'var(--tax-neg-soft)', color: 'var(--tax-neg)' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="mt-5 w-full rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:scale-[1.01] disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
        >
          {busy ? 'Opening checkout…' : freeDays > 0 ? `Start ${freeDays} day${freeDays === 1 ? '' : 's'} free` : 'Subscribe'}
        </button>

        {/* The single highest-abandonment moment in Indian checkout: the UPI
            app opens asking to approve a mandate for the full amount, and it
            looks like a charge. Saying so first is worth more than anything
            else on this page. */}
        <p className="mt-3 text-center text-[11.5px] leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
          Your UPI app will ask you to approve an autopay mandate. Nothing is taken today.
        </p>

        <div className="mt-5 flex items-center justify-center gap-4 text-[12px]">
          <Link to="/dashboard/overview" style={{ color: 'var(--dash-text-secondary)' }}>I&rsquo;ll do this later</Link>
          <span style={{ color: 'var(--dash-border)' }}>·</span>
          <button type="button" onClick={() => refetchSubscription?.()} style={{ color: 'var(--dash-text-secondary)' }}>
            Already paid? Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
