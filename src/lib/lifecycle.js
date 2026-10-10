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
 * Setup states come FIRST, as in the spec's derivation (§2, first match
 * wins): no account → s0, a key never connected → s2, whatever the plan. A
 * cancelled trial on a fresh account with no key is s2, not tc — nothing can
 * be watched on it. s3 is a connected key with no plan yet (the server's
 * `none`). A key that was connected and has since failed (invalid, revoked)
 * is not setup: the plan state stands and the key problem shows as the
 * account's own condition (§5, scenario Q).
 */

/** The engine is enforcing in these. Mirrors lifecycleState.ts PROTECTED. */
export const PROTECTED_STATES = ['t1', 't6', 'tc', 'tx', 'p', 'pc', 'ac', 'nr'];

/** A key exists and nothing is enforced: the red, non-dismissible states. */
export const UNPROTECTED_STATES = ['pf', 'te', 'pe', 'pg', 'lf'];

export const SETUP_STATES = ['s0', 's2', 's3'];

const BILLING = '/dashboard/account/billing';
const ONBOARDING = '/dashboard/setup';

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

/** Key statuses that mean a key WAS connected and has since failed. */
const FAILED_KEY = ['invalid', 'revoked'];

/** 'none' (never connected) | 'ok' | 'failed', from the credentials status. */
export function keyStateOf(connection) {
  const st = connection?.status ?? null;
  if (st === 'active') return 'ok';
  if (FAILED_KEY.includes(st)) return 'failed';
  return 'none';
}

/**
 * Which of the spec's states this user is in, in the spec's order.
 *
 * Null while anything it depends on is unknown (plan state not loaded, or an
 * older API). The callers then leave the existing shell exactly as it was:
 * no lock, no red band, nothing claimed — an unloaded state must never read
 * as unprotected.
 */
export function lifecycleIdOf({ planState, accountsCount, keyState }) {
  if (!planState) return null;
  if (!accountsCount) return 's0';
  if (keyState === 'none') return 's2';
  if (planState === 'none') return 's3';
  return planState;
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
 * @param {{ endsAt?: string|null, periodEnd?: string|null, autoRenews?: boolean, accountName?: string }} ctx
 *   endsAt     — /me `stateEndsAt`: end of the protected window (tc, pc, tx)
 *   periodEnd  — the subscription's period end; for pe, when it ended
 *   autoRenews — a card is on file for this trial. Without one (the old
 *                no-card trial) t1/t6 keep the existing "set up billing"
 *                prompt instead of the spec's charge notice: there is no
 *                charge coming, and saying there is would be false.
 *   accountName — the selected account, for "Nothing is watching {account}"
 *   price      — the plan's price for their billing period, "₹1,299". The
 *                list price: TODO(api) the provider's actual amount due,
 *                which differs only while a coupon applies. Sentences that
 *                need it drop the figure when it is unknown.
 */
export function lifecycleView(id, ctx = {}) {
  if (!id) return null;
  const until = day(ctx.endsAt);
  const price = ctx.price || null;
  const acct = ctx.accountName || 'Your account';
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
        pill: id === 's0' ? 'Set up · 0 of 4' : 'Not protected',
        tone: id === 's0' ? 'neutral' : 'red',
        plan: id === 's0' ? 'Setup · step 1 of 4' : 'Setup · step 3 of 4',
        band: id === 's0'
          ? { tone: 'neutral', title: 'Finish setup to switch your guard on.', body: 'About three minutes. Until then nothing is watching your trades.', cta: 'Continue setup', to: ONBOARDING }
          : { tone: 'red', title: `Nothing is watching ${ctx.accountName || 'this account'} yet.`, body: 'Connect the key to turn your rules into actions.', cta: 'Connect key', to: ONBOARDING },
        locks: ['live', 'journal', 'trades', 'tax'],
        lock: {
          title: 'Connect your key to see this',
          body: id === 's0'
            ? 'This page fills in from your exchange. Finish setup and it comes alive.'
            : 'Nothing can show here until we can read your exchange. About two minutes on a laptop.',
          cta: id === 's0' ? 'Continue setup' : 'Connect key',
          // Setup CTAs go to onboarding, which opens at the case's step.
          to: ONBOARDING,
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
        pill: 'Guard off',
        tone: 'amber',
        plan: 'Setup · step 4 of 4',
        band: { tone: 'amber', title: 'Key connected. Guard is off.', body: 'Start your 7-day free trial to switch it on. ₹0 today.', cta: 'Start free trial', to: ONBOARDING },
        locks: ['live', 'journal'],
        lock: {
          title: 'Starts with your free trial',
          body: 'Your key is connected and history is filling in. This switches on the moment the trial starts.',
          cta: 'Start free trial',
          to: ONBOARDING,
        },
        ks: { enabled: false, tip: 'Starts with your free trial' },
        rulesBadge: 'DRAFT',
        facts: [['Rules', 'Draft', 'Nothing enforced yet'], ['Key', 'Connected', 'Needed to act on trades'], ['Guard', 'Off', 'Switches on with your trial']],
        dial: { label: 'guard off · finish setup' },
        plainEnglish: 'Until setup is finished we are not watching or closing anything. Your rules are saved as a draft.',
      };

    /* ── Trial ───────────────────────────────────────────────────────── */
    case 't1':
      return { ...base, toast: `Guard on. ${acct} is protected.` };
    case 't6':
      return {
        ...base,
        // TODO(api): the card ("… to Visa •••• 4242").
        band: ctx.autoRenews && until
          ? {
              tone: 'neutral',
              // Hidden for the rest of the day once dismissed; back tomorrow.
              dismissible: true,
              dismissDays: 1,
              title: `Your trial ends ${until}.`,
              body: price
                ? `We’ll charge ${price}. Nothing to do if you’re staying.`
                : 'We’ll take your first payment then. Nothing to do if you’re staying.',
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
        accountSuffix: until ? `until ${until}` : null,
      };
    case 'tx':
      /* The spec's tx is a card trial waiting on its first charge. The old
         no-card trial lands here too — the engine graces any trial for 3
         days — but no payment is coming, so "confirming your payment" would
         be false. Same protection, its own true sentence, and a prompt. */
      if (!ctx.autoRenews) {
        return {
          ...base,
          pill: until ? `Protected · until ${until}` : 'Protected',
          tone: 'amber',
          plan: 'Trial ended',
          band: {
            tone: 'amber',
            title: 'Your free trial has ended.',
            body: until
              ? `Your guard stays on until ${until}. Set up billing to keep it on.`
              : 'Your guard stays on for a short while. Set up billing to keep it on.',
            cta: 'Set up billing',
            to: '/dashboard/activate',
          },
          hero: {
            title: until ? `Protected until ${until}.` : 'Still protected, for now.',
            sub: 'Your free trial has ended and no payment method is set up. Add one and the guard stays on without a gap.',
          },
        };
      }
      return {
        ...base,
        pill: 'Protected · confirming payment',
        tone: 'mint',
        plan: 'Trial ended · confirming',
        hero: {
          title: `${acct} is protected.`,
          sub: 'Your trial ended and we’re confirming the first payment with your bank. Your guard stays on meanwhile, for up to 3 days.',
        },
      };

    /* ── Pro ─────────────────────────────────────────────────────────── */
    case 'p':
      return { ...base, toast: price ? `Payment received · ${price}. Invoice in Plan & billing.` : 'Payment received. Invoice in Plan & billing.' };
    case 'pc':
      return {
        ...base,
        pill: until ? `Protected · until ${until}` : 'Protected',
        tone: 'amber',
        plan: until ? `Pro · ends ${until}` : 'Pro · cancelled',
        band: {
          tone: 'amber',
          // Hidden for 3 days once dismissed, then back until the period ends.
          dismissible: true,
          dismissDays: 3,
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
        accountSuffix: until ? `until ${until}` : null,
      };
    case 'ac':
      return { ...base, plan: 'Pro · complimentary' };
    case 'nr':
      return { ...base, plan: 'Pro · checking plan' };

    /* ── Not protected, key in place ─────────────────────────────────── */
    case 'pf': {
      // The renewal is charged on the period end, so that is when it failed.
      // TODO(api): Dodo's retry dates ("We also retry on 17 Oct and 20 Oct").
      const failedOn = day(ctx.periodEnd);
      const pay = price ? `Pay ${price}` : 'Pay now';
      return {
        ...ended(base, 'failed'),
        pill: 'Not protected · payment failed',
        plan: 'Pro · payment failed',
        band: {
          tone: 'red',
          title: 'Payment failed. Your guard is off.',
          body: `Nothing is protecting your accounts until the payment goes through. ${pay} to switch it back on now.`,
          cta: pay,
          to: BILLING,
        },
        hero: {
          title: 'Nothing is protecting your accounts.',
          sub: `Your bank declined ${price ?? 'the payment'}${failedOn ? ` on ${failedOn}` : ''}, so the guard switched off. Pay now and your saved rules start enforcing again straight away.`,
        },
        lock: {
          title: 'Off until your payment goes through',
          body: `Your rules and entries are saved. ${pay} and this switches back on straight away.`,
          cta: pay,
          to: BILLING,
        },
        plainEnglish:
          `Your payment failed, so we are not watching or closing anything right now. ${pay} and your saved rules start enforcing again straight away. Your manual kill switch still works.`,
        toast: 'Payment failed. Your guard is off until it goes through.',
      };
    }
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
    case 'pg': {
      // Not produced until end_reason is stored; here so it is ready.
      const pay = price ? `Pay ${price}` : 'Pay now';
      return {
        ...ended(base, 'unpaid'),
        plan: 'No plan · unpaid',
        band: {
          tone: 'red',
          title: 'Pro ended. All payment retries failed.',
          body: `Nothing is protecting your accounts. ${pay} to switch everything back on.`,
          cta: pay,
          to: BILLING,
        },
        hero: {
          title: 'Nothing is protecting your accounts.',
          sub: `Your rules are saved but not enforced. Trades and tax history stay readable. ${pay} and the guard is back on immediately.`,
        },
        lock: { title: 'Needs an active plan', body: `Your rules and entries are saved, not deleted. ${pay} and this switches back on.`, cta: pay, to: BILLING },
        plainEnglish:
          `Your plan has ended, so we are not watching or closing anything. ${price ? `Pay the overdue ${price}` : 'Pay the overdue amount'} and your saved rules start enforcing again straight away. Your manual kill switch still works.`,
      };
    }
    case 'lf':
      return {
        ...ended(base, 'trial'),
        pill: 'Not protected · no plan',
        plan: 'No plan · subscribe',
        offReason: 'plan ended',
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
    /** "Guard switched off: …", the first Activity row. */
    offReason: failed ? 'payment failed' : endedFrom === 'unpaid' ? 'all retries failed' : endedFrom === 'trial' ? 'trial ended' : 'plan ended',
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
  if (view?.toast) return view.toast;
  /* Protection flipped and the case has no toast of its own (§1.2).
     TODO(api): with open positions the off-toast reads "Your guard is off.
     Open positions are not being watched." — needs the engine's positions. */
  const was = fromId ? PROTECTED_STATES.includes(fromId) : null;
  const now = PROTECTED_STATES.includes(toId);
  if (was === null || was === now || SETUP_STATES.includes(fromId)) return null;
  return now ? 'Your guard is on.' : 'Your guard is off.';
}

/* ── Rule hits the engine could not act on (spec §1.5) ────────────────── */

const RULE_NAMES = {
  'daily-loss': 'Daily loss limit',
  'risk-per-trade': 'Risk per trade',
  'max-trades-day': 'Max trades per day',
  'max-total-loss': 'Max total loss',
  'daily-target': 'Daily target',
  'close-after-losses': 'Losing streak',
  'stop-loss-alert': 'Stop-loss alert',
  'cooldown-block': 'Cooldown',
};

export function ruleNameOf(slug) {
  if (!slug) return 'A rule';
  const k = String(slug).replace(/_/g, '-');
  return RULE_NAMES[k] ?? k.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/** The engine records a hit it could not act on as `enforcement_unavailable`. */
export function isUnenforced(breach) {
  return breach?.breachType === 'enforcement_unavailable';
}

/**
 * "{Rule} reached · not enforced (no active plan)" — the Activity row and the
 * trade tag. The reason is the plan only when the engine says so (context
 * reason `unentitled`) or, for older rows, when the user has no plan now;
 * otherwise the cause was the key, and the row says only "not enforced".
 */
export function unenforcedLabel(breach, { unprotected = false, timeline = false } = {}) {
  const plan = breach?.context?.reason === 'unentitled' || (unprotected && breach?.context?.reason == null);
  const suffix = plan ? (timeline ? ': plan inactive' : ' (no active plan)') : '';
  return `${ruleNameOf(breach?.ruleSlug)} reached · not enforced${suffix}`;
}
