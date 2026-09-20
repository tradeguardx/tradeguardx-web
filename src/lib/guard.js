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
 *
 *   guardOf        = lockActive ? 'locked' : enforcementOf
 *
 * Gap resolution (first unmet wins) drives the band body, its CTA and the
 * Overview next action. Alerts are gap 5: they do not lower enforcement —
 * the engine still closes positions — but a breach would be silent.
 */

export const ENFORCEMENT = { ARMED: 'armed', WATCHING: 'watching', UNPROTECTED: 'unprotected' };
export const GUARD = { ...ENFORCEMENT, LOCKED: 'locked' };

/** Is the account's setup complete enough to size limits and connect? */
export function setupCompleteOf(account) {
  if (!account) return false;
  const venue = typeof account.propFirmSlug === 'string' && account.propFirmSlug.trim().length > 0;
  const size = Number(account.accountSize);
  return venue && Number.isFinite(size) && size > 0;
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
export function gapsOf({ account, connection, rules, notifications }) {
  // Copy verbatim from the reference's gapOf(). Read-only is not a gap here —
  // it is the 'watching' state, with its own band copy (see describeGuard).
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
  if (enabledRuleCount(rules) === 0) {
    gaps.push({
      key: 'rules',
      short: 'no rules on',
      title: 'No rules are switched on',
      body: 'Your key is connected and verified — there is simply nothing for the engine to enforce. Switch on a rule and the guard arms itself.',
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

export function enforcementOf({ account, connection, rules }) {
  if (!setupCompleteOf(account)) return ENFORCEMENT.UNPROTECTED;
  if (!connection || connection.status !== 'active') return ENFORCEMENT.UNPROTECTED;
  if (enabledRuleCount(rules) === 0) return ENFORCEMENT.UNPROTECTED;
  if (connection.enforcementCapable === false) return ENFORCEMENT.WATCHING;
  return ENFORCEMENT.ARMED;
}

export function guardOf(input, now = Date.now()) {
  return lockUntilOf(input.account, now) ? GUARD.LOCKED : enforcementOf(input);
}

/**
 * Pill, band and hero copy per guard state — transcribed from the reference's
 * guardFor(). `label` is the account-row word (stateOf), `pill` the header word.
 */
export function describeGuard(guard, { on = 0, total = 0, gap = null, label = '', readOnly = false } = {}) {
  switch (guard) {
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
