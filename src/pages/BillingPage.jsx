import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { clearPendingCheckoutPlan } from '../lib/checkoutIntent';
import { openBillingPortal, updateSubscriptionPaymentMethod, createCheckoutSession } from '../api/paymentsApi';
import { getPricingPlans } from '../api/pricingApi';
import { journalPeriodBadgeLabel, maxTradingAccountsForPlan } from '../lib/planLimits';
import { billingStateOf, daysUntil, gstInside, savingVsMonthly } from '../lib/billingState';
import { trackBilling } from '../lib/analytics';
import { sx } from '../components/dashboard/shell/sx';
import {
  BAR_COLOUR, BODY, CANCEL_COPY, EVERY, NEXT_LABEL, PER, PLAN_NOTE, STATE_CHIP, STATE_SKIN,
} from './billing/billingCopy';

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
 *  - A scheduled plan change. Faking "starts 15 Nov" would tell someone their
 *    billing had changed when nothing had. Plan changes open the provider's
 *    portal, which really does change them.
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
  const { selected: g } = useGuard();

  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState('');
  const [confirming, setConfirming] = useState(false);

  const accessToken = session?.access_token;

  useEffect(() => {
    if (params.get('checkout') === 'success') { clearPendingCheckoutPlan(); refetchSubscription?.(); }
  }, [params, refetchSubscription]);
  useEffect(() => { getPricingPlans().then(setPlans).catch(() => setPlans([])); }, []);

  const me = subscription ?? null;
  const state = billingStateOf({
    access: user?.access,
    trial: user?.trialAutoRenews ? { autoRenews: true } : null,
    canceled: user?.subscriptionCanceled,
    subscription: me?.subscription ?? null,
  });
  useEffect(() => { trackBilling('billing_page_viewed', { state }); }, [state]);

  const interval = me?.subscription?.billingInterval ?? 'monthly';
  const options = useMemo(() => {
    const rows = plans.find((p) => String(p.slug || '').toLowerCase() === 'pro')?.intervals ?? [];
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
  const nextAt = state === 'trial' ? me?.subscription?.trialEndsAt : me?.subscription?.currentPeriodEnd;
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

  const skin = STATE_SKIN[state] ?? STATE_SKIN.active;
  const chip = STATE_CHIP[state] ?? STATE_CHIP.active;

  const portal = useCallback(async (what) => {
    if (!accessToken) { toast.error('Not signed in', 'Please sign in again.'); return; }
    setBusy(what);
    try {
      const res = what === 'card'
        ? await updateSubscriptionPaymentMethod({ accessToken })
        : await openBillingPortal({ accessToken });
      const url = res?.portalUrl ?? res?.url;
      if (!url) throw new Error('No portal link came back.');
      window.location.href = url;
    } catch (e) {
      toast.error('Could not open billing', e?.message || 'Please try again.');
      setBusy('');
    }
  }, [accessToken, toast]);

  const resume = async () => {
    trackBilling('billing_resume_clicked');
    /* Resuming is a fresh checkout on the same plan: the mandate was ended
       when they cancelled, so there is nothing to un-cancel. */
    setBusy('resume');
    try {
      const res = await createCheckoutSession({ accessToken, planSlug: 'pro', interval });
      if (!res?.checkoutUrl) throw new Error('Could not open checkout.');
      window.location.href = res.checkoutUrl;
    } catch (e) {
      toast.error('Could not resume', e?.message || 'Please try again.');
      setBusy('');
    }
  };

  if (state === 'none') {
    /* No subscription to manage. The setup flow is where this starts. */
    return (
      <div style={sxw('max-width:1120px;margin:0 auto')}>
        <h1 style={sxw("margin:0;font:600 28px/1.1 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Plan &amp; billing</h1>
        <p style={sxw('margin:6px 0 0;font-size:13.5px;color:#8a96a8')}>Prices include 18% GST. Invoices are GST-compliant.</p>
        <section style={sxw(`margin-top:20px;${CARD}`)}>
          <p style={sxw('margin:0 0 14px;font-size:13.5px;line-height:1.55;color:#c9d2e0')}>
            You don&rsquo;t have a plan yet. Setting one up switches your guard on — the first 7 days are free and nothing is charged today.
          </p>
          <button type="button" onClick={() => navigate('/dashboard/activate')} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:#00d4aa;color:#02241d;font-size:13.5px;font-weight:800')}>
            Start 7 days free
          </button>
        </section>
      </div>
    );
  }

  const bar =
    state === 'trial'
      ? {
          l: left != null ? `Day ${Math.min(trialDays, Math.max(1, trialDays - left + 1))} of ${trialDays}` : 'Trial running',
          r: left != null ? `${left} ${left === 1 ? 'day' : 'days'} left` : '',
          w: left != null ? `${Math.round(((trialDays - left) / trialDays) * 100)}%` : '0%',
        }
      : state === 'cancelled'
        ? { l: 'Protection ends', r: left != null ? `${left} days left` : '', w: '58%' }
        : state === 'failed'
          ? { l: 'Grace period', r: left != null ? `${left} days left` : '', w: '14%' }
          : { l: nextDate ? `Renews ${nextDate}` : 'Renews', r: left != null ? `${left} days to renewal` : '', w: '23%' };

  const rulesOn = g?.rulesOn ?? 0;
  const rulesTotal = g?.rulesTotal ?? 0;
  const cancelCopy = CANCEL_COPY[state];

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
              {startedAt && <span style={sxw('font-size:12.5px;color:#8a96a8')}>{state === 'trial' ? `Started ${startedAt}` : `Member since ${startedAt}`}</span>}
            </div>

            <div style={sxw('margin-top:14px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap')}>
              <h2 style={sxw("margin:0;font:600 26px/1.1 'Space Grotesk',sans-serif;letter-spacing:-.03em")}>Pro · {cur?.name ?? '—'}</h2>
              <span style={sxw("font:600 15px/1 'Space Grotesk',sans-serif;color:#a3b0c2")}>{inr(cur?.price)} {PER[interval]}</span>
            </div>

            <p style={sxw('margin:10px 0 0;font-size:14px;line-height:1.55;color:#c9d2e0;max-width:58ch')}>
              {fill(BODY[state], { date: nextDate ?? 'your renewal date' })}
            </p>

            <div style={sxw('margin-top:16px;max-width:460px')}>
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
            </div>

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
                <button type="button" disabled={busy === 'resume'} onClick={resume} style={sxw('min-height:44px;padding:11px 18px;border:0;border-radius:11px;background:#00d4aa;color:#02241d;font-size:13.5px;font-weight:800')}>
                  {busy === 'resume' ? 'Opening…' : 'Resume Pro'}
                </button>
              )}
              <a href="#change" style={sxw('display:inline-flex;align-items:center;min-height:44px;padding:11px 16px;border-radius:11px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);color:#f6f9fc;font-size:13.5px;font-weight:700;text-decoration:none')}>
                Change plan
              </a>
            </div>
          </div>

          <div style={sxw('flex:1 1 300px;min-width:0;padding:24px;border-left:1px solid rgba(255,255,255,.07);display:grid;gap:14px;align-content:start')}>
            <div>
              <div style={sxw(KICKER)}>{NEXT_LABEL[state]}</div>
              <div style={sxw(`margin-top:9px;font:700 30px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;color:${state === 'failed' ? '#ff8178' : state === 'cancelled' ? '#7f8ca0' : '#f6f9fc'}`)}>
                {state === 'cancelled' ? 'None' : inr(cur?.price)}
              </div>
              <div style={sxw('margin-top:6px;font-size:12.5px;color:#a3b0c2')}>
                {state === 'cancelled'
                  ? `Plan ends ${nextDate ?? ''}`
                  : state === 'failed'
                    ? 'We retry automatically'
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
            <div style={sxw(`display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:#070a12;box-shadow:inset 0 0 0 1px ${state === 'failed' ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.07)'}`)}>
              <span aria-hidden style={sxw("flex:none;width:40px;height:28px;border-radius:6px;background:linear-gradient(135deg,#1a1f71,#2e3a9e);display:grid;place-items:center;font:800 9px/1 'Space Grotesk',sans-serif;letter-spacing:.06em;color:#fff")}>CARD</span>
              <span style={sxw('flex:1;min-width:0')}>
                <span style={sxw('display:block;font-size:13px;font-weight:700')}>Payment method on file</span>
                <span style={sxw(`display:block;margin-top:2px;font-size:11.5px;color:${state === 'failed' ? '#ff8178' : '#7f8ca0'}`)}>
                  {state === 'failed' ? 'Declined by your bank' : state === 'cancelled' ? 'Will not be charged again' : nextDate ? `Saved for ${nextDate}` : 'Saved'}
                </span>
              </span>
              <button type="button" disabled={busy === 'card'} onClick={() => portal('card')} style={sxw('flex:none;min-height:36px;padding:7px 11px;border:0;border-radius:9px;background:rgba(255,255,255,.07);color:#f6f9fc;font-size:12px;font-weight:700')}>
                {busy === 'card' ? '…' : 'Update'}
              </button>
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
            <Detail k="Plan" v={cur ? `Pro · ${cur.name}` : '—'} />
            <Detail k="Billing details & GSTIN" v="Managed in the billing portal" muted />
          </div>
          <p style={sxw('margin:10px 0 0;font-size:11.5px;line-height:1.5;color:#7f8ca0')}>
            Add a GSTIN to claim input tax credit on your invoices.
          </p>
        </section>
      </div>

      <section id="change" style={sxw(`margin-top:16px;${CARD}`)}>
        <div style={sxw('display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap')}>
          <h3 style={sxw(H3)}>Change billing period</h3>
          <span style={sxw('font-size:12px;color:#7f8ca0')}>Every plan includes all five protections</span>
        </div>
        <div style={sxw('margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:10px')}>
          {options.map((o) => {
            const isCur = o.id === interval;
            const saving = savingVsMonthly(o, monthlyPrice);
            return (
              <div key={o.id} style={sxw(`display:flex;flex-direction:column;gap:10px;padding:15px;border-radius:15px;background:${isCur ? 'rgba(0,212,170,.06)' : 'rgba(255,255,255,.02)'};box-shadow:${isCur ? 'inset 0 0 0 1.5px #00d4aa' : 'inset 0 0 0 1px rgba(255,255,255,.09)'}`)}>
                <div style={sxw('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
                  <span style={sxw('font-size:14px;font-weight:700')}>{o.name}</span>
                  {isCur && <span style={sxw("font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:4px 6px;border-radius:5px;background:rgba(0,212,170,.16);color:#2fe3bd")}>CURRENT</span>}
                  {!isCur && saving > 0 && <span style={sxw("font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:4px 6px;border-radius:5px;background:rgba(240,180,41,.14);color:#fbc94f")}>{`SAVE ${inr(saving)}`}</span>}
                </div>
                <div>
                  <span style={sxw("font:700 22px/1 'Space Grotesk',sans-serif;letter-spacing:-.025em")}>{inr(o.price)}</span>{' '}
                  <span style={sxw('font-size:12px;color:#8a96a8')}>{PER[o.id]}</span>
                </div>
                <div style={sxw('font-size:12px;line-height:1.45;color:#a3b0c2;min-height:34px')}>{PLAN_NOTE[o.id]}</div>
                {/* Changing plan opens the provider's portal, which really
                    does change it. A local "starts 15 Nov" would tell someone
                    their billing had changed when nothing had.
                    TODO(api): a schedule-at-period-end endpoint would let this
                    happen in place, with the pending state the brief describes. */}
                <button
                  type="button"
                  disabled={isCur || state === 'failed' || state === 'cancelled' || busy === 'portal'}
                  onClick={() => { trackBilling('billing_plan_change_scheduled', { from: interval, to: o.id }); portal('portal'); }}
                  style={sxw(`min-height:42px;padding:10px;border:0;border-radius:10px;background:${isCur ? 'transparent' : 'rgba(255,255,255,.08)'};color:${isCur ? '#7f8ca0' : '#f6f9fc'};font-size:13px;font-weight:700;cursor:${isCur ? 'default' : 'pointer'}`)}
                >
                  {isCur ? 'Your plan' : `Switch to ${o.name}`}
                </button>
              </div>
            );
          })}
        </div>
        {(state === 'failed' || state === 'cancelled') && (
          <p style={sxw('margin:12px 0 0;font-size:12.5px;color:#7f8ca0')}>
            {state === 'failed' ? 'Sort the payment out first — then you can change the period.' : 'Resume first, then you can change the period.'}
          </p>
        )}
      </section>

      <section style={sxw('margin-top:16px;border-radius:20px;background:#0d1422;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);overflow:hidden')}>
        <div style={sxw('padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.07)')}>
          <h3 style={sxw(H3)}>Invoices</h3>
        </div>
        {/* TODO(api): list invoices inline once payments exposes them. Until
            then the provider's portal is the only place they exist, and a
            fabricated row on a GST document is not a placeholder. */}
        <div style={sxw('padding:22px 20px;text-align:center;font-size:13px;color:#8a96a8')}>
          {state === 'trial'
            ? `No invoices yet. Your first one arrives on ${nextDate ?? 'your first payment'}, by email and here.`
            : 'Your invoices, with GST, are in the billing portal.'}
          {state !== 'trial' && (
            <div style={sxw('margin-top:12px')}>
              <button type="button" disabled={busy === 'portal'} onClick={() => { trackBilling('billing_invoice_downloaded'); portal('portal'); }} style={sxw('min-height:40px;padding:9px 14px;border:0;border-radius:10px;background:rgba(255,255,255,.07);color:#f6f9fc;font-size:12.5px;font-weight:700')}>
                {busy === 'portal' ? 'Opening…' : 'Open invoices'}
              </button>
            </div>
          )}
          {cur && (
            <p style={sxw('margin:10px 0 0;font-size:11.5px;color:#7f8ca0')}>
              {`A ${cur.name.toLowerCase()} invoice of ${inr(cur.price)} includes ₹${gstInside(cur.price).toFixed(2)} GST.`}
            </p>
          )}
        </div>
      </section>

      <section style={sxw('margin-top:16px;display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:20px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);flex-wrap:wrap')}>
        <span style={sxw('flex:1;min-width:240px')}>
          <span style={sxw('display:block;font-size:14px;font-weight:700')}>{cancelCopy.title}</span>
          <span style={sxw('display:block;margin-top:4px;font-size:12.5px;line-height:1.5;color:#8a96a8')}>
            {fill(cancelCopy.body, { date: nextDate ?? 'the end of your period' })}
          </span>
        </span>
        <button
          type="button"
          onClick={() => { if (state === 'cancelled') { resume(); return; } trackBilling('billing_cancel_clicked', { state }); setConfirming(true); }}
          style={sxw(`flex:none;min-height:42px;padding:10px 15px;border:0;border-radius:10px;background:${state === 'cancelled' ? '#00d4aa' : 'transparent'};color:${state === 'cancelled' ? '#02241d' : '#ff8178'};font-size:13px;font-weight:700`)}
        >
          {cancelCopy.btn}
        </button>
      </section>

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
            <div style={sxw('margin-top:18px;display:flex;gap:9px;flex-wrap:wrap')}>
              <button type="button" disabled={busy === 'portal'} onClick={() => portal('portal')} style={sxw('flex:1;min-width:150px;min-height:44px;padding:11px;border:0;border-radius:11px;background:#ef4444;color:#fff;font-size:13px;font-weight:800')}>
                {busy === 'portal' ? 'Opening…' : 'Yes, cancel'}
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
