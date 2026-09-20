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
  const gaps = [];
  if (!setupCompleteOf(account)) {
    gaps.push({
      key: 'setup',
      title: 'Finish setting up this account',
      body: 'Pick the venue and tell us the balance to size limits against.',
      cta: 'Finish setup',
      to: '/dashboard/account/trading',
    });
  }
  const hasKey = connection && connection.status === 'active';
  if (!hasKey) {
    gaps.push({
      key: 'key',
      title: 'No key with trading scope',
      body: 'Without a trading-scope key, nothing can close a position for you.',
      cta: 'Connect the key',
      to: '/dashboard/connect',
    });
  } else if (connection.enforcementCapable === false) {
    gaps.push({
      key: 'readonly',
      title: 'The key is read-only',
      body: 'We can see every fill, but the key cannot close anything.',
      cta: 'Replace the key',
      to: '/dashboard/connect',
    });
  }
  if (enabledRuleCount(rules) === 0) {
    gaps.push({
      key: 'rules',
      title: 'No rules are switched on',
      body: 'Every rule is off until you turn it on. Off rules do nothing at all.',
      cta: 'Choose rules',
      to: '/dashboard/rules',
    });
  }
  if (!hasAlertChannel(notifications)) {
    gaps.push({
      key: 'alerts',
      title: 'A breach would be silent',
      body: 'Add a channel so you hear about it the moment a rule fires.',
      cta: 'Add a channel',
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

/** Pill word + tone + band title, per the brief. */
export function describeGuard(guard, { on = 0, total = 0, gap = null } = {}) {
  switch (guard) {
    case GUARD.ARMED:
      return {
        pill: 'ARMED',
        tone: 'mint',
        title: `Armed. ${on} of your ${total} rules ${on === 1 ? 'is' : 'are'} watching every fill.`,
      };
    case GUARD.WATCHING:
      return {
        pill: 'ALERT ONLY',
        tone: 'amber',
        title: 'Watching, not enforcing. The key cannot close anything.',
      };
    case GUARD.LOCKED:
      return { pill: 'LOCKED', tone: 'red', title: 'Locked. You asked us to keep you out.' };
    default:
      return {
        pill: 'NOT PROTECTED',
        tone: 'red',
        title: gap ? `Not protected. ${gap.title}.` : 'Not protected.',
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
