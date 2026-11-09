/**
 * One status per trade for the trades table — what the guard did, if anything.
 *
 * Built from two things the page already has: the trade's own metadata (the
 * engine tags a trade it flattened under a lock `blocked: true`) and the
 * breach log. Per-trade breaches carry the trade's uid. Account-level ones
 * (daily loss, losing streak, profit target) do not, so they are matched by
 * time: the trade that was open when a kill switch fired is the one it closed,
 * and the losing trade that closed just before a streak lock is the one that
 * completed the streak.
 *
 * When several apply, the most consequential wins (PRIORITY below); `all`
 * keeps every match for the tooltip.
 *
 * Every action has two faces with the same word: "Blocked by lock" / "Not
 * blocked", "Closed by kill switch" / "Not closed". `detail` is the short line
 * under the chip: which lock or rule, and — when the guard could not act — why.
 * A trade is "blocked" only when the engine confirmed the close; until 8 Nov
 * 2026 the engine tagged it before closing, so a deleted key left a day of
 * trades the user ran themselves reading "Blocked by lock".
 */

export const STATUS = {
  blocked: {
    label: 'Blocked by lock',
    tone: 'red',
    hint: 'Opened during a lockout and closed on sight. It does not count as a trade.',
  },
  notBlocked: {
    label: 'Not blocked',
    tone: 'amber',
    hint: 'Opened during a lockout, but TradeGuardX could not close it. It counts as a trade.',
  },
  kill: {
    label: 'Closed by kill switch',
    tone: 'red',
    hint: 'Open when a limit was hit, so the engine closed it and locked the account.',
  },
  risk: {
    label: 'Auto-closed · risk',
    tone: 'amber',
    hint: 'Its stop-loss risked more than your risk-per-trade limit, so the engine closed it.',
  },
  triggered: {
    label: 'Triggered lock',
    tone: 'red',
    hint: 'This loss completed your losing streak and locked the account.',
  },
  target: {
    label: 'Hit target',
    tone: 'mint',
    hint: 'This trade reached your daily profit target and locked the day in.',
  },
  untracked: {
    label: 'Not tracked',
    tone: 'amber',
    hint: 'Your API key stopped working while this was open, so we never saw it close. Its exit and P&L are unknown.',
  },
  notClosed: {
    label: 'Not closed',
    tone: 'amber',
    hint: 'A rule should have closed this, but nothing could act on it.',
  },
  alert: {
    label: 'Alert',
    tone: 'amber-soft',
    hint: 'A rule alerted on this trade. Nothing was closed.',
  },
  clean: {
    label: 'Clean',
    tone: 'neutral',
    hint: 'No rule fired on this trade.',
  },
};

const PRIORITY = ['blocked', 'notBlocked', 'untracked', 'kill', 'notClosed', 'risk', 'triggered', 'target', 'alert', 'clean'];

const KILL_REASON = {
  daily_loss_exceeded: 'Your daily loss limit was hit while this trade was open, so the engine closed it.',
  consecutive_losses_exceeded: 'Your losing-streak lock fired while this trade was open, so the engine closed it.',
  profit_lock_hit: 'Profit fell back to your profit lock while this trade was open, so the engine closed it.',
  daily_target_closed: 'Your daily profit target was hit while this trade was open, so the engine closed it to keep the win.',
};
const ALERT_REASON = {
  missing_stop_loss: 'Alert: no stop-loss',
  risk_per_trade_exceeded: 'Alert: risk over limit',
  instrument_not_closable: "Alert: can't be closed",
};

/** How far apart a trade's close and a breach can be and still be the same moment. */
const BEFORE_MS = 15_000;
const AFTER_MS = 120_000;

const ms = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};
const uidOf = (b) => b?.tradeUid ?? b?.context?.tradeUid ?? null;
const truthy = (v) => v === true || v === 'true';
const isBlocked = (t) => truthy(t?.metadata?.blocked) && !truthy(t?.metadata?.notBlocked);
const isNotBlocked = (t) => truthy(t?.metadata?.notBlocked);
/** The key died while this was open: the engine stopped watching, so its close was never seen. */
export const isUntracked = (t) => truthy(t?.metadata?.orphaned) || truthy(t?.metadata?.outcomeUnknown);
/** When we lost sight of it — the end of what we can honestly call its hold. */
export const untrackedAt = (t) => t?.metadata?.orphanedAt ?? null;

/** Which lock, in the words the user set it up with. */
const LOCK_NAME = {
  daily_loss: 'Daily loss limit',
  consecutive_losses: 'Losing streak',
  max_trades_day: 'Max trades reached',
  daily_target: 'Profit target',
  profit_lock: 'Profit lock',
  manual_lock: 'Your lock',
  manual: 'Your lock',
};
/** Why the guard could not act — short enough for the line under a chip. */
const NOT_ACTED = {
  key_rejected: 'API key removed',
  exchange_refused: 'Exchange refused the close',
  instrument_not_closable: "Index can't be closed",
  key_cannot_trade: "Key can't trade",
  plan_inactive: 'Plan not active',
  unentitled: 'Plan not active',
  incapable: "Key can't trade",
};
const KILL_SOURCE = {
  daily_loss_exceeded: 'Daily loss limit',
  consecutive_losses_exceeded: 'Losing streak',
};

function hhmm(v) {
  const t = ms(v);
  if (t == null) return null;
  return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "Daily loss limit · until 05:30" / "Your lock · API key removed". */
function lockDetail(trade, breach, failed) {
  const m = trade?.metadata ?? {};
  const c = breach?.context ?? {};
  const pending = truthy(c.pendingLock);
  const source = pending ? 'Your lock' : LOCK_NAME[m.lockReason ?? c.lockReason] ?? 'Lock';
  if (failed) {
    const why = NOT_ACTED[m.notBlockedReason ?? c.notBlockedReason ?? c.reason] ?? null;
    return why ? `${source} · ${why}` : source;
  }
  const until = hhmm(m.lockUntil ?? c.cooldownUntil);
  return until ? `${source} · until ${until}` : source;
}

/**
 * @param trade  a journal trade ({ tradeUid, openedAt, closedAt, pnl, metadata })
 * @param breaches the account's breach log (any order)
 * @param pnl    the trade's P&L as the page computes it (closed trades only)
 * @param unenforced  true when the trade carries an enforcement_unavailable breach
 */
export function tradeStatusOf(trade, breaches = [], { pnl = null, unenforced = false } = {}) {
  const found = new Map(); // key → { text, breach } (text overrides the label/hint)

  if (isBlocked(trade)) found.set('blocked', {});
  if (isNotBlocked(trade)) found.set('notBlocked', {});
  if (isUntracked(trade)) found.set('untracked', {});

  const uid = trade?.tradeUid ?? null;
  const opened = ms(trade?.openedAt);
  const closed = ms(trade?.closedAt);

  for (const b of breaches) {
    const type = b?.breachType;
    if (!type) continue;

    // Per-trade breaches name the trade.
    if (uid && uidOf(b) === uid) {
      if (type === 'trade_blocked_cooldown') {
        if (found.has('blocked')) found.set('blocked', { breach: b });
      } else if (type === 'trade_not_blocked') {
        found.delete('blocked');
        found.set('notBlocked', { breach: b });
      } else if (type === 'enforcement_unavailable') {
        // A lock that could not close it is "not blocked"; any other rule "not closed".
        if (b?.ruleSlug === 'cooldown-block') {
          found.delete('blocked');
          found.set('notBlocked', { breach: b });
        } else {
          found.set('notClosed', { breach: b });
        }
      } else if (type === 'risk_per_trade_exceeded') {
        if (String(b?.context?.onBreach ?? 'close') === 'alert') found.set('alert', { text: ALERT_REASON[type], breach: b });
        else found.set('risk', { breach: b });
      } else if (type === 'missing_stop_loss' || type === 'instrument_not_closable') {
        // Exness will not close an index through its API: said once, when it opened.
        if (!found.has('alert')) found.set('alert', { text: ALERT_REASON[type], breach: b });
      }
      continue;
    }
    if (uidOf(b)) continue; // another trade's

    // Account-level breaches, matched by time.
    const at = ms(b?.createdAt);
    if (at == null || closed == null) continue;

    if (type === 'daily_loss_exceeded' || type === 'consecutive_losses_exceeded' || type === 'profit_lock_hit' || type === 'daily_target_closed') {
      const openAtBreach = opened != null && opened <= at && closed >= at - 2_000 && closed <= at + AFTER_MS;
      const closedJustBefore = closed <= at + 2_000 && closed >= at - BEFORE_MS;
      if (type === 'consecutive_losses_exceeded' && closedJustBefore && pnl != null && pnl < 0) {
        found.set('triggered', { breach: b });
      } else if (openAtBreach && !isBlocked(trade)) {
        found.set('kill', { text: KILL_REASON[type], breach: b });
      }
    } else if (type === 'daily_target_reached') {
      if (closed <= at + 2_000 && closed >= at - BEFORE_MS && pnl != null && pnl > 0) found.set('target', { breach: b });
    }
  }

  // Older callers pass the "not enforced" flag without the breach itself.
  if (unenforced && !found.has('notBlocked') && !found.has('notClosed')) found.set('notClosed', {});

  if (found.size === 0) found.set('clean', {});
  const all = PRIORITY.filter((k) => found.has(k)).map((k) => {
    const breach = found.get(k).breach ?? null;
    return {
      key: k,
      ...STATUS[k],
      label: k === 'alert' && found.get(k).text ? found.get(k).text : STATUS[k].label,
      hint: k === 'kill' && found.get(k).text ? found.get(k).text : STATUS[k].hint,
      detail: detailOf(k, trade, breach),
      breach,
    };
  });
  return { ...all[0], all };
}

function detailOf(key, trade, breach) {
  switch (key) {
    case 'blocked':
      return lockDetail(trade, breach, false);
    case 'notBlocked':
      return lockDetail(trade, breach, true);
    case 'kill':
      return KILL_SOURCE[breach?.breachType] ?? null;
    case 'notClosed': {
      const why = NOT_ACTED[breach?.context?.reason] ?? null;
      const rule = breach?.ruleSlug === 'risk-per-trade' ? 'Risk per trade' : breach?.ruleSlug === 'daily-loss' ? 'Daily loss limit' : null;
      return [rule, why].filter(Boolean).join(' · ') || null;
    }
    case 'risk':
      return 'Risk per trade';
    case 'untracked':
      return 'API key stopped working · close not seen';
    default:
      return null;
  }
}

/** Anything the guard was involved in — the "With rule events" view and the summary count. */
export const isEventful = (status) => status?.key !== 'clean';
