import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { clearPendingCheckoutPlan } from '../lib/checkoutIntent';
import {
  openBillingPortal,
  updateSubscriptionPaymentMethod,
  createCheckoutSession,
  changeSubscriptionPlan,
  cancelSubscriptionPlanChange,
  cancelSubscription,
  resumeSubscription,
  fetchPendingPlanChange,
} from '../api/paymentsApi';
import { getPricingPlans } from '../api/pricingApi';
import { journalPeriodBadgeLabel, maxTradingAccountsForPlan } from '../lib/planLimits';
import { billingStateOf, daysUntil, gstInside, savingVsMonthly } from '../lib/billingState';
import { trackBilling } from '../lib/analytics';
import { sx } from '../components/dashboard/shell/sx';
import CelebrationOverlay from '../components/dashboard/CelebrationOverlay';
import { debitMayBeInFlight, MANDATE_NOTE, IN_FLIGHT_NOTE } from '../lib/mandateWindow';
import {
  BAR_COLOUR, BODY, CANCEL_COPY, ENDED_BODY, EVERY, NEXT_LABEL, PER, PLAN_NOTE, STATE_CHIP, STATE_SKIN,
} from './billing/billingCopy';
import { billingPageOf } from '../lib/billingPage';
import { openSupport } from '../components/support/supportBus';
import BillingStep from '../components/dashboard/billing/BillingStep';
import DashboardSkeleton from '../components/dashboard/shell/DashboardSkeleton';

/**
 * Plan & billing, after the user has a subscription.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * IT LEADS WITH WHAT THEY HAVE, NOT WITH WHAT WE SELL.
 *
 * It used to show three "Start Pro" cards to someone who had already started
 * Pro, with the trial message repeated twice — once in a banner and again in
 * the subtitle. This page is opened by people checking a date, fixing a card
 * or cancelling, and all three of those were below a sales pitch.
 *
 * Four states, derived from the subscription: trial, active, failed,
 * cancelled. The reference's state switcher is a design tool and is not here.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS MOCKED, AND WHY IT IS NOT PRETENDING.
 *
 * The brief allows typed mocks for fields the API lacks. Two of them would be
 * lies rather than placeholders on a billing page, so they are not mocked:
 *
 *  - The card's brand and last four digits. "Visa •••• 4242" against someone
 *    else's Mastercard is worse than saying nothing, so the row names the
 *    payment method without inventing it.
 *  - A scheduled plan change. "Starts 15 Nov" is read back from the provider
 *    (`GET /payments/subscriptions/plan-change`), never assumed from the last
 *    click, so a schedule applied or cancelled elsewhere does not leave a
 *    stale promise on the page.
 *
 * Invoices are the same: the list is the provider's until we have an endpoint.
 */

const CARD = 'padding:20px;border-radius:20px;background:#0d1422;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)';
const H3 = "margin:0;font:600 16px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.015em";
const KICKER = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;color:#7f8ca0";

const inr = (n) => (Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null;
const fill = (tpl, vals) => tpl.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '');

export default function BillingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const { session, user, subscription, refetchSubscription } = useAuth();
  const { accounts } = useTradingAccounts();
  const { selected: g, life } = useGuard();

  /* null until the pricing call answers: every amount on this page comes from
     it, and "Pro · —" flashing into "₹1,299" is the flicker we just removed
     from the shell. */
  const [plans, setPlans] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirming, setConfirming] = useState(false);
  /* What the subscription is scheduled to become. Read from the provider, not
     assumed from the last click — the schedule can also be applied or
     cancelled between page loads. */
  const [pending, setPending] = useState(null);
  /* The plan they just picked, for the celebration. Null when nothing is
     being celebrated. */
  const [celebrating, setCelebrating] = useState(null);

  const accessToken = session?.access_token;

  useEffect(() => {
    if (params.get('checkout') === 'success') { clearPendingCheckoutPlan(); refetchSubscription?.(); }
  }, [params, refetchSubscription]);
  useEffect(() => { getPricingPlans().then(setPlans).catch(() => setPlans([])); }, []);

  /*
   * BACK TO WHERE THEY WERE (spec §1.3).
   *
   * A lock sends people here with ?return=/dashboard/live. It is kept across
   * the trip to checkout, and once protection is back they land on the page
   * they were trying to use. Only dashboard paths: a return link that could
   * point anywhere is an open redirect.
   */
  useEffect(() => {
    const r = params.get('return');
    if (r && /^\/dashboard\/[\w\-/]*$/.test(r)) {
      try { window.sessionStorage.setItem('tgx.billing.return', r); } catch { /* best effort */ }
    }
  }, [params]);
  useEffect(() => {
    if (!life?.protected) return;
    let r = null;
    try { r = window.sessionStorage.getItem('tgx.billing.return'); } catch { /* none */ }
    if (!r) return;
    try { window.sessionStorage.removeItem('tgx.billing.return'); } catch { /* none */ }
    // Only once a payment has actually brought protection back.
    if (params.get('checkout') === 'success' || params.get('return')) navigate(r, { replace: true });
  }, [life?.protected, params, navigate]);
  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    fetchPendingPlanChange({ accessToken })
      .then((r) => { if (live) setPending(r?.pending ?? null); })
      /* Nothing scheduled is the overwhelmingly common answer, and a failed
         read must not block the page or claim a change nobody made. */
      .catch(() => {});
    return () => { live = false; };
  }, [accessToken]);

  const me = subscription ?? null;
  /*
   * WHICH PAGE, FROM THE LIFECYCLE CASE.
   *
   * The case (t1 … nr) decides the page state (lifecycle spec §3.9). Before
   * the case is known — or on an API that does not send it — the page falls
   * back to deriving it from the subscription, exactly as it used to.
   */
  const bp = billingPageOf(life, { autoRenews: Boolean(user?.trialAutoRenews), planState: user?.planState ?? null });
  const derived = billingStateOf({
    access: user?.access,
    trial: user?.trialAutoRenews ? { autoRenews: true } : null,
    canceled: user?.subscriptionCanceled,
    subscription: me?.subscription ?? null,
  });
  const state = bp ? (bp.page === 'legacy' ? 'none' : bp.page) : derived;
  const endedFrom = bp?.endedFrom ?? null;
  /* tc counts down to the trial end, pc to the period end (spec ⚠ on tc). */
  const trialCancelled = state === 'cancelled' && (bp ? bp.trial : Boolean(me?.subscription?.trialEndsAt));
  useEffect(() => { trackBilling('billing_page_viewed', { state }); }, [state]);

  const interval = me?.subscription?.billingInterval ?? 'monthly';
  const options = useMemo(() => {
    const rows = (plans ?? []).find((p) => String(p.slug || '').toLowerCase() === 'pro')?.intervals ?? [];
    return ['monthly', 'quarterly', 'yearly']
      .map((id) => {
        const r = rows.find((x) => x.interval === id);
        return r && typeof r.price === 'number' ? { id, name: id[0].toUpperCase() + id.slice(1), price: r.price } : null;
      })
      .filter(Boolean);
  }, [plans]);
  const monthlyPrice = options.find((o) => o.id === 'monthly')?.price ?? null;
  const cur = options.find((o) => o.id === interval) ?? options[0] ?? null;

  /* Trial ends on trialEndsAt; a paid period ends on currentPeriodEnd. Both
     are the same question — "when does the next thing happen" — but reading
     the wrong one tells a trialist their renewal date. */
  const nextAt = state === 'trial' || state === 'confirming' || trialCancelled
    ? me?.subscription?.trialEndsAt ?? me?.subscription?.currentPeriodEnd
    : me?.subscription?.currentPeriodEnd;
  const nextDate = fmtDate(nextAt);
  const left = daysUntil(nextAt);
  const createdAt = me?.subscription?.createdAt ?? null;
  const startedAt = fmtDate(createdAt);

  /*
   * How long the trial actually is, measured rather than assumed.
   *
   * "Day 1 of 7" had the 7 written into it. The server's TRIAL_DAYS is
   * env-driven precisely so a launch offer can be a config flip, so the first
   * 14-day trial would have had this bar counting to seven and reporting a
   * day number from the wrong end. The two dates we already hold say it
   * exactly.
   */
  const trialDays =
    createdAt && me?.subscription?.trialEndsAt
      ? Math.max(1, Math.round((new Date(me.subscription.trialEndsAt) - new Date(createdAt)) / 86400000))
      : 7;

  /* Close enough to the billing date that a UPI debit may already have been
     initiated, in which case "you will not be charged" cannot be promised. */
  const inFlight = debitMayBeInFlight(nextAt);

  const skin = STATE_SKIN[state] ?? STATE_SKIN.active;
  const chip = STATE_CHIP[state] ?? STATE_CHIP.active;

  const portal = useCallback(async (what) => {
    if (!accessToken) { toast.error('Not signed in', 'Please sign in again.'); return; }
    setBusy(what);
    try {
      /* Two endpoints, two field names: the portal returns `portalUrl` and
         the payment-method update returns `paymentUpdateUrl`. Reading one
         name for both is what made Update fail silently with "no link". */
      const res = what === 'card'
        ? await updateSubscriptionPaymentMethod({ accessToken })
        : await openBillingPortal({ accessToken });
      const url = res?.paymentUpdateUrl ?? res?.portalUrl ?? res?.url;
      if (!url) throw new Error('No link came back from the billing provider.');
      window.location.href = url;
    } catch (e) {
      toast.error('Could not open billing', e?.message || 'Please try again.');
      setBusy('');
    }
  }, [accessToken, toast]);

  /*
   * Switching period in place.
   *
   * On trial it applies at once (nothing has been billed yet, so the first
   * charge is simply for the new plan). Once paying it waits for the renewal
   * and shows as pending until then — the server decides which, and sends
   * every change as do-not-bill either way.
   */
  const switchTo = useCallback(async (opt) => {
    if (!accessToken) { toast.error('Not signed in', 'Please sign in again.'); return; }
    trackBilling('billing_plan_change_scheduled', { from: interval, to: opt.id });
    setBusy(`switch:${opt.id}`);
    try {
      const res = await changeSubscriptionPlan({ accessToken, interval: opt.id });
      setPending(res?.pending ?? null);
      /*
       * Celebrated, not just toasted — picking a plan is the one decision in
       * this product worth a moment.
       *
       * It does NOT say "upgraded". The change is SCHEDULED: they are still
       * on the old plan until the date below, and nothing has been charged.
       * Congratulating someone on a thing that has not happened yet is how
       * you get a support ticket asking why the price did not change.
       */
      setCelebrating(opt);
      refetchSubscription?.();
    } catch (e) {
      toast.error('Could not change the period', e?.message || 'Please try again.');
    } finally {
      setBusy('');
    }
  }, [accessToken, interval, refetchSubscription, toast]);

  const undoChange = useCallback(async () => {
    if (!accessToken) return;
    trackBilling('billing_plan_change_undone');
    setBusy('undo');
    try {
      const res = await cancelSubscriptionPlanChange({ accessToken });
      setPending(res?.pending ?? null);
      toast.success('Change cancelled', `You stay on ${cur?.name ?? 'your current plan'}.`);
    } catch (e) {
      toast.error('Could not undo it', e?.message || 'Please try again.');
    } finally {
      setBusy('');
    }
  }, [accessToken, cur, toast]);

  /*
   * Cancelling, in place. This used to hand the user to the provider's
   * customer portal and hope they found "Manage subscription" — two hops out
   * of the app to do the one thing we had just offered them a button for.
   */
  const doCancel = useCallback(async () => {
    if (!accessToken) { toast.error('Not signed in', 'Please sign in again.'); return; }
    trackBilling('billing_cancel_confirmed', { state });
    setBusy('cancel');
    try {
      await cancelSubscription({ accessToken });
      setConfirming(false);
      toast.success(
        inFlight ? 'Cancelled' : state === 'trial' ? 'Cancelled — you will not be charged' : 'Cancelled',
        state === 'failed'
          ? 'We have stopped retrying. Your rules, journal and tax history are kept.'
          : `You keep everything until ${nextDate ?? 'the end of your period'}.`,
      );
      refetchSubscription?.();
    } catch (e) {
      toast.error('Could not cancel', e?.message || 'Please try again.');
    } finally {
      setBusy('');
    }
  }, [accessToken, state, nextDate, inFlight, refetchSubscription, toast]);

  /*
   * Resuming, optionally on a different period.
   *
   * This used to be a fresh checkout on the reasoning that "the mandate was
   * ended when they cancelled" — true of an immediate cancellation, which is
   * not the one we perform. Until the period runs out the mandate is still
   * live, so coming back is a flag, not a second AFA and a re-typed UPI id.
   *
   * Checkout is still the answer once the window has actually passed, which
   * the server says with 409 rather than leaving us to guess from a date.
   */
  /*
   * What the switch actually means. The date is the one fact they need: it is
   * when the new price starts and, on a trial, when they are first charged.
   */
  const celebrationLine = (opt) => {
    const when = nextDate ?? 'your next billing date';
    const saved = savingVsMonthly(opt, monthlyPrice);
    const saving = saved > 0 ? ` That is ${inr(saved)} a year less than paying monthly.` : '';
    return state === 'trial'
      ? `Your free days run on exactly as they are — nothing is charged today. From ${when} you are on ${opt.name} at ${inr(opt.price)} ${PER[opt.id]}.${saving}`
      : `You stay on your current plan until ${when}. From then you are on ${opt.name} at ${inr(opt.price)} ${PER[opt.id]}.${saving}`;
  };

  const resume = useCallback(async (toInterval) => {
    if (!accessToken) { toast.error('Not signed in', 'Please sign in again.'); return; }
    trackBilling('billing_resume_clicked', { to: toInterval ?? interval });
    setBusy(toInterval ? `switch:${toInterval}` : 'resume');
    try {
      await resumeSubscription({ accessToken, interval: toInterval });
      // Protection never changed, so there is nothing more to say (spec, tc/pc).
      toast.success('Resumed. Nothing changes.', 'Your guard keeps running. Nothing was charged today.');
      refetchSubscription?.();
    } catch (e) {
      if (e?.status === 409) {
        /* Nothing left to un-cancel — buy it again, on the period they asked
           for rather than the one they used to be on. */
        try {
          const res = await createCheckoutSession({ accessToken, planSlug: 'pro', interval: toInterval ?? interval });
          if (!res?.checkoutUrl) throw new Error('Could not open checkout.');
          window.location.href = res.checkoutUrl;
          return;
        } catch (inner) {
          toast.error('Could not resume', inner?.message || 'Please try again.');
        }
      } else {
        toast.error('Could not resume', e?.message || 'Please try again.');
      }
    } finally {
      setBusy('');
    }
  }, [accessToken, interval, refetchSubscription, toast]);

  /*
   * Ended: a new subscription, charged now — there is no second trial, and
   * the server gives a spent trial 0 free days whatever we send.
   */
  const subscribeNow = useCallback(async (toInterval) => {
    if (!accessToken) { toast.error('Not signed in', 'Please sign in again.'); return; }
    trackBilling('billing_subscribe_clicked', { state, interval: toInterval });
    setBusy(`switch:${toInterval}`);
    try {
      const res = await createCheckoutSession({ accessToken, planSlug: 'pro', interval: toInterval });
      if (!res?.checkoutUrl) throw new Error('Could not open checkout.');
      window.location.href = res.checkoutUrl;
    } catch (e) {
      toast.error('Could not open checkout', e?.message || 'Please try again.');
      setBusy('');
    }
  }, [accessToken, state, toast]);

  /*
   * SETUP: THE BILLING SETUP STEP ITSELF.
   *
   * Nothing about a subscription exists yet, so this page is the same step
   * onboarding ends with. Before a key is verified (s0, s2) a trial cannot
   * start, so its button says "Continue setup" and goes back to onboarding.
   */
  if (plans === null && state !== 'setup' && state !== 'setupEarly') return <DashboardSkeleton />;

  if (state === 'setup' || state === 'setupEarly') {
    return <BillingStep setupCta={state === 'setupEarly' ? { label: 'Continue setup', to: '/dashboard/setup' } : undefined} />;
  }

  if (state === 'none') {
    /*
     * NO PLAN — BUT NOT NECESSARILY NOTHING.
     *
     * Two people land here. One has never had anything. The other is part
     * way through a legacy no-card trial: protected today, nothing attached,
     * and `billingStateOf` calls that `none` because every word of the trial
     * state's copy ("nothing is charged until the 15th") is false for a trial
     * with no card behind it.
     *
     * Telling the second "you don't have a plan yet, the first 7 days are
     * free" is wrong twice over. It contradicts the band directly above it,
     * which says their trial is running — and the 7 is a number we will not
     * honour: `trialDaysFor` carries their REMAINING days across, so someone
     * with 5 days left who presses this gets 5, not 7. Promising a week and
     * delivering five days is the kind of small lie that costs the sale at
     * the checkout page, which is where they would find out.
     */
    const left = user?.isTrial ? daysUntil(me?.subscription?.currentPeriodEnd) : null;
    const carrying = typeof left === 'number' && left > 0;
    /*
     * A THIRD PERSON LANDS HERE, AND THEY ARE THE ONES WE WERE WORST TO.
     *
     * `expired` is not `none`. They had the free week, used it, and watched
     * the guard stop. `trialDaysForUser` gives them 0, so "the first 7 days
     * are free and nothing is charged today" was both a lie about the money
     * and a strange thing to say to someone who already had the trial.
     */
    const spent = Boolean(user?.isExpired);
    const endedOn = spent ? fmtDate(me?.subscription?.currentPeriodEnd) : null;
    /* The old no-card trial, ended but still inside the engine's 3-day grace
       (tx without a card): protected for now, no payment coming. */
    const settling = life?.id === 'tx';
    const guardUntil = settling ? fmtDate(user?.planStateEndsAt) : null;
    return (
      <div style={sxw('max-width:1120px;margin:0 auto')}>
        <h1 style={sxw("margin:0;font:600 28px/1.1 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Plan &amp; billing</h1>
        <p style={sxw('margin:6px 0 0;font-size:13.5px;color:#8a96a8')}>Prices include 18% GST. Invoices are GST-compliant.</p>
        <section style={sxw(`margin-top:20px;${CARD}`)}>
          <p style={sxw('margin:0 0 14px;font-size:13.5px;line-height:1.55;color:#c9d2e0')}>
            {settling
              ? `Your free trial has ended and no payment method is set up. Your guard stays on${guardUntil ? ` until ${guardUntil}` : ' for a short while'}. Subscribe to keep it on — your free week is used, so the first charge is today.`
              : carrying
              ? `Your free trial has ${left} day${left === 1 ? '' : 's'} left and no payment method attached, so your guard stops when it ends. Add one and you keep all ${left} — nothing is charged today.`
              : spent
                ? `Your free trial ended${endedOn ? ` on ${endedOn}` : ''}, so nothing is enforcing your rules. Subscribe to switch the guard back on${cur ? ` — ${inr(cur.price)} ${PER[interval]}` : ''}. Your free week is already used, so the first charge is today.`
                : 'You don’t have a plan yet. Setting one up switches your guard on — the first 7 days are free and nothing is charged today.'}
          </p>
          <button type="button" onClick={() => navigate('/dashboard/activate')} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:#00d4aa;color:#02241d;font-size:13.5px;font-weight:800')}>
            {settling ? 'Subscribe' : carrying ? `Set up billing · keep your ${left} days` : spent ? 'Subscribe' : 'Start 7 days free'}
          </button>
        </section>
      </div>
    );
  }

  /* Only trial, cancelled and active have a bar. A failed payment has none:
     there is no grace period, so nothing is counting down (spec, pf). */
  const periodDays = { monthly: 30, quarterly: 91, yearly: 365 }[interval] ?? 30;
  const periodStart = (() => {
    if (!nextAt) return null;
    const d = new Date(nextAt);
    d.setMonth(d.getMonth() - ({ monthly: 1, quarterly: 3, yearly: 12 }[interval] ?? 1));
    return fmtDate(d);
  })();
  const windowDays = trialCancelled ? trialDays : periodDays;
  const bar =
    state === 'trial'
      ? {
          l: left != null ? `Day ${Math.min(trialDays, Math.max(1, trialDays - left + 1))} of ${trialDays}` : 'Trial running',
          r: left != null ? `${left} ${left === 1 ? 'day' : 'days'} left` : '',
          w: left != null ? `${Math.round(((trialDays - left) / trialDays) * 100)}%` : '0%',
        }
      : state === 'cancelled'
        ? { l: 'Protection ends', r: left != null ? `${left} ${left === 1 ? 'day' : 'days'} left` : '', w: left != null ? `${Math.max(2, Math.min(100, Math.round((1 - left / windowDays) * 100)))}%` : '50%' }
        : state === 'active'
          ? { l: periodStart && nextDate ? `${periodStart} → ${nextDate}` : nextDate ? `Renews ${nextDate}` : 'Renews', r: left != null ? `${left} days to renewal` : '', w: left != null ? `${Math.max(2, Math.min(100, Math.round((1 - left / periodDays) * 100)))}%` : '0%' }
          : null;

  const price = inr(cur?.price);
  const failedOn = fmtDate(me?.subscription?.currentPeriodEnd);
  /* The line beside the chip. Dates we do not hold are left out, never guessed. */
  const since = state === 'trial' ? (startedAt ? `Started ${startedAt}` : null)
    : state === 'active' ? (startedAt ? `Member since ${startedAt}` : null)
      : state === 'failed' ? (failedOn ? `Tried ${failedOn}` : null)
        : state === 'cancelled' ? 'Cancelled'
          : state === 'confirming' ? (nextDate ? `Trial ended ${nextDate}` : 'Trial ended')
            : state === 'comp' ? 'Granted by TradeGuardX'
              : state === 'unknown' ? 'Plan details unavailable'
                : state === 'ended'
                  ? bp?.legacyFree ? 'No active plan'
                    : endedFrom === 'pro' ? (failedOn ? `Pro ended ${failedOn}` : 'Pro ended')
                      : endedFrom === 'unpaid' ? (failedOn ? `Ended ${failedOn} · retries failed` : 'Ended · retries failed')
                        : (failedOn ? `Trial ended ${failedOn}` : 'Trial ended')
                  : null;
  const body = state === 'ended'
    ? fill(ENDED_BODY[bp?.legacyFree ? 'legacyFree' : endedFrom ?? 'pro'], { price })
    : fill(BODY[state] ?? '', { date: nextDate ?? 'your renewal date' });
  /* Period picker: trial and active change the plan; ended picks the plan to
     subscribe to; cancelled resumes onto one. Hidden while a payment is
     failing or confirming, and for comp or an unknown plan. */
  const showPeriod = ['trial', 'active', 'cancelled', 'ended'].includes(state);
  const neverCharged = state === 'ended' && endedFrom === 'trial';
  const invoiceText = state === 'trial'
    ? `No invoices yet. Your first one arrives on ${nextDate ?? 'your first payment'}, by email and here.`
    : state === 'cancelled' && trialCancelled ? 'No invoices. You won’t be charged.'
      : state === 'comp' ? 'No invoices. Your plan is complimentary.'
        : state === 'unknown' ? 'Invoices are unavailable right now.'
          : neverCharged ? 'No invoices. You were never charged.'
            : state === 'confirming' ? ''
              : 'Your invoices, with GST, are in the billing portal.';
  const showPortalInvoices = !(state === 'trial' || state === 'comp' || state === 'unknown' || state === 'confirming' || neverCharged || (state === 'cancelled' && trialCancelled));

  const rulesOn = g?.rulesOn ?? 0;
  const rulesTotal = g?.rulesTotal ?? 0;
  const cancelCopy = state === 'cancelled' && trialCancelled
    ? { ...CANCEL_COPY.cancelled, btn: 'Resume trial' }
    : state === 'ended' && endedFrom === 'unpaid'
      ? { ...CANCEL_COPY.ended, btn: `Pay ${price}` }
      : CANCEL_COPY[state] ?? null;

  return (
    <div style={sxw('max-width:1120px;margin:0 auto;padding-bottom:40px')}>
      <div style={sxw('display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap')}>
        <div>
          <h1 style={sxw("margin:0;font:600 28px/1.1 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Plan &amp; billing</h1>
          <p style={sxw('margin:6px 0 0;font-size:13.5px;color:#8a96a8')}>Prices include 18% GST. Invoices are GST-compliant.</p>
        </div>
      </div>

      <section style={sxw(`position:relative;overflow:hidden;margin-top:20px;border-radius:22px;background:#0d1422;box-shadow:inset 0 0 0 1px ${skin.line}`)}>
        <div aria-hidden style={sxw(`position:absolute;width:440px;height:440px;left:-170px;top:-230px;border-radius:50%;background:radial-gradient(circle,${skin.orb},transparent 66%);pointer-events:none`)} />
        <div style={sxw('position:relative;display:flex;flex-wrap:wrap')}>
          <div style={sxw('flex:1.4 1 380px;min-width:0;padding:24px')}>
            <div style={sxw('display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
              <span style={sxw(`display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:${chip.bg};color:${chip.fg};font:700 10px/1 'JetBrains Mono',monospace;letter-spacing:.1em`)}>
                <span aria-hidden style={sxw(`width:6px;height:6px;border-radius:50%;background:${chip.fg}`)} />
                {chip.label}
              </span>
              {since && <span style={sxw('font-size:12.5px;color:#8a96a8')}>{since}</span>}
            </div>

            <div style={sxw('margin-top:14px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap')}>
              <h2 style={sxw("margin:0;font:600 26px/1.1 'Space Grotesk',sans-serif;letter-spacing:-.03em")}>{state === 'comp' ? 'Pro · complimentary' : state === 'unknown' ? 'Pro' : `Pro · ${cur?.name ?? '—'}`}</h2>
              {/* A cancelled plan that still prices itself per month reads as
                  a live subscription. The price is no longer a recurring fact
                  about them, so the date they lose it takes its place. */}
              <span style={sxw(`font:600 15px/1 'Space Grotesk',sans-serif;color:${state === 'cancelled' ? '#fbc94f' : '#a3b0c2'}`)}>
                {state === 'cancelled' ? `Ends ${nextDate ?? 'soon'}` : state === 'comp' || state === 'unknown' ? '' : `${inr(cur?.price)} ${PER[interval]}`}
              </span>
            </div>

            <p style={sxw('margin:10px 0 0;font-size:14px;line-height:1.55;color:#c9d2e0;max-width:58ch')}>
              {body}
            </p>

            {bar && <div style={sxw('margin-top:16px;max-width:460px')}>
              <div style={sxw('display:flex;justify-content:space-between;font-size:12px;color:#8a96a8')}>
                <span>{bar.l}</span><span>{bar.r}</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={parseInt(bar.w, 10) || 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={bar.l}
                style={sxw('margin-top:7px;height:6px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden')}
              >
                <div style={sxw(`height:100%;border-radius:999px;width:${bar.w};background:${BAR_COLOUR[state]}`)} />
              </div>
            </div>}

            <div style={sxw('margin-top:18px;display:flex;gap:8px;flex-wrap:wrap')}>
              {state === 'trial' && rulesOn === 0 && (
                <button type="button" onClick={() => navigate('/dashboard/rules')} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:#00d4aa;color:#02241d;font-size:13.5px;font-weight:800')}>
                  Switch on rules
                </button>
              )}
              {state === 'failed' && (
                <button type="button" disabled={busy === 'card'} onClick={() => { trackBilling('billing_pay_now_clicked'); portal('card'); }} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:#ef4444;color:#fff;font-size:13.5px;font-weight:800')}>
                  {busy === 'card' ? 'Opening…' : `Pay ${inr(cur?.price)} now`}
                </button>
              )}
              {state === 'cancelled' && (
                <button type="button" disabled={busy === 'resume'} onClick={() => resume()} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:#00d4aa;color:#02241d;font-size:13.5px;font-weight:800')}>
                  {busy === 'resume' ? 'Opening…' : trialCancelled ? 'Resume trial' : 'Resume Pro'}
                </button>
              )}
              {state === 'active' && (
                /* TODO(api): the invoice PDF itself. Until payments lists
                   invoices, the last one lives in the provider's portal. */
                <button type="button" disabled={busy === 'portal'} onClick={() => { trackBilling('billing_invoice_downloaded'); portal('portal'); }} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:#00d4aa;color:#02241d;font-size:13.5px;font-weight:800')}>
                  {busy === 'portal' ? 'Opening…' : 'Download last invoice'}
                </button>
              )}
              {state === 'ended' && (
                <button type="button" disabled={busy.startsWith('switch') || busy === 'card'} onClick={() => (endedFrom === 'unpaid' ? portal('card') : subscribeNow(interval))} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:#00d4aa;color:#02241d;font-size:13.5px;font-weight:800')}>
                  {busy.startsWith('switch') || busy === 'card' ? 'Opening…' : endedFrom === 'unpaid' ? `Pay ${price}` : `Subscribe · ${price}`}
                </button>
              )}
              {state === 'unknown' && (
                <button type="button" onClick={() => openSupport('I can’t see my plan details on Plan & billing.')} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:rgba(255,255,255,.1);color:#f6f9fc;font-size:13.5px;font-weight:800')}>
                  Contact support
                </button>
              )}
              {showPeriod && state !== 'ended' && (
                <a href="#change" style={sxw('display:inline-flex;align-items:center;min-height:44px;padding:11px 16px;border-radius:11px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);color:#f6f9fc;font-size:13.5px;font-weight:700;text-decoration:none')}>
                  Change plan
                </a>
              )}
            </div>
          </div>

          <div style={sxw('flex:1 1 300px;min-width:0;padding:24px;border-left:1px solid rgba(255,255,255,.07);display:grid;gap:14px;align-content:start')}>
            <div>
              <div style={sxw(KICKER)}>{NEXT_LABEL[state]}</div>
              <div style={sxw(`margin-top:9px;font:700 30px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;color:${state === 'failed' ? '#ff8178' : ['cancelled', 'comp', 'unknown', 'ended'].includes(state) ? '#7f8ca0' : '#f6f9fc'}`)}>
                {state === 'unknown' ? '—' : ['cancelled', 'comp', 'ended'].includes(state) ? 'None' : inr(cur?.price)}
              </div>
              <div style={sxw('margin-top:6px;font-size:12.5px;color:#a3b0c2')}>
                {state === 'cancelled'
                  ? `${trialCancelled ? 'Trial ends' : 'Plan ends'} ${nextDate ?? ''}`
                  : state === 'failed'
                    /* TODO(api): Dodo's retry dates ("Or we retry on 17 Oct and 20 Oct"). */
                    ? 'Or we retry automatically'
                    : state === 'confirming'
                      ? `Charged ${nextDate ?? 'at the end of your trial'} · confirming`
                      : state === 'comp'
                        ? (nextDate ? `Complimentary until ${nextDate}` : 'Complimentary')
                        : state === 'unknown'
                          ? 'Not available'
                          : state === 'ended'
                            ? 'No active plan'
                            : `on ${nextDate ?? '—'} · ${state === 'trial' ? `then ${EVERY[interval]}` : 'auto-renews'}`}
              </div>
            </div>

            {/*
              * The card itself is not named. We have no brand or last four
              * from the API, and "Visa •••• 4242" against someone else's
              * Mastercard is worse than saying nothing on the screen where
              * they are checking what will be charged.
              * TODO(api): surface brand, last4 and expiry on /subscriptions/me.
              */}
            <div style={sxw(`display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:#070a12;box-shadow:inset 0 0 0 1px ${state === 'failed' || endedFrom === 'unpaid' ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.07)'}`)}>
              {/*
                * Not "CARD". Most people here pay by UPI mandate, and a card
                * tile on a UPI subscription is the same class of error as
                * printing someone else's last four digits — it describes a
                * payment method we have not been told about.
                * TODO(api): once /subscriptions/me carries the method, show
                * the real brand or "UPI Autopay" here.
                */}
              <span aria-hidden style={sxw('flex:none;width:40px;height:28px;border-radius:6px;background:rgba(255,255,255,.07);display:grid;place-items:center;color:#a3b0c2')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h18v12H3z" /><path d="M3 11h18M8 15h4" />
                </svg>
              </span>
              <span style={sxw('flex:1;min-width:0')}>
                <span style={sxw('display:block;font-size:13px;font-weight:700')}>Payment method on file</span>
                <span style={sxw(`display:block;margin-top:2px;font-size:11.5px;color:${state === 'failed' || endedFrom === 'unpaid' ? '#ff8178' : '#7f8ca0'}`)}>
                  {state === 'failed' || endedFrom === 'unpaid' ? (failedOn ? `Declined by bank on ${failedOn}` : 'Declined by your bank')
                    : state === 'cancelled' ? 'Will not be charged'
                      : state === 'confirming' ? 'Charge pending'
                        : state === 'comp' ? 'No card needed'
                          : state === 'unknown' ? 'Not available'
                            : state === 'ended' ? 'Saved · charged only when you subscribe'
                              : state === 'active' ? 'Default'
                                : nextDate ? `Saved for ${nextDate}` : 'Saved'}
                </span>
              </span>
              {state !== 'comp' && state !== 'unknown' && (
                <button type="button" disabled={busy === 'card'} onClick={() => portal('card')} style={sxw('flex:none;min-height:36px;padding:7px 11px;border:0;border-radius:9px;background:rgba(255,255,255,.07);color:#f6f9fc;font-size:12px;font-weight:700')}>
                  {busy === 'card' ? '…' : 'Update'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div style={sxw('margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px')}>
        <section style={sxw(CARD)}>
          <h3 style={sxw(H3)}>What your plan is protecting</h3>
          <div style={sxw('margin-top:14px;display:grid;gap:14px')}>
            {/* The ceiling comes from the plan, not from the word
                "unlimited" typed into a template: a Free row would have read
                "1 · unlimited", which is the opposite of true. */}
            <Row
              k="Trading accounts"
              v={`${accounts?.length ?? 0} · ${maxTradingAccountsForPlan(user?.subscribedPlanSlug ?? 'pro') ?? 'unlimited'}`}
            />
            <Row
              k="Rules switched on"
              v={`${rulesOn} of ${rulesTotal}`}
              fg={rulesOn === 0 ? '#fbc94f' : '#f6f9fc'}
              bar={{ w: rulesTotal ? `${Math.max(2, (rulesOn / rulesTotal) * 100)}%` : '2%', c: rulesOn === 0 ? '#f0b429' : '#00d4aa' }}
              note={rulesOn === 0 ? 'Nothing is being enforced yet.' : null}
              cta={rulesOn === 0 ? { label: 'Switch on rules →', to: '/dashboard/rules' } : null}
              navigate={navigate}
            />
            <Row k="Trade history kept" v={journalPeriodBadgeLabel(user?.subscribedPlanSlug ?? 'pro')} />
          </div>
        </section>

        <section style={sxw(CARD)}>
          <div style={sxw('display:flex;align-items:center;justify-content:space-between;gap:10px')}>
            <h3 style={sxw(H3)}>Billing details</h3>
            <button type="button" disabled={busy === 'portal'} onClick={() => portal('portal')} style={sxw('min-height:34px;padding:6px 11px;border:0;border-radius:9px;background:rgba(255,255,255,.07);color:#f6f9fc;font-size:12px;font-weight:700')}>
              {busy === 'portal' ? '…' : 'Edit'}
            </button>
          </div>
          {/* Name, state and GSTIN live with the payment provider, not with
              us. Rather than print blanks we show what we hold and send the
              rest to the portal, which is where they are actually editable.
              TODO(api): mirror them onto /subscriptions/me if we ever need
              them on screen. */}
          <div style={sxw('margin-top:12px;display:grid')}>
            <Detail k="Invoice email" v={user?.email ?? session?.user?.email ?? '—'} />
            <Detail
              k="Plan"
              v={cur ? `Pro · ${cur.name}${state === 'cancelled' ? ` · ends ${nextDate ?? 'soon'}` : ''}` : '—'}
            />
            <Detail k="Billing details & GSTIN" v="Managed in the billing portal" muted />
          </div>
          <p style={sxw('margin:10px 0 0;font-size:11.5px;line-height:1.5;color:#7f8ca0')}>
            Add a GSTIN to claim input tax credit on your invoices.
          </p>
        </section>
      </div>

      {showPeriod && <section id="change" style={sxw(`margin-top:16px;${CARD}`)}>
        <div style={sxw('display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap')}>
          <h3 style={sxw(H3)}>Change billing period</h3>
          <span style={sxw('font-size:12px;color:#7f8ca0')}>Every plan includes all five protections</span>
        </div>
        {pending && (() => {
          /* The one thing the user needs to know between pressing Switch and
             the renewal: what changes, when, and that today costs nothing. */
          const to = options.find((o) => o.id === pending.interval);
          return (
            <div style={sxw('margin-top:13px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;border-radius:13px;background:rgba(240,180,41,.09);box-shadow:inset 0 0 0 1px rgba(240,180,41,.26)')}>
              <p style={sxw('flex:1;min-width:200px;margin:0;font-size:12.5px;line-height:1.5;color:#f0d79a')}>
                Changes to <strong style={sxw('color:#fbc94f')}>{to?.name ?? pending.interval}</strong>
                {to ? ` (${inr(to.price)} ${PER[pending.interval]})` : ''} on {fmtDate(pending.effectiveAt) ?? 'your next renewal'}.
                {cur ? ` You stay on ${cur.name} until then.` : ''} No charge today.
              </p>
              <button
                type="button"
                disabled={busy === 'undo' || busy.startsWith('switch')}
                onClick={undoChange}
                style={sxw('flex:none;min-height:36px;padding:8px 13px;border:0;border-radius:9px;background:rgba(255,255,255,.1);color:#f6f9fc;font-size:12px;font-weight:700')}
              >
                {busy === 'undo' ? '…' : 'Undo'}
              </button>
            </div>
          );
        })()}
        <div style={sxw('margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:10px')}>
          {options.map((o) => {
            // With no plan there is no "current" period, only a choice.
            const isCur = o.id === interval && state !== 'ended';
            const isPending = pending?.interval === o.id;
            const saving = savingVsMonthly(o, monthlyPrice);
            return (
              <div key={o.id} style={sxw(`display:flex;flex-direction:column;gap:10px;padding:15px;border-radius:15px;background:${isCur ? (state === 'cancelled' ? 'rgba(240,180,41,.05)' : 'rgba(0,212,170,.06)') : 'rgba(255,255,255,.02)'};box-shadow:${isCur ? `inset 0 0 0 1.5px ${state === 'cancelled' ? '#f0b429' : '#00d4aa'}` : 'inset 0 0 0 1px rgba(255,255,255,.09)'}`)}>
                <div style={sxw('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
                  <span style={sxw('font-size:14px;font-weight:700')}>{o.name}</span>
                  {isCur && (
                    <span style={sxw(`font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:4px 6px;border-radius:5px;background:${state === 'cancelled' ? 'rgba(240,180,41,.16)' : 'rgba(0,212,170,.16)'};color:${state === 'cancelled' ? '#fbc94f' : '#2fe3bd'}`)}>
                      {state === 'cancelled' ? 'ENDING' : 'CURRENT'}
                    </span>
                  )}
                  {isPending && <span style={sxw("font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:4px 6px;border-radius:5px;background:rgba(240,180,41,.16);color:#fbc94f")}>SCHEDULED</span>}
                  {!isCur && !isPending && saving > 0 && <span style={sxw("font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:4px 6px;border-radius:5px;background:rgba(240,180,41,.14);color:#fbc94f")}>{`SAVE ${inr(saving)}`}</span>}
                </div>
                <div>
                  <span style={sxw("font:700 22px/1 'Space Grotesk',sans-serif;letter-spacing:-.025em")}>{inr(o.price)}</span>{' '}
                  <span style={sxw('font-size:12px;color:#8a96a8')}>{PER[o.id]}</span>
                </div>
                <div style={sxw('font-size:12px;line-height:1.45;color:#a3b0c2;min-height:34px')}>{PLAN_NOTE[o.id]}</div>
                {/* Changes happen here now. This used to open the provider's
                    customer portal, which lists the subscription and the
                    invoices but has no plan switcher — so "Switch to Yearly"
                    delivered the user to a page where they could not. */}
                {/* Cancelled is NOT a reason to lock the period picker. Someone
                    who cancelled and now wants quarterly is telling us they
                    want to stay — and the only route we offered was "resume
                    first", on a button that opened a fresh checkout. So here
                    the switch resumes them onto the period they picked, and
                    the label says so rather than un-cancelling them quietly. */}
                <button
                  type="button"
                  disabled={(isCur && state !== 'cancelled' && state !== 'ended') || isPending || state === 'failed' || busy.startsWith('switch') || busy === 'undo'}
                  onClick={() => (state === 'ended' ? subscribeNow(o.id) : state === 'cancelled' ? resume(o.id) : switchTo(o))}
                  style={sxw(`min-height:42px;padding:10px;border:0;border-radius:10px;background:${state === 'cancelled' || state === 'ended' ? '#00d4aa' : isCur || isPending ? 'transparent' : 'rgba(255,255,255,.08)'};color:${state === 'cancelled' || state === 'ended' ? '#02241d' : isCur || isPending ? '#7f8ca0' : '#f6f9fc'};font-size:13px;font-weight:700;cursor:${(isCur && state !== 'cancelled' && state !== 'ended') || isPending ? 'default' : 'pointer'}`)}
                >
                  {busy === `switch:${o.id}`
                    ? (state === 'cancelled' ? 'Resuming…' : 'Switching…')
                    : state === 'ended' ? `Subscribe · ${inr(o.price)}`
                    : state === 'cancelled' ? `Resume on ${o.name}`
                      : isCur ? 'Your plan'
                        : isPending ? 'Scheduled' : `Switch to ${o.name}`}
                </button>
              </div>
            );
          })}
        </div>
        {(state === 'failed' || state === 'cancelled') && (
          <p style={sxw('margin:12px 0 0;font-size:12.5px;color:#7f8ca0')}>
            {state === 'failed'
              ? 'Sort the payment out first — then you can change the period.'
              : `Your card is still saved, so picking a period brings you back on it. Nothing is charged until ${nextDate ?? 'your trial ends'}.`}
          </p>
        )}
        {state === 'ended' && (
          <p style={sxw('margin:12px 0 0;font-size:12.5px;color:#7f8ca0')}>
            Pick the period for your new subscription. It is charged today — there is no second free trial.
          </p>
        )}
      </section>}

      <section style={sxw('margin-top:16px;border-radius:20px;background:#0d1422;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);overflow:hidden')}>
        <div style={sxw('padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.07)')}>
          <h3 style={sxw(H3)}>Invoices</h3>
        </div>
        {/* TODO(api): list invoices inline once payments exposes them. Until
            then the provider's portal is the only place they exist, and a
            fabricated row on a GST document is not a placeholder. The one
            row shown is the pending first charge, which is a fact we hold. */}
        {state === 'confirming' && cur && (
          <div style={sxw('display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.07);font-size:13px;flex-wrap:wrap')}>
            <span style={sxw('min-width:90px;color:#a3b0c2')}>{nextDate ?? '—'}</span>
            <span style={sxw('flex:1;min-width:140px')}>
              <span style={sxw('display:block;font-weight:600')}>Pro · {cur.name}</span>
              <span style={sxw('display:block;margin-top:2px;font-size:11.5px;color:#7f8ca0')}>Invoice is issued once the payment confirms</span>
            </span>
            <span style={sxw("font:600 13px/1 'Space Grotesk',sans-serif")}>{inr(cur.price)}</span>
            <span style={sxw("font:700 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:5px 7px;border-radius:6px;background:rgba(240,180,41,.14);color:#fbc94f")}>PENDING</span>
          </div>
        )}
        <div style={sxw('padding:22px 20px;text-align:center;font-size:13px;color:#8a96a8')}>
          {invoiceText}
          {showPortalInvoices && (
            <div style={sxw('margin-top:12px')}>
              <button type="button" disabled={busy === 'portal'} onClick={() => { trackBilling('billing_invoice_downloaded'); portal('portal'); }} style={sxw('min-height:40px;padding:9px 14px;border:0;border-radius:10px;background:rgba(255,255,255,.07);color:#f6f9fc;font-size:12.5px;font-weight:700')}>
                {busy === 'portal' ? 'Opening…' : 'Open invoices'}
              </button>
            </div>
          )}
          {cur && !['comp', 'unknown'].includes(state) && (
            <p style={sxw('margin:10px 0 0;font-size:11.5px;color:#7f8ca0')}>
              {`A ${cur.name.toLowerCase()} invoice of ${inr(cur.price)} includes ₹${gstInside(cur.price).toFixed(2)} GST.`}
            </p>
          )}
        </div>
      </section>

      {/* No bottom row while a charge is confirming: it resolves to paid or
          failed on its own, and cannot be cancelled mid-flight (spec, tx). */}
      {cancelCopy && <section style={sxw('margin-top:16px;display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:20px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);flex-wrap:wrap')}>
        <span style={sxw('flex:1;min-width:240px')}>
          <span style={sxw('display:block;font-size:14px;font-weight:700')}>{cancelCopy.title}</span>
          <span style={sxw('display:block;margin-top:4px;font-size:12.5px;line-height:1.5;color:#8a96a8')}>
            {fill(cancelCopy.body, { date: nextDate ?? 'the end of your period' })}
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            if (state === 'cancelled') { resume(); return; }
            if (state === 'comp' || state === 'unknown') { openSupport('A question about my plan.'); return; }
            if (state === 'ended') { if (endedFrom === 'unpaid') portal('card'); else subscribeNow(interval); return; }
            trackBilling('billing_cancel_clicked', { state });
            setConfirming(true);
          }}
          style={sxw(`flex:none;min-height:42px;padding:10px 15px;border:0;border-radius:10px;background:${state === 'cancelled' || state === 'ended' ? '#00d4aa' : 'transparent'};color:${state === 'cancelled' || state === 'ended' ? '#02241d' : state === 'comp' || state === 'unknown' ? '#c9d2e0' : '#ff8178'};font-size:13px;font-weight:700`)}
        >
          {cancelCopy.btn}
        </button>
      </section>}

      <CelebrationOverlay
        open={Boolean(celebrating)}
        onClose={() => {
          setCelebrating(null);
          /* A reload, because this page is built from the subscription row
             the webhook writes, and that lands a moment after Dodo answers.
             Refetching alone can show the pre-change plan for a beat. */
          if (typeof window !== 'undefined') window.location.reload();
        }}
        kicker={celebrating ? `Switching to ${celebrating.name}` : null}
        headline={celebrating ? `${celebrating.name} it is 🎉` : ''}
        sub={celebrating ? celebrationLine(celebrating) : ''}
        cta="Got it"
      />

      {confirming && (
        <div
          role="presentation"
          onClick={() => setConfirming(false)}
          style={sxw('position:fixed;inset:0;z-index:70;background:rgba(3,5,10,.72);backdrop-filter:blur(6px);display:grid;place-items:center;padding:24px')}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={cancelCopy.title}
            onClick={(e) => e.stopPropagation()}
            style={sxw('width:min(460px,100%);padding:22px;border-radius:18px;background:#0d1422;box-shadow:inset 0 0 0 1px rgba(239,68,68,.35)')}
          >
            <h3 style={sxw("margin:0;font:600 18px/1.25 'Space Grotesk',sans-serif")}>{cancelCopy.title}</h3>
            {/* The dialog repeats the consequence rather than asking "are you
                sure": the point of confirming is that they read what happens,
                not that they click twice. */}
            <p style={sxw('margin:10px 0 0;font-size:13px;line-height:1.55;color:#c9d2e0')}>
              {fill(cancelCopy.body, { date: nextDate ?? 'the end of your period' })}
            </p>
            {/*
              * Cancelling the subscription and revoking the bank mandate are
              * two different things, and we can only do the first. Dodo
              * exposes no way to revoke a UPI mandate — its SDK has no
              * payment-method resource at all — so a customer who cancels and
              * then finds Autopay still listed at their bank concludes the
              * cancellation failed. Telling them where it lives costs a line.
              */}
            <p style={sxw('margin:12px 0 0;font-size:12.5px;line-height:1.5;color:#8a96a8')}>
              {MANDATE_NOTE}
            </p>
            {inFlight && (
              /* Indian UPI debits are initiated inside a ~48h window before
                 the date, and nothing we do here stops one already in flight.
                 Shown only to the people it can actually happen to. */
              <p style={sxw('margin:10px 0 0;padding:10px 12px;border-radius:10px;background:rgba(240,180,41,.09);box-shadow:inset 0 0 0 1px rgba(240,180,41,.26);font-size:12.5px;line-height:1.5;color:#f0d79a')}>
                {IN_FLIGHT_NOTE}
              </p>
            )}
            <div style={sxw('margin-top:18px;display:flex;gap:9px;flex-wrap:wrap')}>
              <button type="button" disabled={busy === 'cancel'} onClick={doCancel} style={sxw('flex:1;min-width:150px;min-height:44px;padding:11px;border:0;border-radius:11px;background:#ef4444;color:#fff;font-size:13px;font-weight:800')}>
                {busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button type="button" onClick={() => setConfirming(false)} style={sxw('flex:1;min-width:150px;min-height:44px;padding:11px;border:0;border-radius:11px;background:rgba(255,255,255,.08);color:#f6f9fc;font-size:13px;font-weight:700')}>
                Keep my guard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, fg = '#f6f9fc', bar, note, cta, navigate }) {
  return (
    <div>
      <div style={sxw('display:flex;justify-content:space-between;align-items:baseline;gap:10px')}>
        <span style={sxw('font-size:13px;color:#a3b0c2')}>{k}</span>
        <span style={sxw(`font:700 14px/1 'Space Grotesk',sans-serif;color:${fg}`)}>{v}</span>
      </div>
      {bar && (
        <div style={sxw('margin-top:7px;height:5px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden')}>
          <div style={sxw(`height:100%;border-radius:999px;width:${bar.w};background:${bar.c}`)} />
        </div>
      )}
      {note && (
        <div style={sxw('margin-top:7px;display:flex;align-items:center;gap:8px;font-size:12px;color:#fbc94f;flex-wrap:wrap')}>
          {note}
          {cta && (
            <button type="button" onClick={() => navigate(cta.to)} style={sxw('padding:0;border:0;background:none;color:#2fe3bd;font-size:12px;font-weight:700')}>
              {cta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ k, v, muted }) {
  return (
    <div style={sxw('display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px')}>
      <span style={sxw('color:#8a96a8')}>{k}</span>
      <span style={sxw(`text-align:right;font-weight:600;color:${muted ? '#7f8ca0' : '#f6f9fc'}`)}>{v}</span>
    </div>
  );
}

/** The project's inline-style helper, imported under a short name. */
function sxw(...args) {
  return sx(...args);
}
