/**
 * Profit lock — the same arithmetic as the risk engine's src/rules/profitLock.ts,
 * so the preview on the Rules page shows exactly the floors the engine will set.
 *
 *   trigger 5000, initial 3000, step 500, raise 300
 *   best 5000 → lock 3000 · best 5500 → 3300 · best 6000 → 3600
 */

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** { params } when the settings are usable, { error } with the reason when not. */
export function profitLockSettings(cfg = {}) {
  const trigger = num(cfg.profitLockTrigger);
  const initial = num(cfg.profitLockInitial);
  if (trigger == null || trigger <= 0) return { error: 'Set the profit that switches the lock on.' };
  if (initial == null || initial < 0) return { error: 'Set how much profit to lock in first.' };
  if (initial >= trigger) return { error: 'The first lock has to be below the profit that switches it on.' };
  const step = num(cfg.profitLockStep);
  const raise = num(cfg.profitLockRaise);
  const stepping = step != null && step > 0 && raise != null && raise > 0;
  return { params: { trigger, initial, step: stepping ? step : null, raise: stepping ? raise : null } };
}

/** The lock for a given best profit today, or null below the trigger. */
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
