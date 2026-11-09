/**
 * The daily profit target's three modes, and the trail mode's profit lock —
 * the same arithmetic as the risk engine (src/rules/dailyTarget.ts and
 * profitLock.ts), so the Rules page previews exactly what the engine will do.
 *
 *   target 5000, lock 3000, every further 500 raises it 300
 *   best 5000 → lock 3000 · best 5500 → 3300 · best 6000 → 3600
 */

export const TARGET_ACTIONS = {
  after_close: {
    label: 'Lock once you are flat',
    note: 'When your booked profit reaches the target, the day locks as soon as you have no open trade. We never close a trade for you.',
  },
  close_at_target: {
    label: 'Close and lock at the target',
    note: 'The moment today’s profit, booked plus open, touches the target, we close your open trades and lock the day.',
  },
  trail: {
    label: 'Trail, then close and lock',
    note: 'At the target we protect part of the profit and raise it as profit grows. If profit falls back to that level, we close your open trades and lock the day.',
  },
};

export function targetActionOf(cfg = {}) {
  const a = cfg.targetAction;
  return a === 'close_at_target' || a === 'trail' ? a : 'after_close';
}

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** { params } when the trail settings are usable, { error } with the reason when not. */
export function profitLockSettings(cfg = {}) {
  const trigger = num(cfg.dailyTargetAmount);
  const initial = num(cfg.profitLockInitial);
  if (trigger == null || trigger <= 0) return { error: 'Set the profit target first — it is where the lock starts.' };
  if (initial == null || initial < 0) return { error: 'Set how much profit to lock in first.' };
  if (initial >= trigger) return { error: 'The first lock has to be below your profit target.' };
  const step = num(cfg.profitLockStep);
  const raise = num(cfg.profitLockRaise);
  const stepping = step != null && step > 0 && raise != null && raise > 0;
  return { params: { trigger, initial, step: stepping ? step : null, raise: stepping ? raise : null } };
}

/** The lock for a given best profit today, or null below the target. */
export function profitLockFloor(p, peak) {
  if (!(peak >= p.trigger)) return null;
  if (p.step == null || p.raise == null) return p.initial;
  const steps = Math.floor((peak - p.trigger) / p.step + 1e-9);
  return Math.min(p.initial + steps * p.raise, peak);
}

/** Three worked rows for the preview: [best profit, locked amount]. */
export function profitLockExamples(p) {
  const peaks = p.step == null ? [p.trigger, p.trigger * 1.5] : [p.trigger, p.trigger + p.step, p.trigger + 2 * p.step];
  return peaks.map((peak) => [peak, profitLockFloor(p, peak)]);
}
