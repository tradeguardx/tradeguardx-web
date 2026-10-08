import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createCheckoutSession } from '../../api/paymentsApi';
import { getPricingPlans } from '../../api/pricingApi';
import { trialDaysOnOffer, firstChargeDate } from '../../lib/trialOffer';

/**
 * The ask: what happens without a guard, what it costs, and the three ways to
 * pay for it.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * IT ARGUES FROM THE PROBLEM, NOT FROM THEIR ACCOUNT.
 *
 * It used to lead with their balance and a counterfactual from their own
 * worst day. Both read well when the data was there and were absent when it
 * was not — the balance is written by per-venue code and every Shark account
 * on production has none, and the counterfactual needs history that has not
 * imported yet for exactly the person being asked. An argument that is
 * missing for some users is not an argument; it is a gap they notice.
 *
 * What is always true needs no data: a day that has already gone wrong costs
 * more than this does, and the trades that do the damage are the ones taken
 * after it went wrong. That holds for every trader on every venue on their
 * first day, which is who this screen is for.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * A component rather than a page because it renders in two places — the
 * /dashboard/activate route and the billing step of the setup flow — and a
 * second simplified copy of the screen that asks for money is the kind that
 * drifts and starts quoting a price we no longer charge.
 */

const INTERVAL_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
const INTERVAL_EVERY = { monthly: 'every month', quarterly: 'every 3 months', yearly: 'every year' };

function inr(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function ActivateGuardCard({ embedded = false, onLater }) {
  const { user, session, refetchSubscription } = useAuth();
  const [plans, setPlans] = useState([]);
  const [interval, setInterval] = useState('monthly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getPricingPlans().then(setPlans).catch(() => setPlans([])); }, []);

  const freeDays = trialDaysOnOffer(user);
  const chargeOn = useMemo(
    () => firstChargeDate(freeDays)?.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) ?? null,
    [freeDays],
  );

  const pro = plans.find((p) => String(p.slug || '').toLowerCase() === 'pro');
  const options = useMemo(() => {
    const rows = pro?.intervals ?? [];
    return ['monthly', 'quarterly', 'yearly']
      .map((k) => rows.find((r) => r.interval === k))
      .filter((r) => r && typeof r.price === 'number');
  }, [pro]);

  const chosen = options.find((o) => o.interval === interval) ?? options[0] ?? null;

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await createCheckoutSession({
        accessToken: session?.access_token,
        planSlug: 'pro',
        interval: chosen?.interval ?? 'monthly',
      });
      const url = res?.checkoutUrl;
      if (!url) throw new Error('Could not open checkout. Please try again.');
      window.location.href = url;
    } catch (e) {
      setError(e?.message || 'Could not open checkout. Please try again.');
      setBusy(false);
    }
  };

  const inner = (
    <>
      {!embedded && (
        <>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--accent, #00d4aa)' }}>
            Last step
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-[28px]" style={{ color: 'var(--dash-text-primary)' }}>
            Switch on your guard
          </h1>
        </>
      )}

      {/*
        * The argument. Not "here are the features" and not a projection of
        * their account — the mechanism by which trading accounts actually
        * die, which every trader recognises because they have lived it.
        */}
      <div
        className={embedded ? 'rounded-xl border p-4' : 'mt-5 rounded-xl border p-4'}
        style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)' }}
      >
        <p className="text-[14px] font-bold" style={{ color: 'var(--dash-text-primary)' }}>
          Accounts are not lost to one bad trade.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
          They are lost to the trades taken after it — the ones that go on once the day has already gone wrong.
          The guard runs on our servers: at your limit it cancels your orders, closes your positions and locks you
          out for the rest of the day, whether or not you are at the screen.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
          A month of this costs less than one stop-loss you did not take.
        </p>
      </div>

      {/* All three, because the cheapest per month is the longest commitment
          and hiding that is how people feel sold to later. */}
      {options.length > 0 && (
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {options.map((o) => {
            const on = chosen?.interval === o.interval;
            return (
              <button
                key={o.interval}
                type="button"
                onClick={() => setInterval(o.interval)}
                aria-pressed={on}
                className="rounded-xl border p-3 text-left transition-colors"
                style={{
                  borderColor: on ? 'var(--accent, #00d4aa)' : 'var(--dash-border)',
                  backgroundColor: on ? 'rgba(0,212,170,0.08)' : 'var(--dash-bg-input)',
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--dash-text-secondary)' }}>
                    {INTERVAL_LABEL[o.interval]}
                  </span>
                  {o.savingsPct > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: 'rgba(0,212,170,0.16)', color: 'var(--accent, #00d4aa)' }}>
                      save {Math.round(o.savingsPct)}%
                    </span>
                  )}
                </span>
                <span className="mt-1 block font-display text-[17px] font-bold" style={{ color: 'var(--dash-text-primary)' }}>
                  {inr(o.price)}
                </span>
                <span className="mt-0.5 block text-[11.5px]" style={{ color: 'var(--dash-text-faint)' }}>
                  {o.interval === 'monthly' ? 'per month' : `${inr(o.perMonth)}/mo · billed ${o.interval}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <p className="font-display text-lg font-bold" style={{ color: 'var(--dash-text-primary)' }}>
          {freeDays > 0
            ? <>₹0 today{chosen ? ` · ${inr(chosen.price)} on ${chargeOn}` : ''}</>
            : <>{chosen ? inr(chosen.price) : 'Pro'} · billed {chosen?.interval ?? 'monthly'}</>}
        </p>
        {freeDays > 0 && (
          <p className="mt-1 text-[13px]" style={{ color: 'var(--dash-text-secondary)' }}>
            Cancel any time before {chargeOn} and you pay nothing. After that,{' '}
            {INTERVAL_EVERY[chosen?.interval ?? 'monthly']} until you cancel.
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

      {/* The highest-abandonment moment in Indian checkout: the UPI app opens
          asking to approve a mandate for the full amount, and it looks exactly
          like a charge. Saying so first is worth more than anything else here. */}
      <p className="mt-3 text-center text-[11.5px] leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
        Your UPI app will ask you to approve an autopay mandate. Nothing is taken today.
      </p>

      {!embedded && (
        <div className="mt-5 flex items-center justify-center gap-4 text-[12px]">
          <button type="button" onClick={() => onLater?.()} style={{ color: 'var(--dash-text-secondary)' }}>
            I&rsquo;ll do this later
          </button>
          <span style={{ color: 'var(--dash-border)' }}>·</span>
          <button type="button" onClick={() => refetchSubscription?.()} style={{ color: 'var(--dash-text-secondary)' }}>
            Already paid? Refresh
          </button>
        </div>
      )}
    </>
  );

  if (embedded) return <div>{inner}</div>;

  return (
    <div className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
      {inner}
    </div>
  );
}
