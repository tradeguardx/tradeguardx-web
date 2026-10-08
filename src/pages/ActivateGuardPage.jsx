import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BillingStep from '../components/dashboard/billing/BillingStep';
import { useSetupStep } from '../hooks/useSetupStep';

/**
 * The billing step as a destination of its own, for anyone who left the setup
 * flow and came back. The screen itself is BillingStep, the same component
 * step 4 renders — one implementation, two entrances, so a price can never be
 * right in one place and stale in the other.
 *
 * This page owns only the routing decisions: who should not be here, and
 * where they go instead.
 */
export default function ActivateGuardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { step, loading: stepLoading } = useSetupStep();

  /*
   * Already has a payment method — came back to this URL, or a webhook landed
   * while they were reading. Nothing to sell; send them to the guard.
   *
   * This tested `isTrial`, which is true for a legacy no-card trial too. So
   * the one group with a live prompt to attach a card was bounced to the
   * guard every time they followed it: the button said "Set up billing" and
   * the product answered with the Live guard page. There was no route to the
   * thing we were asking them for.
   */
  const hasMandate =
    user?.access === 'active' || Boolean(user?.trialAutoRenews) || Boolean(user?.subscriptionCanceled);
  useEffect(() => {
    if (user?.planKnown && hasMandate) {
      navigate('/dashboard/live', { replace: true });
    }
  }, [user?.planKnown, hasMandate, navigate]);

  /*
   * NOTHING TO PROTECT YET — DO NOT ASK FOR MONEY.
   *
   * Reached directly or from a stale link before there is an account at all.
   * Without this the page renders a price with no balance on it, which is
   * both a weaker ask and a dishonest one: charging to guard an account that
   * does not exist.
   *
   * The bar is an ACCOUNT, not a key. It used to send anyone short of the
   * `pay` step away, which made this page unreachable for a trialist with
   * accounts and no key yet — we prompted them to attach a card and then
   * answered with the key page. A missing key makes the ask weaker, because
   * their balance cannot be named; it does not make it dishonest, and it is
   * not a reason to refuse someone trying to keep the trial they are on.
   */
  useEffect(() => {
    if (stepLoading || !step) return;
    if (step.key === 'account') navigate(step.to, { replace: true });
  }, [stepLoading, step, navigate]);

  if (stepLoading || !step || step.key === 'account') return null;

  return <BillingStep />;
}
