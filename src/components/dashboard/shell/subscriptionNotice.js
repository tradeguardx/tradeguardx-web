/**
 * The one sentence the dashboard owes someone about their subscription.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A FUNCTION AND NOT A SECOND BANNER.
 *
 * There used to be two full-width bands at the top of the dashboard: the
 * guard band in the header and the trial banner at the top of the page. Same
 * shape, same size, stacked — so "No rules are switched on" and "Cancelled,
 * access until 15 Oct" read as two competing alarms, and the eye had to work
 * out which one to act on.
 *
 * They answer different questions — is the guard on, and what is happening to
 * my plan — but only one of those is urgent at a time. So the guard leads
 * (nothing is being enforced RIGHT NOW) and this rides underneath it as a
 * quieter line. With no guard problem, this becomes the band itself.
 * ──────────────────────────────────────────────────────────────────────────
 */

/** "14 Oct" — short, unambiguous, and the same shape everywhere. */
export function fmtDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * @returns {{tone:string,strong:string,text:string,cta:string,to:string}|null}
 */
export function subscriptionNotice(user) {
  /* Nothing is said from an unloaded state. "Cancelled" or "set up payment"
     flashed at a paying customer is the mistake worth most here. */
  if (!user?.isTrial) return null;

  const days = user.trialDaysLeft;
  const left =
    days == null ? 'Your free trial is active' : days <= 0 ? 'Your trial ends today' : `${days} day${days === 1 ? '' : 's'} left`;
  const on = fmtDay(user.trialEndsAt);

  /*
   * Cancelled, but the window they were promised is still running. The band
   * must stop naming a payment date — the whole point of what they just did
   * is that there will not be one.
   */
  if (user.subscriptionCanceled) {
    return {
      tone: 'amber',
      strong: 'Cancelled.',
      text: on ? `Your access runs until ${on}. You won’t be charged.` : 'Your access runs to the end of the trial. You won’t be charged.',
      cta: 'Resubscribe',
      to: '/dashboard/account/billing',
    };
  }

  /*
   * TWO TRIALS, TWO SENTENCES. A mandate-backed trial converts — there is a
   * date on which we take money, which is the single thing this person needs
   * and the thing they will be angry about if they find out afterwards. A
   * no-card trial simply stops.
   */
  if (user.trialAutoRenews) {
    return {
      tone: 'mint',
      strong: 'Free trial — everything unlocked.',
      text: on ? `${left}. Your first payment is on ${on}. Cancel before then and you won’t be charged.` : `${left}. Cancel before it ends and you won’t be charged.`,
      cta: 'Manage',
      to: '/dashboard/account/billing',
    };
  }

  return {
    tone: 'mint',
    strong: 'Free trial — everything unlocked.',
    /* The carried-days rule makes this honest: setting up autopay now keeps
       the days they have left, so there is nothing to gain by waiting. */
    text: `${left}. Set up payment to keep access when it ends — you keep the days you have left.`,
    cta: 'Set up',
    /* Not /pricing. That is the public marketing page, and sending a signed-in
       trialist there drops them out of the product to re-choose a plan they
       are already on — while the billing page's own CTA went to the in-product
       step. Two buttons for one job must not land in two places. */
    to: '/dashboard/activate',
  };
}
