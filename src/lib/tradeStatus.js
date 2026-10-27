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
 */

export const STATUS = {
  blocked: {
    label: 'Blocked by lock',
    tone: 'red',
    hint: 'Opened during a lockout and closed on sight. It does not count as a trade.',
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
  notEnforced: {
    label: 'Not enforced',
    tone: 'amber',
    hint: 'A rule was reached, but nothing could act on it.',
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

const PRIORITY = ['blocked', 'kill', 'risk', 'triggered', 'target', 'notEnforced', 'alert', 'clean'];

const KILL_REASON = {
  daily_loss_exceeded: 'Your daily loss limit was hit while this trade was open, so the engine closed it.',
  consecutive_losses_exceeded: 'Your losing-streak lock fired while this trade was open, so the engine closed it.',
};
const ALERT_REASON = {
  missing_stop_loss: 'Alert: no stop-loss',
  risk_per_trade_exceeded: 'Alert: risk over limit',
};

/** How far apart a trade's close and a breach can be and still be the same moment. */
const BEFORE_MS = 15_000;
const AFTER_MS = 120_000;

const ms = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};
const uidOf = (b) => b?.tradeUid ?? b?.context?.tradeUid ?? null;
const isBlocked = (t) => t?.metadata?.blocked === true || t?.metadata?.blocked === 'true';

/**
 * @param trade  a journal trade ({ tradeUid, openedAt, closedAt, pnl, metadata })
 * @param breaches the account's breach log (any order)
 * @param pnl    the trade's P&L as the page computes it (closed trades only)
 * @param unenforced  true when the trade carries an enforcement_unavailable breach
 */
export function tradeStatusOf(trade, breaches = [], { pnl = null, unenforced = false } = {}) {
  const found = new Map(); // key → hint override

  if (isBlocked(trade)) found.set('blocked', null);
  if (unenforced) found.set('notEnforced', null);

  const uid = trade?.tradeUid ?? null;
  const opened = ms(trade?.openedAt);
  const closed = ms(trade?.closedAt);

  for (const b of breaches) {
    const type = b?.breachType;
    if (!type) continue;

    // Per-trade breaches name the trade.
    if (uid && uidOf(b) === uid) {
      if (type === 'risk_per_trade_exceeded') {
        if (String(b?.context?.onBreach ?? 'close') === 'alert') found.set('alert', ALERT_REASON[type]);
        else found.set('risk', null);
      } else if (type === 'missing_stop_loss') {
        if (!found.has('alert')) found.set('alert', ALERT_REASON[type]);
      }
      continue;
    }
    if (uidOf(b)) continue; // another trade's

    // Account-level breaches, matched by time.
    const at = ms(b?.createdAt);
    if (at == null || closed == null) continue;

    if (type === 'daily_loss_exceeded' || type === 'consecutive_losses_exceeded') {
      const openAtBreach = opened != null && opened <= at && closed >= at - 2_000 && closed <= at + AFTER_MS;
      const closedJustBefore = closed <= at + 2_000 && closed >= at - BEFORE_MS;
      if (type === 'consecutive_losses_exceeded' && closedJustBefore && pnl != null && pnl < 0) {
        found.set('triggered', null);
      } else if (openAtBreach && !isBlocked(trade)) {
        found.set('kill', KILL_REASON[type]);
      }
    } else if (type === 'daily_target_reached') {
      if (closed <= at + 2_000 && closed >= at - BEFORE_MS && pnl != null && pnl > 0) found.set('target', null);
    }
  }

  if (found.size === 0) found.set('clean', null);
  const all = PRIORITY.filter((k) => found.has(k)).map((k) => ({
    key: k,
    ...STATUS[k],
    label: k === 'alert' && found.get(k) ? found.get(k) : STATUS[k].label,
    hint: k === 'kill' && found.get(k) ? found.get(k) : STATUS[k].hint,
  }));
  return { ...all[0], all };
}

/** Anything the guard was involved in — the "With rule events" view and the summary count. */
export const isEventful = (status) => status?.key !== 'clean';
