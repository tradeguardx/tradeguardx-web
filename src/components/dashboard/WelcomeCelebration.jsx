import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isPaidPlan, planDisplayLabel } from '../../lib/planLimits';
import CelebrationOverlay from './CelebrationOverlay';

/**
 * One-shot welcome celebration on first dashboard arrival after signup.
 * Triggered by `?welcome=1` — SignupPage navigates with that flag. Detected
 * once per page-load, then stripped from the URL so a refresh doesn't
 * re-fire.
 *
 * The card itself is CelebrationOverlay, shared with the plan-change
 * celebration: one confetti burst in the codebase, not two.
 */
export default function WelcomeCelebration() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get('welcome') !== '1') return;
    setOpen(true);
    const next = new URLSearchParams(params);
    next.delete('welcome');
    setParams(next, { replace: true });
  }, [params, setParams]);

  // A new signup is on the free trial: full access, but they've paid nothing.
  // Don't congratulate them on a purchase they didn't make — tell them the
  // clock is running and what to do next.
  const isTrial = Boolean(user?.isTrial);
  const trialDaysLeft = user?.trialDaysLeft ?? null;
  const tier = user?.billingPlan || 'free';
  const isPaid = isPaidPlan(tier);
  const planLabel = planDisplayLabel(tier);

  return (
    <CelebrationOverlay
      open={open}
      onClose={() => setOpen(false)}
      kicker={isPaid ? 'Founding member' : null}
      headline={
        isTrial
          ? 'Welcome — your free trial has started'
          : isPaid
            ? "Welcome — you're all set"
            : 'Welcome to TradeGuardX'
      }
      sub={
        isTrial
          ? `You've got everything unlocked${trialDaysLeft != null ? ` for ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}` : ''}. Add a trading account, connect your exchange, and set your rules.`
          : isPaid
            ? `Your ${planLabel} access is unlocked. Start setting up your trading rules and protect your next session.`
            : "You're in. Start by adding a trading account and configuring your first risk rules."
      }
    />
  );
}
