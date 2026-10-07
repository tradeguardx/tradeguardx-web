/**
 * How many free days this user is about to be offered at checkout.
 *
 * The server decides the real number (payments-service `trialDaysFor`) and is
 * the only thing Dodo acts on. This mirror exists so the button can say what
 * is about to happen BEFORE it is clicked — "Start 7 days free" is a very
 * different promise from "Pay ₹1,299 now", and discovering which one you got
 * on the Dodo checkout page is not the moment to find out.
 *
 * Every input comes from the server's own access resolution, so the two agree
 * by construction rather than by coincidence. If they ever drift, the server
 * wins and the user gets MORE than the button promised, never less — which is
 * the only direction this is allowed to be wrong in.
 */

export const FULL_TRIAL_DAYS = 7;

/**
 * @param {{ needsMandate?: boolean, isTrial?: boolean, trialAutoRenews?: boolean,
 *           trialDaysLeft?: number|null, access?: string }} user
 * @returns {number} free days this checkout would carry
 */
export function trialDaysOnOffer(user) {
  if (!user) return 0;

  // Never started: the whole window.
  if (user.needsMandate) return FULL_TRIAL_DAYS;

  if (user.isTrial) {
    // Already on a mandate — this is a plan change, not a new trial.
    if (user.trialAutoRenews) return 0;
    // Mid-way through a no-card trial: they carry what is left, so converting
    // today costs them nothing and waiting gains them nothing.
    const left = user.trialDaysLeft;
    if (typeof left !== 'number' || left <= 0) return 0;
    return Math.min(FULL_TRIAL_DAYS, left);
  }

  // Lapsed, cancelled, legacy free, paying: no free days.
  return 0;
}

/** "₹0 today · ₹1,299 on 14 Oct · cancel any time before" */
export function trialOfferLine(days, priceLabel, startsOn) {
  if (days <= 0) return null;
  const when = startsOn ? ` on ${startsOn}` : ` in ${days} day${days === 1 ? '' : 's'}`;
  const amount = priceLabel ? `${priceLabel}` : 'your first payment';
  return `₹0 today · ${amount}${when} · cancel any time before`;
}

/** The date the first debit lands, given today and the free days. */
export function firstChargeDate(days, now = new Date()) {
  if (days <= 0) return null;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
