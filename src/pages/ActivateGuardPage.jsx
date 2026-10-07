import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ActivateGuardCard from '../components/dashboard/ActivateGuardCard';
import { useSetupStep } from '../hooks/useSetupStep';

/**
 * The paywall as a destination of its own, for anyone who left the wizard and
 * came back. The ask itself lives in ActivateGuardCard, which the add-venue
 * wizard renders as its billing stage — one implementation, two entrances.
 *
 * This page owns only the routing decisions: who should not be here, and
 * where they go instead.
 */
export default function ActivateGuardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { step, loading: stepLoading } = useSetupStep();

  /* Already entitled — came back to this URL, or a webhook landed while they
     were reading. Nothing to sell; send them to the guard. */
  useEffect(() => {
    if (user?.planKnown && (user.isTrial || user.access === 'active')) {
      navigate('/dashboard/live', { replace: true });
    }
  }, [user?.planKnown, user?.isTrial, user?.access, navigate]);

  /*
   * NOTHING TO PROTECT YET — DO NOT ASK FOR MONEY.
   *
   * Reached directly or from a stale link before there is an account or a
   * connected key. Without this the page renders a price with no balance on
   * it, which is both a weaker ask and a dishonest one: charging to guard an
   * account that does not exist. Send them to the step they are actually on.
   */
  useEffect(() => {
    if (stepLoading || !step) return;
    if (step.key !== 'pay') navigate(step.to, { replace: true });
  }, [stepLoading, step, navigate]);

  if (stepLoading || step?.key !== 'pay') return null;

  return (
    <div className="mx-auto w-full max-w-lg py-6">
      <ActivateGuardCard onLater={() => navigate('/dashboard/overview')} />
    </div>
  );
}
