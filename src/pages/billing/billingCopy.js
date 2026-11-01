/**
 * Every string the Plan & billing hero says, per state.
 *
 * Copied from reference/plan-billing.reference.dc.html. Kept apart from the
 * component because these are promises about money — when one has to change,
 * it should be changed deliberately and in one place, not found inline in the
 * middle of a layout.
 *
 * Dates and amounts are placeholders filled from the API at render; nothing
 * here hard-codes one.
 */

export const STATE_CHIP = {
  trial: { label: 'FREE TRIAL', bg: 'var(--mint-tint)', fg: 'var(--mint)' },
  active: { label: 'ACTIVE', bg: 'var(--mint-tint)', fg: 'var(--mint)' },
  failed: { label: 'PAYMENT FAILED', bg: 'var(--red-tint)', fg: 'var(--red)' },
  cancelled: { label: 'CANCELLED', bg: 'var(--amber-tint)', fg: 'var(--amber)' },
  confirming: { label: 'CONFIRMING PAYMENT', bg: 'var(--mint-tint)', fg: 'var(--mint)' },
  comp: { label: 'COMPLIMENTARY', bg: 'color-mix(in srgb, var(--violet) 16%, transparent)', fg: 'var(--violet)' },
  unknown: { label: 'CHECKING YOUR PLAN', bg: 'var(--surface-3)', fg: 'var(--ink-2)' },
  ended: { label: 'PLAN ENDED', bg: 'var(--red-tint)', fg: 'var(--red)' },
};

export const STATE_SKIN = {
  trial: { line: 'var(--mint-line)', orb: 'color-mix(in srgb, var(--mint-solid) 16%, transparent)' },
  active: { line: 'var(--line-strong)', orb: 'var(--mint-tint)' },
  failed: { line: 'var(--red-line)', orb: 'color-mix(in srgb, var(--red-solid) 18%, transparent)' },
  cancelled: { line: 'var(--amber-line)', orb: 'color-mix(in srgb, var(--amber-solid) 14%, transparent)' },
  confirming: { line: 'var(--mint-line)', orb: 'color-mix(in srgb, var(--mint-solid) 14%, transparent)' },
  comp: { line: 'color-mix(in srgb, var(--violet) 30%, transparent)', orb: 'color-mix(in srgb, var(--violet) 16%, transparent)' },
  unknown: { line: 'var(--line-strong)', orb: 'color-mix(in srgb, var(--ink) 6%, transparent)' },
  ended: { line: 'var(--red-line)', orb: 'var(--red-tint)' },
};

export const BAR_COLOUR = {
  trial: 'var(--mint-solid)',
  active: 'color-mix(in srgb, var(--ink) 35%, transparent)',
  failed: 'var(--red-solid)',
  cancelled: 'var(--amber-solid)',
};

/** `{date}` and `{price}` are replaced with real values at render. */
export const BODY = {
  trial:
    'Everything is unlocked. Your card is saved, and nothing is charged until {date}. Cancel before then and you pay nothing.',
  active: 'Paid and protected. Your guard runs on our servers whether or not the app is open.',
  failed:
    /* There is no dunning grace by design — a declined renewal expires access
       at once. This used to promise the guard kept running, which was both
       untrue and the most dangerous direction to be wrong in: someone reads
       it, trades, and is enforced by nothing. */
    'Your bank declined the payment, so your guard is off and nothing is protecting your accounts. Pay now and it switches straight back on.',
  cancelled:
    'You keep full protection until {date}. After that the guard switches off and your rules stop being enforced.',
  confirming:
    'We’re confirming your first payment with your bank. Your guard stays on meanwhile. This usually takes a few minutes, and never more than 3 days.',
  comp: 'Your Pro plan is complimentary. Everything is unlocked and your guard is on. Nothing is charged.',
  unknown: 'We couldn’t load your plan details. Your guard stays on while we sort it out. If this lasts more than a day, contact support.',
};

/** Plan ended, by what ended it. `{price}` is the amount to pay. */
export const ENDED_BODY = {
  trial: 'Your free trial has ended, so nothing is protecting your accounts. Your rules, trades and tax history are saved. Subscribe and the guard switches straight back on.',
  legacyFree: 'Your account has no active plan, so nothing is protecting your accounts. Your rules, trades and tax history are saved. Subscribe and the guard switches on straight away.',
  pro: 'Your plan has ended, so nothing is protecting your accounts. Your rules, trades and tax history are saved. Subscribe and the guard switches straight back on.',
  unpaid: 'Every payment retry failed, so your Pro plan has closed and nothing is protecting your accounts. Pay {price} and everything switches back on, rules as you left them.',
};

export const NEXT_LABEL = {
  trial: 'FIRST PAYMENT',
  active: 'NEXT PAYMENT',
  failed: 'AMOUNT DUE',
  cancelled: 'NEXT PAYMENT',
  confirming: 'FIRST PAYMENT',
  comp: 'NEXT PAYMENT',
  unknown: 'NEXT PAYMENT',
  ended: 'NEXT PAYMENT',
};

export const CANCEL_COPY = {
  trial: {
    title: 'Cancel free trial',
    /* Cancelling ends the subscription at the end of the period, not on the
       spot — so the days already promised are kept. Saying "switches off right
       away" was describing a cancellation we deliberately do not perform, and
       it talks people out of a cancellation they are entitled to. */
    // ⚠ The spec's override of the reference ("switches off right away").
    body: 'You won’t be charged. Your guard stays on until {date}, then switches off.',
    btn: 'Cancel trial',
  },
  active: {
    title: 'Cancel subscription',
    body: 'You keep protection until {date}. After that the guard switches off. Your journal and tax history stay.',
    btn: 'Cancel plan',
  },
  failed: {
    title: 'Cancel subscription',
    /* There is no paid period left to keep: cancelling here closes the
       subscription now and stops the retries (→ pe). */
    body: 'We stop retrying the payment. Your guard stays off; your rules, journal and tax history are kept.',
    btn: 'Cancel plan',
  },
  cancelled: {
    title: 'Changed your mind?',
    body: 'Resume and nothing changes: same plan, same card, no gap in protection.',
    btn: 'Resume Pro',
  },
  comp: {
    title: 'Questions about your plan?',
    body: 'Complimentary plans are managed by our team.',
    btn: 'Contact support',
  },
  unknown: {
    title: 'Questions about your plan?',
    body: 'Our team can check your plan and fix it.',
    btn: 'Contact support',
  },
  ended: {
    title: 'Your data is safe',
    body: 'Rules, trades, journal and tax history are kept. There is no second free trial; subscribing restarts protection immediately.',
    btn: 'Subscribe',
  },
};

export const PLAN_NOTE = {
  monthly: 'Most flexible. Cancel any month.',
  quarterly: '₹1,100 a month. Billed every 3 months.',
  yearly: '₹750 a month. Billed once a year.',
};

export const PER = { monthly: 'per month', quarterly: 'per quarter', yearly: 'per year' };
export const EVERY = { monthly: 'every month', quarterly: 'every 3 months', yearly: 'every year' };
