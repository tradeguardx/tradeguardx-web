import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import { clearPendingCheckoutPlan } from '../lib/checkoutIntent';

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscription, subscriptionLoading, user, refetchSubscription } = useAuth();
  const toast = useToast();

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

  const planLabel = user?.planLabel || 'Free';
  const sub = subscription?.subscription;
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

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
          Manage your TradeGuardX plan. Payments are processed securely by Dodo Payments.
        </p>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between gap-4 py-3 border-b" style={{ borderColor: 'var(--dash-border)' }}>
            <span className="text-[var(--dash-text-muted)]">Current plan</span>
            <span className="font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
              {subscriptionLoading ? 'Loading…' : planLabel}
            </span>
          </div>
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
              <span className="text-[var(--dash-text-muted)]">Next renewal</span>
              <span style={{ color: 'var(--dash-text-primary)' }}>{periodEnd}</span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent text-surface-950 font-semibold text-sm hover:bg-accent-hover transition-colors"
          >
            Change plan
          </Link>
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
