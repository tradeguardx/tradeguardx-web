import { subscriptionNotice } from './subscriptionNotice';

/*
 * The shell's two lifecycle decisions, kept out of the component files so
 * those export components only (fast refresh) and so both can be tested
 * without rendering anything.
 */

/**
 * Which pill to show, in the lifecycle spec's precedence (§5):
 *   1. switching moment                       — TODO(api): guard_applied_at
 *   2. an unprotected plan state (pf te pe pg lf), whatever the key says
 *   3. the selected account's own condition (key, lock, rules)
 *   4. protected — the plan's wording where it has one (tc, pc, tx)
 */
export function pillOf(life, describe, guard) {
  // Setup and unprotected states speak for themselves, whatever the key says.
  if ((life?.unprotected || life?.setup) && life.pill) return { pill: life.pill, tone: life.tone, title: life.band?.title ?? '' };
  if (life?.pill && guard === 'armed') return { pill: life.pill, tone: life.tone, title: life.hero?.title ?? '' };
  return { pill: describe.pill, tone: describe.tone, title: describe.title };
}

/**
 * The plan's line in the band, from the lifecycle state.
 *
 * Unknown state (older API, not loaded) keeps the previous behaviour. The old
 * no-card trial keeps its "set up billing" prompt: nothing will be charged,
 * so the spec's charge notice would be false, and the decision was to prompt
 * those users rather than block them.
 */
export function planNoticeOf(life, user) {
  if (!life) return subscriptionNotice(user);
  if (life.band && !life.unprotected && !life.setup) {
    const b = life.band;
    return { tone: b.tone, strong: b.title, text: b.body, short: `${b.title} ${b.body}`, cta: b.cta, to: b.to, dismissible: Boolean(b.dismissible) };
  }
  const noCardTrial = user?.isTrial && !user?.trialAutoRenews && !user?.subscriptionCanceled;
  if (noCardTrial && (life.id === 't1' || life.id === 't6')) return subscriptionNotice(user);
  return null;
}

