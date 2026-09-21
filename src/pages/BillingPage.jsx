import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { clearPendingCheckoutPlan } from '../lib/checkoutIntent';
import { openBillingPortal, updateSubscriptionPaymentMethod, createCheckoutSession } from '../api/paymentsApi';
import { getPricingPlans } from '../api/pricingApi';
import { isPaidPlan, planTierRank, maxTradingAccountsForPlan, journalPeriodBadgeLabel } from '../lib/planLimits';
import { sx } from '../components/dashboard/shell/sx';

/**
 * Plan & billing — transcribed from the reference (lines 1984–2029).
 * Usage rows are derived from real counts; plan cards come from the pricing
 * API. Portal, payment-method update and status handling are unchanged from
 * the previous page — they route to the same endpoints.
 */

const STATUS_INFO = {
  past_due: { tone: 'amber', label: 'Past due', message: 'Your latest payment failed or is awaiting retry. Update your payment method to keep your paid features — until then, your account is on Free.', cta: 'Update payment method' },
  canceled: { tone: 'red', label: 'Canceled', message: 'Your subscription was canceled. You can resubscribe anytime — your account is on Free until then.', cta: 'Resubscribe' },
  incomplete: { tone: 'amber', label: 'Incomplete', message: 'Checkout was started but never completed. Finish the payment to activate your plan — until then, your account is on Free.', cta: 'Complete payment' },
  expired: { tone: 'amber', label: 'Free trial ended', message: 'Your free Pro period has ended. Pick a plan to keep Pro features — your account is on Free until then.', cta: 'Pick a plan' },
};

function fmtDate(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }); } catch { return null; }
}

export default function BillingPage() {
  const { session, user, subscription, refetchSubscription } = useAuth();
  const { accounts } = useTradingAccounts();
  const { selected: g } = useGuard();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(null);

  useEffect(() => {
    if (params.get('checkout') === 'success') { clearPendingCheckoutPlan(); refetchSubscription?.(); }
  }, [params, refetchSubscription]);
  useEffect(() => { getPricingPlans().then(setPlans).catch(() => setPlans([])); }, []);

  const status = user?.subscriptionStatus;
  const info = user?.isExpired ? STATUS_INFO.expired : STATUS_INFO[status];
  const subscribedLabel = user?.subscribedPlanLabel || 'Free';
  const source = user?.subscriptionSource || 'free';
  const hasBillingRecord = isPaidPlan(user?.subscribedPlanSlug) && source === 'payment';
  const isAdminComp = source === 'admin';
  const periodEnd = fmtDate(subscription?.subscription?.currentPeriodEnd ?? user?.currentPeriodEnd);
  const interval = subscription?.subscription?.billingInterval || 'monthly';
  const billedLabel = interval === 'yearly' ? 'billed yearly' : interval === 'quarterly' ? 'billed quarterly' : 'billed monthly';

  const sub = user?.isTrial
    ? `You are on a free trial with everything unlocked${user?.trialDaysLeft != null ? ` — ${user.trialDaysLeft} day${user.trialDaysLeft === 1 ? '' : 's'} left` : ''}. Pick a plan to keep it after that.`
    : isAdminComp
      ? `You are on a complimentary ${subscribedLabel} plan as a founding member. No card needed, nothing to cancel.`
      : hasBillingRecord
        ? `You are on ${subscribedLabel}, ${billedLabel}${periodEnd ? `, ${interval === 'monthly' ? 'next charge' : 'renews'} ${periodEnd}` : ''}. Prices include 18% GST.`
        : 'You are on Free. Prices include 18% GST.';

  const openPortal = useCallback(async () => {
    if (!session?.access_token) { toast.error('Not signed in', 'Please sign in again.'); return; }
    setPortalLoading(true);
    try {
      const res = await openBillingPortal({ accessToken: session.access_token });
      const url = res?.data?.portalUrl;
      if (!url) throw new Error('No portal URL returned');
      window.location.href = url;
    } catch (err) {
      const code = err?.details?.error?.code;
      if (code === 'NO_CUSTOMER_RECORD') toast.info('No billing record yet', 'Pick a plan to start your subscription first.');
      else toast.error('Could not open billing portal', err?.message || 'Please try again.');
      setPortalLoading(false);
    }
  }, [session, toast]);

  const startPaymentUpdate = useCallback(async () => {
    if (user?.isExpired || status === 'canceled') { navigate('/pricing'); return; }
    if (!session?.access_token) { toast.error('Not signed in', 'Please sign in again.'); return; }
    setPortalLoading(true);
    try {
      const res = await updateSubscriptionPaymentMethod({ accessToken: session.access_token });
      const url = res?.data?.paymentUpdateUrl;
      if (!url) throw new Error('No payment update URL returned');
      window.location.href = url;
    } catch (err) {
      const code = err?.details?.error?.code;
      if (code === 'NO_RECOVERABLE_SUBSCRIPTION' || code === 'NO_SUBSCRIPTION' || code === 'NO_CUSTOMER_RECORD') {
        toast.info('Subscription needs to be renewed', 'Pick a plan to continue.'); navigate('/pricing'); return;
      }
      toast.error('Could not start payment update', err?.message || 'Please try again.');
      setPortalLoading(false);
    }
  }, [session, status, user?.isExpired, navigate, toast]);

  const maxAccounts = maxTradingAccountsForPlan(user?.plan);
  const usage = [
    { k: 'Rules on', v: `${g.rulesOn} of ${g.rulesTotal || '—'}`, bar: g.rulesTotal ? `${Math.round((g.rulesOn / g.rulesTotal) * 100)}%` : '0%', fg: 'var(--ink)' },
    { k: 'Trading accounts', v: maxAccounts == null ? `${accounts.length}` : `${accounts.length} of ${maxAccounts}`, bar: maxAccounts == null ? '20%' : `${Math.min(100, (accounts.length / maxAccounts) * 100)}%`, fg: maxAccounts != null && accounts.length >= maxAccounts ? 'var(--amber)' : 'var(--ink)' },
    { k: 'Journal history', v: journalPeriodBadgeLabel(user?.plan), bar: '100%', fg: 'var(--mint)' },
  ];

  const myRank = planTierRank(user?.billingPlan ?? user?.subscribedPlanSlug);
  const paying = hasBillingRecord;
  const currentInterval = subscription?.subscription?.billingInterval || 'monthly';
  const onPro = myRank >= 1 && !user?.isTrial;

  const startCheckout = async (interval) => {
    if (!session?.access_token) { toast.error('Not signed in', 'Please sign in again.'); return; }
    setCheckoutKey(interval);
    try {
      const res = await createCheckoutSession({ accessToken: session.access_token, planSlug: 'pro', interval });
      const url = res?.data?.checkoutUrl;
      if (!url) throw new Error('No checkout URL returned');
      window.location.href = url;
    } catch (err) {
      toast.error('Checkout failed', err?.message || 'Please try again.');
      setCheckoutKey(null);
    }
  };

  const pro = plans.find((p) => planTierRank(String(p.slug || '').toLowerCase()) === 1);
  const proFeats = (pro?.features?.cardFeatures ?? []).map((f) => f.text).slice(0, 4);
  const LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
  const PER = { monthly: 'per month', quarterly: 'per quarter', yearly: 'per year' };
  // One card per Pro interval. Free is described once, below, as the fallback.
  const cards = (pro?.intervals ?? []).filter((iv) => iv.price > 0).map((iv) => {
    const isCurrent = onPro && (paying ? iv.interval === currentInterval : iv.interval === 'monthly');
    let cta = 'Start Pro'; let action = () => startCheckout(iv.interval); let tone = 'solid';
    if (isCurrent) { cta = ''; }
    else if (onPro && !paying && iv.interval === 'monthly') { cta = ''; }
    else if (onPro && paying) { cta = `Switch to ${LABEL[iv.interval].toLowerCase()}`; action = openPortal; tone = 'ghost'; }
    else if (onPro && !paying) { cta = `Start Pro — ${LABEL[iv.interval].toLowerCase()}`; }
    return { key: iv.interval, name: `Pro · ${LABEL[iv.interval]}`, price: `₹${iv.price.toLocaleString('en-IN')}`, per: PER[iv.interval],
      perMonth: iv.interval === 'monthly' ? null : `₹${iv.perMonth.toLocaleString('en-IN')}/mo · save ${iv.savingsPct}%`,
      state: isCurrent ? (paying ? 'Current plan' : 'Complimentary') : iv.interval === 'yearly' ? 'Best value' : '', current: isCurrent, cta, action, tone, currentLabel: paying ? 'Current plan ✓' : 'Your plan — complimentary ✓' };
  });

  return (
    <div style={sx('max-width:980px')}>
      <div style={sx('margin-bottom:16px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Plan &amp; billing</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>{sub}</p>
      </div>

      {info && !isAdminComp && (
        <div style={sx('display:flex;align-items:flex-start;gap:12px;padding:15px 18px;margin-bottom:16px;border-radius:13px', { border: `1px solid var(--${info.tone}-line)`, background: `var(--${info.tone}-tint)` })}>
          <div style={sx('flex:1;min-width:0')}>
            <div style={sx('font-size:13.5px;font-weight:700', { color: `var(--${info.tone})` })}>{subscribedLabel} — {info.label.toLowerCase()}</div>
            <p style={sx('margin:4px 0 0;font-size:12.5px;color:var(--ink-2);max-width:92ch')}>{info.message}</p>
          </div>
          <button type="button" disabled={portalLoading} onClick={startPaymentUpdate} style={sx('flex:none;padding:8px 13px;border-radius:8px;background:var(--surface);font-size:12.5px;font-weight:700', { border: `1px solid var(--${info.tone}-line)`, color: `var(--${info.tone})` })}>{portalLoading ? 'Opening…' : info.cta}</button>
        </div>
      )}

      <section style={sx('margin-bottom:18px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}>
          <h3 style={sx("margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em")}>What you are using</h3>
        </div>
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))')}>
          {usage.map((u) => (
            <div key={u.k} style={sx('padding:17px 19px;border-right:1px solid var(--line)')}>
              <div style={sx('font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>{u.k}</div>
              <div style={sx("margin-top:8px;font:600 19px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: u.fg })}>{u.v}</div>
              <div style={sx('margin-top:11px;height:4px;border-radius:999px;background:var(--surface-3);overflow:hidden')}><div style={sx('height:100%;border-radius:999px', { background: u.fg, width: u.bar })} /></div>
            </div>
          ))}
        </div>
      </section>

      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:14px')}>
        {cards.map((p) => (
          <section key={p.key} style={sx('display:flex;flex-direction:column;padding:19px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card)', p.current ? { borderColor: 'var(--mint-line)', background: 'var(--mint-tint)' } : {})}>
            <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:12px;flex-wrap:wrap')}>
              <span style={sx("font:600 16px/1 'Space Grotesk',sans-serif")}>{p.name}</span>
              {p.state && <span style={sx('font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase', { color: p.current ? 'var(--mint)' : 'var(--amber)' })}>{p.state}</span>}
            </div>
            <div style={sx("font:700 28px/1 'Space Grotesk',sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums")}>{p.price}</div>
            <div style={sx('font-size:12px;color:var(--ink-3);margin-top:5px')}>{p.per}{p.perMonth ? ` · ${p.perMonth}` : ''}</div>
            <div style={sx('margin:15px 0;height:1px;background:var(--line)')} />
            <div style={sx('font-size:12.5px;color:var(--ink-2);line-height:1.9;flex:1')}>
              {proFeats.map((f) => <div key={f}>{f}</div>)}
            </div>
            {p.cta ? (
              <button type="button" disabled={portalLoading || checkoutKey != null} onClick={p.action} style={sx('width:100%;margin-top:15px;padding:10px;border-radius:9px;font-size:12.5px;font-weight:700', p.tone === 'solid' ? { border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--surface)' } : { border: '1px solid var(--line-strong)', background: 'var(--surface-2)', color: 'var(--ink)' })}>{checkoutKey === p.key ? 'Opening checkout…' : p.cta}</button>
            ) : (
              <div style={sx('margin-top:15px;padding:10px;border:1px solid var(--mint-line);border-radius:9px;text-align:center;font-size:12.5px;font-weight:700;color:var(--mint)')}>{p.currentLabel}</div>
            )}
          </section>
        ))}
      </div>

      <p style={sx('margin:14px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-3);max-width:80ch')}>
        {paying ? 'Switching interval goes through the billing portal, where the unused part of your current period is credited against the new one.' : 'Free stays available if you stop paying: one trading account, every rule, seven days of journal. Nothing is deleted.'}
      </p>
    </div>
  );
}
