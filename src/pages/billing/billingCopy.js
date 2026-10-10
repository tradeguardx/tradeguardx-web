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
  trial: { label: 'FREE TRIAL', bg: 'rgba(0,212,170,.14)', fg: '#2fe3bd' },
  active: { label: 'ACTIVE', bg: 'rgba(0,212,170,.14)', fg: '#2fe3bd' },
  failed: { label: 'PAYMENT FAILED', bg: 'rgba(239,68,68,.14)', fg: '#ff8178' },
  cancelled: { label: 'CANCELLED', bg: 'rgba(240,180,41,.14)', fg: '#fbc94f' },
  confirming: { label: 'CONFIRMING PAYMENT', bg: 'rgba(0,212,170,.14)', fg: '#2fe3bd' },
  comp: { label: 'COMPLIMENTARY', bg: 'rgba(177,145,251,.16)', fg: '#c4b0ff' },
  unknown: { label: 'CHECKING YOUR PLAN', bg: 'rgba(255,255,255,.08)', fg: '#c9d2e0' },
  ended: { label: 'PLAN ENDED', bg: 'rgba(239,68,68,.14)', fg: '#ff8178' },
};

export const STATE_SKIN = {
  trial: { line: 'rgba(0,212,170,.28)', orb: 'rgba(0,212,170,.16)' },
  active: { line: 'rgba(255,255,255,.1)', orb: 'rgba(0,212,170,.12)' },
  failed: { line: 'rgba(239,68,68,.4)', orb: 'rgba(239,68,68,.18)' },
  cancelled: { line: 'rgba(240,180,41,.35)', orb: 'rgba(240,180,41,.14)' },
  confirming: { line: 'rgba(0,212,170,.28)', orb: 'rgba(0,212,170,.14)' },
  comp: { line: 'rgba(177,145,251,.3)', orb: 'rgba(124,58,237,.16)' },
  unknown: { line: 'rgba(255,255,255,.14)', orb: 'rgba(255,255,255,.06)' },
  ended: { line: 'rgba(239,68,68,.35)', orb: 'rgba(239,68,68,.12)' },
};

export const BAR_COLOUR = {
  trial: '#00d4aa',
  active: 'rgba(255,255,255,.35)',
  failed: '#ef4444',
  cancelled: '#f0b429',
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
