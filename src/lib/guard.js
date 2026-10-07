/**
 * Guard state — the single derived answer to "am I protected?"
 *
 * Every screen reads this; nothing recomputes it locally. Pure functions over
 * the API shapes we already have (trading account row, exchange connection
 * summary, rules bundle, notification settings). No new endpoints.
 *
 *   enforcementOf  what CAN act on the account, independent of any lock
 *     'armed'        trading-scope key verified AND ≥1 rule on AND setup complete
 *     'watching'     key present but read-only — we see fills, cannot act
 *     'unprotected'  no key, or no rules on, or setup incomplete
 *     'loading'      the account's connection/rules have not been fetched yet
 *
 *   guardOf        = lockActive ? 'locked' : enforcementOf
 *
 * `loading` exists because the absence of data and the absence of a key look
 * identical in these shapes: both are `connection: null`. Without it, every
 * screen asserted "No key with trading scope" for the half-second before the
 * first fetch landed, which is the most alarming thing the product can say
 * and it was saying it to people who were fully protected. Callers pass
 * `loaded` through; anything derived while false is neutral, never a verdict.
 *
 * Gap resolution (first unmet wins) drives the band body, its CTA and the
 * Overview next action. Alerts are gap 5: they do not lower enforcement —
 * the engine still closes positions — but a breach would be silent.
 */

export const ENFORCEMENT = { ARMED: 'armed', WATCHING: 'watching', UNPROTECTED: 'unprotected', LOADING: 'loading' };
export const GUARD = { ...ENFORCEMENT, LOCKED: 'locked' };

/** True while this account's guard state is still unknown. */
export function isLoadingGuard(guard) {
  return guard === GUARD.LOADING;
}

/**
 * Is the account's setup complete enough to size limits and connect?
 * A venue is always required. A sizing balance is only required for
 * *funded* (prop-firm) accounts — that is the only kind the add-account
 * form collects one for; live exchange accounts (Delta) take their balance
 * from the exchange itself.
 */
export function setupCompleteOf(account) {
  if (!account) return false;
  const venue = typeof account.propFirmSlug === 'string' && account.propFirmSlug.trim().length > 0;
  if (!venue) return false;
  if (account.equityMode !== 'funded') return true;
  const size = Number(account.accountSize);
  return Number.isFinite(size) && size > 0;
}

/** Active kill-switch / cooldown lock end, or null. */
export function lockUntilOf(account, now = Date.now()) {
  const iso = account?.cooldownUntil ?? account?.cooldown_until ?? null;
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > now ? t : null;
}

export function enabledRuleCount(bundle) {
  const instances = bundle?.instances ?? bundle?.rules ?? [];
  return instances.filter((r) => r?.enabled !== false).length;
}

export function totalRuleCount(bundle) {
  return (bundle?.templates ?? []).length || (bundle?.instances ?? bundle?.rules ?? []).length;
}

export function hasAlertChannel(settings) {
  if (!settings) return false;
  return Boolean(
    settings.telegramConnected ||
      settings.emailNotificationsEnabled ||
      (settings.mobileNotificationsEnabled && settings.phone),
  );
}

/**
 * Ordered gaps. Each is { key, title, body, cta, to }. `to` is a dashboard
 * route the CTA navigates to. Returns [] when nothing is missing.
 */
export function gapsOf({ account, connection, rules, notifications, entitled = true, loaded = true }) {
  // Copy verbatim from the reference's gapOf(). Read-only is not a gap here —
  // it is the 'watching' state, with its own band copy (see describeGuard).
  //
  // Nothing is a gap until the data is in: a pending fetch is not a missing
  // key, and saying so turned every login into a false alarm.
  if (!loaded) return [];
  const gaps = [];
  if (!setupCompleteOf(account)) {
    gaps.push({
      key: 'setup',
      short: 'account unfinished',
      title: 'This account is not set up yet',
      body: 'Pick the venue and tell us the balance to size limits against — every limit is a percentage of it, so nothing can be computed until it is set.',
      cta: 'Finish setup',
      to: '/dashboard/account/trading',
    });
  }
  const hasKey = connection && connection.status === 'active';
  if (!hasKey) {
    gaps.push({
      key: 'key',
      short: 'no trading key',
      title: 'No key with trading scope',
      body: 'Connect a key with trading scope and the engine can cancel orders and close positions for you. Until then nothing acts on your rules.',
      cta: 'Connect the key',
      to: '/dashboard/connect',
    });
  }
  /*
   * BILLING IS A GAP LIKE ANY OTHER.
   *
   * The engine will not arm without an entitlement, so a user with an account,
   * a live key and five rules switched on is protected by exactly nothing —
   * and every line on this list used to tell them they were done. The rules
   * gap below even promised "switch on a rule and the guard arms itself",
   * which for an unentitled user was simply false.
   *
   * It sits third on purpose: after the key, because that is the first point
   * the ask is worth anything (their balance is read from the key, so the
   * price screen can name their own daily limit), and before rules, because
   * writing rules nothing will enforce is the most disheartening way to spend
   * ten minutes in this product.
   *
   * `entitled` defaults true so a caller that has not loaded a subscription
   * yet cannot flash "you have not paid" at someone who has — the same
   * fail-open rule the key and rules gaps follow.
   */
  if (!entitled) {
    gaps.push({
      key: 'billing',
      short: 'guard not switched on',
      title: 'Billing is not set up',
      body: 'Rules are written down but nothing enforces them until the guard is on. The first 7 days are free and nothing is charged today.',
      cta: 'Start 7 days free',
      to: '/dashboard/activate',
    });
  }
  if (enabledRuleCount(rules) === 0) {
    gaps.push({
      key: 'rules',
      short: 'no rules on',
      title: 'No rules are switched on',
      body: entitled
        ? 'Your key is connected and verified — there is simply nothing for the engine to enforce. Switch on a rule and the guard arms itself.'
        : 'Nothing is enforced yet. Switch on a rule here, and switch the guard on to make it act.',
      cta: 'Choose rules',
      to: '/dashboard/rules',
    });
  }
  if (!hasAlertChannel(notifications)) {
    gaps.push({
      key: 'alerts',
      short: 'no alert channel',
      title: 'No alert channel connected',
      body: 'The guard would act without telling you. Connect Telegram or email so a breach is never silent.',
      cta: 'Set up alerts',
      to: '/dashboard/alerts',
    });
  }
  return gaps;
}

export function enforcementOf({ account, connection, rules, loaded = true, entitled = true }) {
  if (!loaded) return ENFORCEMENT.LOADING;
  if (!setupCompleteOf(account)) return ENFORCEMENT.UNPROTECTED;
  if (!connection || connection.status !== 'active') return ENFORCEMENT.UNPROTECTED;
  if (enabledRuleCount(rules) === 0) return ENFORCEMENT.UNPROTECTED;
  /*
   * ENTITLEMENT, BEFORE CAPABILITY.
   *
   * The engine stopped acting for accounts whose plan has lapsed — it has no
   * agreement to place a close order on them. This screen has to agree with
   * it. A dashboard reading ARMED over an engine that will not act is the most
   * dangerous state this product can produce: someone sizes a position
   * believing a killswitch is behind it.
   *
   * WATCHING is the honest word for it, and it is already the word for a
   * read-only key: data still flows, alerts still arrive, nothing intervenes.
   * Checked BEFORE capability so the copy can say "your plan lapsed" rather
   * than sending someone to replace a key that works perfectly.
   *
   * Defaults to true, so an account whose plan is not loaded yet is never
   * shown as unprotected on a guess.
   */
  if (entitled === false) return ENFORCEMENT.WATCHING;
  if (connection.enforcementCapable === false) return ENFORCEMENT.WATCHING;
  return ENFORCEMENT.ARMED;
}

/**
 * Can a manual lockout actually hold? It needs an account that is set up and
 * a key that can ACT — nothing else. Rules are the automatic side of the
 * product; a lockout is the user deciding to stop, and the engine's cooldown
 * watchdog closes anything opened during it whether or not a single rule is
 * switched on. Gating this on `enforcement === 'armed'` told someone who
 * wanted to lock themselves out to go configure a rule first, which is both
 * wrong and exactly the wrong moment to ask for configuration.
 */
export function canLockOutOf({ account, connection, loaded = true }) {
  if (!loaded) return false;
  if (!setupCompleteOf(account)) return false;
  if (!connection || connection.status !== 'active') return false;
  return connection.enforcementCapable !== false;
}

export function guardOf(input, now = Date.now()) {
  // A live lock is read off the account row, which arrives with the account
  // list — so it is still authoritative before the guard fetch lands.
  return lockUntilOf(input.account, now) ? GUARD.LOCKED : enforcementOf(input);
}

/**
 * Pill, band and hero copy per guard state — transcribed from the reference's
 * guardFor(). `label` is the account-row word (stateOf), `pill` the header word.
 */
export function describeGuard(guard, { on = 0, total = 0, gap = null, label = '', readOnly = false, entitled = true } = {}) {
  switch (guard) {
    case GUARD.LOADING:
      // Deliberately says nothing about protection: we do not know yet, and a
      // guess in either direction is worse than a blank.
      return {
        pill: '', label: '', tone: 'neutral', pillNote: '',
        title: '', sub: '',
        showBand: false, bandTitle: '', bandBody: '', cta: '', to: '/dashboard/live', action: '',
        loading: true,
      };
    case GUARD.LOCKED:
      return {
        pill: 'Locked', label: 'Locked', tone: 'red', pillNote: 'no trading on this account',
        title: 'Locked. You asked us to keep you out.',
        sub: 'You armed the manual killswitch yourself. It clears on its own when the clock runs out — there is no button here that ends it early.',
        showBand: true,
        bandTitle: 'This account cannot trade until the lockout expires',
        bandBody: readOnly
          ? 'Rule edits and key changes are blocked while the lock runs, so you cannot undo it. But the key on this account is read-only — we cannot close anything you open in the meantime. Treat this as a promise to yourself, not a barrier.'
          : 'Anything opened while the lock runs is force-closed on sight. Rule edits and key changes are blocked too, so the lock cannot be worked around.',
        cta: 'See the countdown', to: '/dashboard/live', action: 'See countdown',
      };
    case GUARD.ARMED:
      return {
        pill: 'Armed', label: 'Armed', tone: 'mint', pillNote: `${on} rules enforcing`,
        title: on === 1 ? `Armed. 1 of your ${total} rules is watching every fill.` : `Armed. ${on} of your ${total} rules are watching every fill.`,
        sub: `A trading-scope key is connected and the engine holds a live socket to ${label}. Break a rule and we cancel your orders, close your positions, then verify you are flat before we stop.`,
        showBand: false, bandTitle: '', bandBody: '', cta: '', to: '/dashboard/live', action: 'Manage',
      };
    case GUARD.WATCHING:
      // Same state, two causes, and the fix for one is useless for the other.
      if (entitled === false) {
        return {
          pill: 'Watching only', label: 'Watching only', tone: 'amber', pillNote: 'your plan has lapsed',
          title: 'Watching only. Your plan ended, so nothing is being enforced.',
          sub: 'Your trades and journal keep updating, and your rules are still here exactly as you left them. What has stopped is the acting: we will not cancel an order or close a position on this account while the plan is lapsed.',
          showBand: true,
          bandTitle: 'The killswitch is off — this is not a key problem',
          bandBody: 'Your API key is fine. Enforcement needs an active plan, and this one has run out. Restart it and the guard arms again on the next fill — nothing needs reconnecting.',
          cta: 'See plans', to: '/dashboard/account/billing', action: 'See plans',
        };
      }
      return {
        pill: 'Watching only', label: 'Watching only', tone: 'amber', pillNote: 'cannot close positions',
        title: 'Watching only. We can see a breach — we cannot stop it.',
        sub: 'The key on this account is read-only. Your rules are evaluated and you will get alerts, but the engine has no permission to cancel an order or close a position. Nothing is being enforced.',
        showBand: true,
        bandTitle: 'Read-only key — the killswitch is not live on this account',
        bandBody: 'This is the failure mode worth knowing about: everything looks normal, alerts still arrive, and nothing actually intervenes. Replace the key with one that has trading scope.',
        cta: 'Replace the key', to: '/dashboard/connect', action: 'Replace key',
      };
    default:
      return {
        pill: 'Not protected', label: 'Not protected', tone: 'red', pillNote: 'setup unfinished',
        title: gap
          ? `Not protected. ${gap.title.replace(/^The |^This /, '')}`
          : on > 0 ? `Not protected. Your ${on} rules exist, nothing enforces them.` : 'Not protected. No rules are switched on yet.',
        sub: 'Finish setup and the engine starts watching every fill. Until then your rules are written down but nothing acts on them.',
        showBand: true,
        bandTitle: gap ? gap.title : 'Nothing is enforcing this account yet',
        bandBody: gap ? gap.body : 'Connect a key with trading scope and the engine can cancel orders and close positions for you. Until then nothing acts on your rules.',
        cta: gap ? gap.cta : 'Finish setup', to: gap ? gap.to : '/dashboard/account/trading',
        action: gap && gap.key === 'key' ? 'Connect key' : 'Finish setup',
      };
  }
}

/** Enforcement-accurate verb phrases. Branch on these; never write one copy for both. */
export function enforcementCopy(enforcement) {
  if (enforcement === ENFORCEMENT.ARMED) {
    return {
      action: 'we cancel your orders, close your positions, then verify you are flat',
      lossLimit: 'loss limit — guard closes everything',
    };
  }
  return {
    action: 'we alert you and log it — we cannot close anything',
    lossLimit: 'loss limit — we alert you, we cannot close',
  };
}

/**
 * Rule-lock state re-derived against the live clock. The API's `locked` /
 * `settling` flags are true at fetch time only; a lock that engages between
 * polls would otherwise still show the picker, and the change would be
 * refused with a 423 the user could not have predicted.
 */
export function ruleLockNow(rl, now = Date.now()) {
  if (!rl) return null;
  if (rl.mode === 'day') return { ...rl, settling: false, locked: Boolean(rl.locked && (!rl.lockedUntil || Date.parse(rl.lockedUntil) > now)) };
  const until = rl.lockedUntil ? Date.parse(rl.lockedUntil) : NaN;
  const at = rl.locksAt ? Date.parse(rl.locksAt) : NaN;
  const active = Number.isFinite(until) && now < until;
  return { ...rl, locked: Boolean(active && Number.isFinite(at) && now >= at), settling: Boolean(active && Number.isFinite(at) && now < at) };
}
