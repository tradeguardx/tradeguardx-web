import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import { clearPendingCheckoutPlan } from '../lib/checkoutIntent';
import { openBillingPortal, updateSubscriptionPaymentMethod } from '../api/paymentsApi';
import { isPaidPlan } from '../lib/planLimits';

const STATUS_INFO = {
  past_due: {
    tone: 'amber',
    label: 'Past due',
    message:
      'Your latest payment failed or is awaiting retry. Update your payment method to keep your paid features — until then, your account is on Free.',
    cta: 'Update payment method',
  },
  canceled: {
    tone: 'rose',
    label: 'Canceled',
    message:
      'Your subscription was canceled. You can resubscribe anytime — your account is on Free until then.',
    cta: 'Resubscribe',
  },
  incomplete: {
    tone: 'amber',
    label: 'Incomplete',
    message:
      'Checkout was started but never completed. Finish the payment to activate your plan — until then, your account is on Free.',
    cta: 'Complete payment',
  },
  expired: {
    tone: 'amber',
    label: 'Free trial ended',
    message:
      'Your free Pro period has ended. Pick a plan to keep Pro features — your account is on Free until then.',
    cta: 'Pick a plan',
  },
};

const TONE_STYLES = {
  amber: {
    border: 'rgba(251,191,36,0.30)',
    background: 'rgba(251,191,36,0.07)',
    color: '#fbbf24',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  rose: {
    border: 'rgba(244,63,94,0.30)',
    background: 'rgba(244,63,94,0.07)',
    color: '#fb7185',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

function StatusBanner({ status, periodEnd, subscribedPlanLabel, onPortalOpen, portalLoading }) {
  const info = STATUS_INFO[status];
  if (!info) return null;
  const tone = TONE_STYLES[info.tone];
  const periodLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-xl border p-4 sm:p-5"
      style={{ borderColor: tone.border, backgroundColor: tone.background }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.badge}`}>
              {info.label}
            </span>
            <span className="text-sm font-semibold" style={{ color: tone.color }}>
              {subscribedPlanLabel} — {info.label.toLowerCase()}
            </span>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
            {info.message}
            {periodLabel && status === 'past_due' && (
              <> Last successful payment covered through <span className="font-medium" style={{ color: 'var(--dash-text-primary)' }}>{periodLabel}</span>.</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onPortalOpen}
          disabled={portalLoading}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {portalLoading ? 'Opening…' : info.cta}
        </button>
      </div>
    </motion.div>
  );
}

function FoundingMemberInfo({ periodEnd, planLabel }) {
  const dateLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-xl border p-4 sm:p-5"
      style={{
        borderColor: 'rgba(0,212,170,0.30)',
        backgroundColor: 'rgba(0,212,170,0.05)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #10b981)', boxShadow: '0 0 14px rgba(0,212,170,0.40)' }}
            aria-hidden
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#07090f">
              <path d="M12 2l2.39 4.84L20 7.7l-3.86 3.76L17.07 17 12 14.27 6.93 17l.93-5.54L4 7.7l5.61-.86L12 2z" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: '#7dffd4' }}>
              Founding member
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
              {planLabel} unlocked free{dateLabel ? ` until ${dateLabel}` : ''}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
              No card on file. When the trial ends, your account reverts to Free unless you subscribe.
            </p>
          </div>
        </div>
        <Link
          to="/pricing"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-hover"
        >
          Subscribe to keep {planLabel}
        </Link>
      </div>
    </motion.div>
  );
}

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscription, subscriptionLoading, user, refetchSubscription, session } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);

  // Derived state (computed before the callbacks so they can depend on it
  // without hitting a temporal-dead-zone ReferenceError).
  const status = user?.subscriptionStatus ?? 'active';
  const isActive = status === 'active';
  const subscribedPlanLabel = user?.subscribedPlanLabel || 'Free';
  const effectivePlanLabel = user?.planLabel || 'Free';
  const subscriptionSource = user?.subscriptionSource || 'free';
  // Founding-member / admin-granted comps have no Dodo customer record, so
  // "Manage billing" and "Update payment method" both fail. Branch UI on this.
  const isAdminComp = subscriptionSource === 'admin';
  // Show "Manage billing" only for users who have a real Dodo subscription —
  // i.e. paid customers. Founding members (admin) and Free users don't.
  const hasBillingRecord = isPaidPlan(user?.subscribedPlanSlug) && subscriptionSource === 'payment';
  const sub = subscription?.subscription;
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const openPortal = useCallback(async () => {
    if (!session?.access_token) {
      toast.error('Not signed in', 'Please sign in again.');
      return;
    }
    setPortalLoading(true);
    try {
      const res = await openBillingPortal({ accessToken: session.access_token });
      const url = res?.data?.portalUrl;
      if (!url) throw new Error('No portal URL returned');
      window.location.href = url;
    } catch (err) {
      const code = err?.details?.error?.code;
      if (code === 'NO_CUSTOMER_RECORD') {
        toast.info('No billing record yet', 'Pick a plan to start your subscription first.');
      } else {
        toast.error('Could not open billing portal', err?.message || 'Please try again.');
      }
      setPortalLoading(false);
    }
  }, [session, toast]);

  const startPaymentUpdate = useCallback(async () => {
    // Expired comp users have no Dodo subscription — go straight to pricing.
    if (status === 'expired') {
      navigate('/pricing');
      return;
    }
    if (!session?.access_token) {
      toast.error('Not signed in', 'Please sign in again.');
      return;
    }
    setPortalLoading(true);
    try {
      const res = await updateSubscriptionPaymentMethod({ accessToken: session.access_token });
      const url = res?.data?.paymentUpdateUrl;
      if (!url) throw new Error('No payment update URL returned');
      window.location.href = url;
    } catch (err) {
      const code = err?.details?.error?.code;
      if (
        code === 'NO_RECOVERABLE_SUBSCRIPTION' ||
        code === 'NO_SUBSCRIPTION' ||
        code === 'NO_CUSTOMER_RECORD'
      ) {
        // No live subscription on Dodo — user needs a fresh checkout.
        toast.info('Subscription needs to be renewed', 'Pick a plan to continue.');
        navigate('/pricing');
        return;
      }
      toast.error('Could not start payment update', err?.message || 'Please try again.');
      setPortalLoading(false);
    }
  }, [session, toast, navigate, status]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      clearPendingCheckoutPlan();
      void refetchSubscription().then(() => {
        toast.success('Welcome aboard', 'Your subscription is updating. If the plan badge still shows Free, wait a few seconds and refresh.');
      });
      setSearchParams({}, { replace: true });
      return;
    }
    if (checkout === 'cancelled') {
      toast.info('Checkout cancelled', 'You can upgrade anytime from Pricing.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refetchSubscription, toast]);

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-[var(--dash-bg-card)] p-6 sm:p-8 shadow-xl"
        style={{ borderColor: 'var(--dash-border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)] mb-2">
          Billing
        </p>
        <h1 className="font-display text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--dash-text-primary)' }}>
          Plan & subscription
        </h1>
        <p className="text-sm text-[var(--dash-text-muted)] mb-8">
          {isAdminComp
            ? `You're on a complimentary ${subscribedPlanLabel} plan as a founding member. No card needed, nothing to cancel — when the trial ends, your account reverts to Free unless you subscribe.`
            : <>Manage your TradeGuardX plan. Payments are processed securely by Dodo Payments. You can update your payment method, view invoices, or <strong>cancel anytime</strong> — your Pro features stay active through the end of your current billing period.</>}
        </p>

        {!subscriptionLoading && isAdminComp && isActive && (
          <FoundingMemberInfo periodEnd={sub?.currentPeriodEnd} planLabel={subscribedPlanLabel} />
        )}

        {!subscriptionLoading && !isActive && (
          <StatusBanner
            status={status}
            periodEnd={sub?.currentPeriodEnd}
            subscribedPlanLabel={subscribedPlanLabel}
            onPortalOpen={startPaymentUpdate}
            portalLoading={portalLoading}
          />
        )}

        <div className="space-y-4 text-sm">
          <div className="flex justify-between gap-4 py-3 border-b" style={{ borderColor: 'var(--dash-border)' }}>
            <span className="text-[var(--dash-text-muted)]">Current access</span>
            <span className="font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
              {subscriptionLoading ? 'Loading…' : effectivePlanLabel}
            </span>
          </div>
          {!isActive && subscribedPlanLabel !== effectivePlanLabel && (
            <div className="flex justify-between gap-4 py-3 border-b" style={{ borderColor: 'var(--dash-border)' }}>
              <span className="text-[var(--dash-text-muted)]">Subscribed plan</span>
              <span className="font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                {subscribedPlanLabel}
              </span>
            </div>
          )}
          {sub?.source === 'payment' && sub?.externalSubscriptionId && (
            <div className="flex justify-between gap-4 py-3 border-b" style={{ borderColor: 'var(--dash-border)' }}>
              <span className="text-[var(--dash-text-muted)]">Billing provider ref.</span>
              <span className="font-mono text-xs text-[var(--dash-text-muted)] truncate max-w-[200px]">
                {sub.externalSubscriptionId}
              </span>
            </div>
          )}
          {periodEnd && (
            <div className="flex justify-between gap-4 py-3 border-b" style={{ borderColor: 'var(--dash-border)' }}>
              <span className="text-[var(--dash-text-muted)]">
                {isAdminComp && isActive
                  ? 'Free trial ends'
                  : isActive
                    ? 'Next renewal'
                    : status === 'past_due'
                      ? 'Last successful period ended'
                      : 'Period ends'}
              </span>
              <span style={{ color: 'var(--dash-text-primary)' }}>{periodEnd}</span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent text-surface-950 font-semibold text-sm hover:bg-accent-hover transition-colors"
          >
            {isAdminComp ? `Subscribe to keep ${subscribedPlanLabel}` : isActive ? 'Change plan' : 'View plans'}
          </Link>
          {hasBillingRecord && (
            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border text-sm transition-colors hover:bg-[var(--dash-bg-card-hover)] disabled:opacity-60"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-primary)' }}
            >
              {portalLoading ? 'Opening…' : 'Manage or cancel subscription'}
            </button>
          )}
          <Link
            to="/dashboard/account"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border text-sm transition-colors hover:bg-[var(--dash-bg-card-hover)]"
            style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-primary)' }}
          >
            Account home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
