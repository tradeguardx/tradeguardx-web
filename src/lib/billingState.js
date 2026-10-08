/**
 * Which of the four billing states an account is in.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * DERIVED FROM THE SUBSCRIPTION, NEVER FROM A FLAG SOMEONE SET.
 *
 * The page it drives says things like "nothing is charged until the 15th" and
 * "your guard keeps running until the 22nd". Those are promises about money,
 * so the state behind them has to come from the row the webhook writes rather
 * than from anything the client decided for itself.
 *
 * Pure, so every branch is an assertion instead of something you find out
 * from a customer who was told the wrong one.
 * ──────────────────────────────────────────────────────────────────────────
 */

/**
 * @param {{access?:string, trial?:{autoRenews?:boolean}|null, canceled?:boolean,
 *          subscription?:{status?:string, source?:string}|null}} me
 * @returns {'trial'|'active'|'failed'|'cancelled'|'none'}
 */
export function billingStateOf(me) {
  const status = me?.subscription?.status ?? null;
  const source = me?.subscription?.source ?? null;

  /* A failed charge is `past_due` whatever else is true, and it outranks the
     rest: someone whose bank declined needs to see that before they see a
     renewal date. */
  if (source === 'payment' && status === 'past_due') return 'failed';

  if (me?.canceled) return 'cancelled';

  /* A mandate-backed trial only. A legacy no-card trial has no card saved and
     no charge coming, so none of this page's copy is true for it. */
  if (me?.access === 'trial' && me?.trial?.autoRenews) return 'trial';

  if (me?.access === 'active') return 'active';

  return 'none';
}

/** Whole days from `now` to `at`, never negative. */
export function daysUntil(at, now = new Date()) {
  if (!at) return null;
  const end = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

/**
 * GST already inside an inclusive price: amount × 18 ÷ 118.
 *
 * Indian prices are quoted inclusive, so this is the tax a customer can claim
 * back, not tax added on top. Two decimals because an invoice is a document
 * someone hands to an accountant.
 */
export function gstInside(amountInclusive, rate = 18) {
  if (!Number.isFinite(amountInclusive)) return null;
  return (amountInclusive * rate) / (100 + rate);
}

/** What a longer interval saves against paying monthly for the same span. */
export function savingVsMonthly(option, monthlyPrice) {
  if (!Number.isFinite(option?.price) || !Number.isFinite(monthlyPrice)) return 0;
  const months = { monthly: 1, quarterly: 3, yearly: 12 }[option.id] ?? 1;
  return Math.max(0, Math.round(monthlyPrice * months - option.price));
}
