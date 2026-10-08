import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { createCheckoutSession } from '../../api/paymentsApi';
import { getPricingPlans } from '../../api/pricingApi';
import { trialDaysOnOffer, firstChargeDate } from '../../lib/trialOffer';
import { brokerLabel } from '../../lib/labels';
import { fmtMoney } from '../../lib/session';
import { fetchUnifiedTrades } from '../../api/tradesApi';
import { useLiveAccount } from '../../hooks/useLiveAccount';
import { worstDayOf } from '../../lib/worstDay';

/**
 * The ask itself: their balance, their limit in rupees, the date, the amount.
 *
 * A component rather than a page because it is rendered in two places — the
 * standalone /dashboard/activate route and stage 3 of the add-venue wizard —
 * and the wizard's stated rule is that its stages are the REAL screens, not
 * reduced copies. A second, simplified version of the page that asks for
 * money is exactly the kind that drifts from the real one within a release
 * and starts quoting a price we no longer charge.
 */

const DEFAULT_LIMIT_PCT = 0.02;

/* The PLAN price, which really is in rupees. */
function inr(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/*
 * THE BALANCE IS IN THE ACCOUNT'S OWN CURRENCY, NOT RUPEES.
 *
 * Delta and CoinDCX settle in USD and USDT; a ₹ in front of 35.37 would tell
 * someone with $35 that they hold thirty-five rupees. The plan price beside
 * it is genuinely ₹1,299, so the two figures on this card are in different
 * currencies and both have to say which.
 *
 * Null unless it is a real positive number, so the card falls back to the
 * general promise rather than printing a zero it cannot stand behind.
 */
function money(n, currency) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null;
  return fmtMoney(n, currency || 'USD', { decimals: n < 100 ? 2 : 0 });
}

export default function ActivateGuardCard({ embedded = false, onLater }) {
  const { user, session, refetchSubscription } = useAuth();
  const { selectedAccount } = useTradingAccounts();
  const live = useLiveAccount({
    accessToken: session?.access_token,
    tradingAccountId: selectedAccount?.id ?? null,
    initial: selectedAccount,
  });
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getPricingPlans().then(setPlans).catch(() => setPlans([])); }, []);

  /*
   * Their own worst day, if we have enough history to know it.
   *
   * This arrives late or not at all — the import starts when the key is
   * verified and runs for minutes — so nothing on this card waits for it and
   * nothing says it is coming. If it lands, the strongest sentence on the
   * page appears; if it does not, the page was already complete without it.
   */
  const [trades, setTrades] = useState(null);
  useEffect(() => {
    const token = session?.access_token;
    const id = selectedAccount?.id;
    if (!token || !id) return undefined;
    const ac = new AbortController();
    fetchUnifiedTrades({ accessToken: token, tradingAccountId: id, limit: 200, signal: ac.signal })
      .then(setTrades)
      .catch(() => {
        /* No history yet is the normal case straight after connecting. */
      });
    return () => ac.abort();
  }, [session?.access_token, selectedAccount?.id]);

  const freeDays = trialDaysOnOffer(user);
  const chargeOn = useMemo(
    () => firstChargeDate(freeDays)?.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) ?? null,
    [freeDays],
  );

  const pro = plans.find((p) => String(p.slug || '').toLowerCase() === 'pro');
  const monthly = pro?.intervals?.find((i) => i.interval === 'monthly');
  const priceLabel = typeof monthly?.price === 'number' ? inr(monthly.price) : null;

  /*
   * EQUITY, FROM WHICHEVER SOURCE HAS IT — NEVER ONE VENUE'S PLUMBING.
   *
   * It read `accountSize`, which is only set when someone types it in for a
   * funded prop account, so a flow-created account showed "₹0" — worse than
   * silence, because it looks like we checked and found nothing.
   *
   * The obvious fix was the balance `connectExchange` seeds at verification,
   * and that is still first. But it is written by per-venue verify code, and
   * every Shark account on production has it null while Delta's are all
   * populated. One venue's parser should not decide whether the product can
   * state a limit, so the live equity the engine maintains — which is fed the
   * same way for every venue — is checked too.
   *
   * First usable number wins; nothing is printed if none of them is real.
   */
  const equity = [
    live?.currentEquity,
    live?.dailyStartingEquity,
    selectedAccount?.currentBalance,
    selectedAccount?.startingBalance,
    selectedAccount?.accountSize,
  ]
    .map(Number)
    .find((n) => Number.isFinite(n) && n > 0);
  const currency = selectedAccount?.accountCurrency || 'USD';
  const equityLabel = money(equity, currency);
  const limitLabel = money(equity * DEFAULT_LIMIT_PCT, currency);
  const venue = selectedAccount?.name || brokerLabel(selectedAccount?.propFirmSlug) || 'your account';

  const worst = useMemo(
    () => worstDayOf(trades ?? [], { limit: equity * DEFAULT_LIMIT_PCT, timeZone: selectedAccount?.timezone }),
    [trades, equity, selectedAccount?.timezone],
  );

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

      {/* Their own money, their own limit. Everything else here is secondary. */}
      {equityLabel ? (
        <div
          className={embedded ? 'rounded-xl border p-4' : 'mt-5 rounded-xl border p-4'}
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
        <p className={embedded ? 'text-[13px] leading-relaxed' : 'mt-4 text-[13px] leading-relaxed'} style={{ color: 'var(--dash-text-secondary)' }}>
          Your rules run on our servers and act on your account even when you are not at the screen — orders cancelled,
          positions closed, locked out for the day.
        </p>
      )}

      {/* The argument, when their own history can make it. Below the balance
          because the limit has to be named before it means anything. */}
      {worst && limitLabel && (
        <div
          className="mt-3 rounded-xl border p-4"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--tax-neg-soft)' }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
            On <strong style={{ color: 'var(--dash-text-primary)' }}>{new Date(worst.day).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</strong>{' '}
            you lost <strong style={{ color: 'var(--tax-neg)' }}>{money(worst.loss, currency)}</strong> across {worst.tradeCount} trades.
            With this limit on, the guard would have stopped you after{' '}
            {worst.stoppedAfter === 1 ? 'the first' : `${worst.stoppedAfter}`}
            {worst.stoppedAfter === 1 ? ' trade' : ' trades'}
            {worst.saved > 0 ? <> — the rest of that day cost <strong style={{ color: 'var(--tax-neg)' }}>{money(worst.saved, currency)}</strong>.</> : '.'}
          </p>
        </div>
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
    <div
      className="rounded-2xl border p-6 sm:p-8"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
    >
      {inner}
    </div>
  );
}
