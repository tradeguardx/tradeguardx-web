/**
 * What is honestly promisable at the moment someone cancels.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * TWO THINGS WE WERE SAYING THAT WE CANNOT GUARANTEE.
 *
 * 1. "You will not be charged." Indian UPI recurring debits are initiated
 *    inside a processing window — roughly 48 hours — before the billing date.
 *    Cancel on day two of a trial and that sentence is simply true. Cancel the
 *    morning of the charge and the debit may already be in flight, and no
 *    merchant-side cancellation stops it. Saying it flatly to everyone means
 *    saying it falsely to the people most likely to be watching their bank.
 *
 * 2. Silence about the mandate. Cancelling the subscription and revoking the
 *    bank mandate are separate things. Dodo exposes no API to revoke one — the
 *    SDK has no payment-method resource at all — and its documentation does
 *    not state that ending a subscription revokes it with the PSP. A customer
 *    who cancels, then sees UPI Autopay still listed in their bank app,
 *    reasonably concludes the cancellation failed.
 *
 * Neither is a reason to frighten someone cancelling on day two. The window
 * decides which sentence they get.
 * ──────────────────────────────────────────────────────────────────────────
 */

/** Indian UPI recurring debits are initiated up to ~48h before the date. */
export const UPI_DEBIT_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * True when a debit for the upcoming billing date may already have been
 * initiated, so "you will not be charged" cannot be promised outright.
 *
 * Unknown dates return false: this adds a caveat, and a caveat shown on a
 * guess is its own kind of wrong.
 */
export function debitMayBeInFlight(nextBillingAt, now = new Date()) {
  if (!nextBillingAt) return false;
  const at = nextBillingAt instanceof Date ? nextBillingAt : new Date(nextBillingAt);
  if (Number.isNaN(at.getTime())) return false;
  const ms = at.getTime() - now.getTime();
  /* Already past is not "in flight" — that charge has landed or it has not,
     and either way this sentence is not the place to speculate. */
  return ms > 0 && ms <= UPI_DEBIT_WINDOW_MS;
}

/** The sentence about the bank mandate. Always true, so always shown. */
export const MANDATE_NOTE =
  'Cancelling here stops the renewals. It does not remove the UPI Autopay mandate from your bank — you can do that in the AutoPay or mandates section of the app where you approved it.';

/** The extra sentence for someone cancelling inside the debit window. */
export const IN_FLIGHT_NOTE =
  'Your renewal date is close enough that the payment may already be processing. If it is, it may still go through and we will refund it.';
