/**
 * THE ACCOUNT LIFECYCLE, AS THE SHELL SHOWS IT.
 *
 * One rule above all: never say "protected" when the engine is not acting,
 * and never say "not protected" when it is. So this file never decides
 * protection. subscription-service does (lifecycleState.ts), and returns the
 * plan state and `protected` on /me; the risk engine is tested against the
 * same table. This file only turns that state into words, tones and locks.
 *
 * The strings are the lifecycle spec's (design handoff 10,
 * reference/01_states.data.js). Where the spec's copy names a fact the API
 * does not give us yet — the amount due, the card, the retry dates — the
 * sentence is cut back to what we know rather than filled with a guess.
 * Each such place is marked TODO(api).
 *
 * Setup states (s0 / s2 / s3) are the server's `none`, split here by setup
 * progress. Their pill, band and hero stay with the existing setup guidance
 * in guard.js, which already names the one missing step; this file adds only
 * what the spec adds for them: locks, the DRAFT badge and the disabled kill
 * switch.
 */

/** The engine is enforcing in these. Mirrors lifecycleState.ts PROTECTED. */
export const PROTECTED_STATES = ['t1', 't6', 'tc', 'tx', 'p', 'pc', 'ac', 'nr'];

/** A key exists and nothing is enforced: the red, non-dismissible states. */
export const UNPROTECTED_STATES = ['pf', 'te', 'pe', 'pg', 'lf'];

export const SETUP_STATES = ['s0', 's2', 's3'];

const BILLING = '/dashboard/account/billing';

/** Route ids the spec locks, to the dashboard paths they cover. */
export const LOCK_ROUTES = {
  live: ['/dashboard/live'],
  journal: ['/dashboard/journal'],
  trades: ['/dashboard/trades'],
  tax: ['/dashboard/tax'],
};

export function lockedRouteOf(pathname, locks) {
  for (const id of locks ?? []) {
    if ((LOCK_ROUTES[id] ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`))) return id;
  }
  return null;
}

/**
 * Which of the spec's states this user is in.
 *
 * Null while the plan state is unknown (not loaded, or an older API). The
 * callers then leave the existing shell exactly as it was: no lock, no red
 * band, nothing claimed — an unloaded state must never read as unprotected.
 */
export function lifecycleIdOf({ planState, accountsCount, keyConnected }) {
  if (!planState) return null;
  if (planState !== 'none') return planState;
  if (!accountsCount) return 's0';
  return keyConnected ? 's3' : 's2';
}

function day(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

const ENDED_FACTS = [
  ['Rules', 'Saved, not enforced', 'Exactly as you left them'],
  ['Trades', 'Kept', 'All history stays readable'],
  ['Tax history', 'Kept', 'Reports still download'],
];

const ENDED_LOCK_BODY = 'Your rules and entries are saved, not deleted. Subscribe and this switches back on.';

/**
 * Everything the shell needs for one state.
 *
 * @param {string|null} id     from lifecycleIdOf
 * @param {{ endsAt?: string|null, periodEnd?: string|null, autoRenews?: boolean }} ctx
 *   endsAt     — /me `stateEndsAt`: end of the protected window (tc, pc, tx)
 *   periodEnd  — the subscription's period end; for pe, when it ended
 *   autoRenews — a card is on file for this trial. Without one (the old
 *                no-card trial) t1/t6 keep the existing "set up billing"
 *                prompt instead of the spec's charge notice: there is no
 *                charge coming, and saying there is would be false.
 */
export function lifecycleView(id, ctx = {}) {
  if (!id) return null;
  const until = day(ctx.endsAt);
  const base = {
    id,
    protected: PROTECTED_STATES.includes(id),
    unprotected: UNPROTECTED_STATES.includes(id),
    setup: SETUP_STATES.includes(id),
    ended: false,
    endedFrom: null,
    /** Spec pill text and tone; null = keep the existing guard pill. */
    pill: null,
    tone: null,
    /** The line under the logo; null = keep the existing plan line. */
    plan: null,
    /** The spec's band; null = keep the existing band behaviour. */
    band: null,
    hero: null,
    locks: [],
    lock: null,
    ks: { enabled: true, tip: 'Lock yourself out for a few hours' },
    badges: {},
    rulesBadge: null,
    facts: null,
    dial: null,
    /** One line for the Overview; says what is and is not happening. */
    plainEnglish: null,
    /** Shown once on entering the state. */
    toast: null,
  };

  switch (id) {
    /* ── Setup ───────────────────────────────────────────────────────── */
    case 's0':
    case 's2':
      return {
        ...base,
        plan: id === 's0' ? 'Setup · step 1 of 4' : 'Setup · step 3 of 4',
        locks: ['live', 'journal', 'trades', 'tax'],
        lock: {
          title: 'Connect your key to see this',
          body: id === 's0'
            ? 'This page fills in from your exchange. Finish setup and it comes alive.'
            : 'Nothing can show here until we can read your exchange. About two minutes on a laptop.',
          cta: id === 's0' ? 'Continue setup' : 'Connect key',
          to: id === 's0' ? '/dashboard/setup' : '/dashboard/connect',
        },
        ks: { enabled: false, tip: 'Works once your key is connected' },
        badges: id === 's2' ? { connect: '!' } : {},
        rulesBadge: 'DRAFT',
        facts: [['Rules', 'Draft', 'Nothing enforced yet'], ['Key', 'Not connected', 'Needed to act on trades'], ['Guard', 'Off', 'Switches on with your trial']],
        dial: { label: 'guard off · finish setup' },
        plainEnglish: 'Until setup is finished we are not watching or closing anything. Your rules are saved as a draft.',
        toast: id === 's0' ? 'Welcome. Three minutes to your first protected trade.' : null,
      };
    case 's3':
      return {
        ...base,
        plan: 'Setup · step 4 of 4',
        locks: ['live', 'journal'],
        lock: {
          title: 'Starts with your free trial',
          body: 'Your key is connected and history is filling in. This switches on the moment the trial starts.',
          cta: 'Start free trial',
          to: '/dashboard/activate',
        },
        ks: { enabled: false, tip: 'Starts with your free trial' },
        rulesBadge: 'DRAFT',
        facts: [['Rules', 'Draft', 'Nothing enforced yet'], ['Key', 'Connected', 'Needed to act on trades'], ['Guard', 'Off', 'Switches on with your trial']],
        dial: { label: 'guard off · finish setup' },
        plainEnglish: 'Until setup is finished we are not watching or closing anything. Your rules are saved as a draft.',
      };

    /* ── Trial ───────────────────────────────────────────────────────── */
    case 't1':
      return { ...base, toast: 'Guard on. Your account is protected.' };
    case 't6':
      return {
        ...base,
        // TODO(api): amount and card ("We'll charge ₹1,299 to Visa •••• 4242").
        band: ctx.autoRenews && until
          ? {
              tone: 'neutral',
              dismissible: true,
              title: `Your trial ends ${until}.`,
              body: 'We’ll take your first payment then. Nothing to do if you’re staying.',
              cta: 'Manage plan',
              to: BILLING,
            }
          : null,
      };
    case 'tc':
      return {
        ...base,
        pill: until ? `Protected · until ${until}` : 'Protected',
        tone: 'amber',
        plan: until ? `Trial ends ${until}` : 'Trial cancelled',
        band: {
          tone: 'amber',
          title: 'Trial cancelled. You won’t be charged.',
          body: until
            ? `Full protection until ${until}. After that your guard switches off.`
            : 'Full protection to the end of the trial. After that your guard switches off.',
          cta: 'Resume trial',
          to: BILLING,
        },
        hero: {
          title: until ? `Protected until ${until}.` : 'Protected to the end of your trial.',
          sub: 'After that your guard switches off on every account. Your rules and history are kept.',
        },
        toast: 'Trial cancelled. You won’t be charged.',
      };
    case 'tx':
      return {
        ...base,
        pill: 'Protected · confirming payment',
        tone: 'mint',
        plan: 'Trial ended · confirming',
        hero: {
          title: 'Your account is protected.',
          sub: 'Your trial ended and we’re confirming the first payment with your bank. Your guard stays on meanwhile, for up to 3 days.',
        },
      };

    /* ── Pro ─────────────────────────────────────────────────────────── */
    case 'p':
      // TODO(api): "Payment received · ₹{amount}" needs the amount charged.
      return { ...base, toast: 'Payment received. Invoice in Plan & billing.' };
    case 'pc':
      return {
        ...base,
        pill: until ? `Protected · until ${until}` : 'Protected',
        tone: 'amber',
        plan: until ? `Pro · ends ${until}` : 'Pro · cancelled',
        band: {
          tone: 'amber',
          title: until ? `Pro ends ${until}.` : 'Pro is cancelled.',
          body: 'After that your guard switches off. Nothing is deleted.',
          cta: 'Resume Pro',
          to: BILLING,
        },
        hero: {
          title: until ? `Protected until ${until}.` : 'Protected to the end of your plan.',
          sub: until
            ? `You paid for the period, so you keep everything until ${until}. Then the guard switches off on every account.`
            : 'You paid for the period, so you keep everything until it ends. Then the guard switches off on every account.',
        },
        toast: until ? `Pro cancelled. You’re protected until ${until}.` : 'Pro cancelled. You’re protected until your plan ends.',
      };
    case 'ac':
      return { ...base, plan: 'Pro · complimentary' };
    case 'nr':
      return { ...base, plan: 'Pro · checking plan' };

    /* ── Not protected, key in place ─────────────────────────────────── */
    case 'pf':
      return {
        ...ended(base, 'failed'),
        pill: 'Not protected · payment failed',
        plan: 'Pro · payment failed',
        // TODO(api): the amount due ("Pay ₹1,299") and Dodo's retry dates.
        band: {
          tone: 'red',
          title: 'Payment failed. Your guard is off.',
          body: 'Nothing is protecting your accounts until the payment goes through. Pay now to switch it back on.',
          cta: 'Pay now',
          to: BILLING,
        },
        hero: {
          title: 'Nothing is protecting your accounts.',
          sub: 'Your bank declined the payment, so the guard switched off. Pay now and your saved rules start enforcing again straight away.',
        },
        lock: {
          title: 'Off until your payment goes through',
          body: 'Your rules and entries are saved. Pay now and this switches back on straight away.',
          cta: 'Pay now',
          to: BILLING,
        },
        plainEnglish:
          'Your payment failed, so we are not watching or closing anything right now. Pay now and your saved rules start enforcing again straight away. Your manual kill switch still works.',
        toast: 'Payment failed. Your guard is off until it goes through.',
      };
    case 'te':
      return {
        ...ended(base, 'trial'),
        plan: 'No plan · trial ended',
        band: {
          tone: 'red',
          title: 'Your free trial has ended.',
          body: 'Nothing is protecting your accounts. Your rules are saved.',
          cta: 'Subscribe',
          to: BILLING,
        },
      };
    case 'pe': {
      const on = day(ctx.periodEnd);
      return {
        ...ended(base, 'pro'),
        plan: on ? `No plan · ended ${on}` : 'No plan · ended',
        band: {
          tone: 'red',
          title: on ? `Your plan ended on ${on}.` : 'Your plan has ended.',
          body: 'Nothing is protecting your accounts. Your rules are saved.',
          cta: 'Subscribe',
          to: BILLING,
        },
      };
    }
    case 'pg':
      // Not produced until end_reason is stored; here so it is ready.
      return {
        ...ended(base, 'unpaid'),
        plan: 'No plan · unpaid',
        band: {
          tone: 'red',
          title: 'Pro ended. All payment retries failed.',
          body: 'Nothing is protecting your accounts. Pay now to switch everything back on.',
          cta: 'Pay now',
          to: BILLING,
        },
        lock: { title: 'Needs an active plan', body: 'Your rules and entries are saved, not deleted. Pay now and this switches back on.', cta: 'Pay now', to: BILLING },
      };
    case 'lf':
      return {
        ...ended(base, 'trial'),
        pill: 'Not protected · no plan',
        plan: 'No plan · subscribe',
        band: {
          tone: 'red',
          title: 'Your account has no active plan.',
          body: 'Nothing is protecting your accounts. Subscribe to switch your guard on.',
          cta: 'Subscribe',
          to: BILLING,
        },
        hero: {
          title: 'Nothing is protecting your accounts.',
          sub: 'Your account is from before plans changed. Subscribe and your saved rules start enforcing straight away.',
        },
        lock: { title: 'Needs an active plan', body: 'Your rules and entries are saved. Subscribe and this switches on.', cta: 'Subscribe', to: BILLING },
      };
    default:
      return base;
  }
}

/** What every red, key-in-place state shares. */
function ended(base, endedFrom) {
  const failed = endedFrom === 'failed';
  return {
    ...base,
    ended: true,
    endedFrom,
    pill: 'Not protected · plan ended',
    tone: 'red',
    hero: {
      title: 'Nothing is protecting your accounts.',
      sub: 'Your rules are saved but not enforced. Trades and tax history stay readable. Subscribe and the guard is back on immediately.',
    },
    locks: ['live', 'journal'],
    lock: { title: 'Needs an active plan', body: ENDED_LOCK_BODY, cta: 'Subscribe', to: BILLING },
    // The manual kill switch is the user's own instruction, and the engine
    // honours it with no plan. So it stays usable, and says why.
    ks: { enabled: true, tip: 'Works without a plan: your rules are off, your kill switch is not' },
    badges: { plan: '!' },
    rulesBadge: 'SAVED',
    facts: ENDED_FACTS,
    dial: { label: failed ? 'guard off · payment failed' : 'guard off · no active plan' },
    lossBudgetNote: failed ? 'Not enforced: payment failed' : 'Not enforced: no active plan',
    accountLabel: failed ? 'Not protected · payment failed' : 'Not protected · rules saved',
    plainEnglish:
      'Your plan has ended, so we are not watching or closing anything. Subscribe and your saved rules start enforcing again straight away. Your manual kill switch still works.',
  };
}

/**
 * The toast for moving between two states, or null.
 *
 * Coming back from any unprotected state reads the same whatever caused it:
 * the user's question is "am I covered again", and the answer is yes.
 */
export function entryToastFor(fromId, toId, view) {
  if (!toId || fromId === toId) return null;
  if (fromId && UNPROTECTED_STATES.includes(fromId) && PROTECTED_STATES.includes(toId)) {
    return 'Payment went through. Your guard is back on.';
  }
  return view?.toast ?? null;
}
