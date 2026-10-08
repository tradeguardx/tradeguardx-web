import { describe, expect, it } from 'vitest';
import { worstDayOf } from './worstDay';

const at = (day, hour, pnl) => ({ closedAt: `2026-09-${day}T${String(hour).padStart(2, '0')}:00:00Z`, pnl });

describe('worstDayOf', () => {
  const day = [at(14, 9, -4000), at(14, 10, -3000), at(14, 11, -6000), at(14, 12, -5400), at(15, 9, 1200)];

  it('finds the worst day and where the cap would have bitten', () => {
    const r = worstDayOf(day, { limit: 5000, timeZone: 'UTC' });
    expect(r.day).toBe('2026-09-14');
    expect(r.loss).toBe(18400);
    expect(r.tradeCount).toBe(4);
    /* -4000 then -7000: the second trade crosses ₹5,000, so the guard acts
       there and the last two never happen. */
    expect(r.stoppedAfter).toBe(2);
    expect(r.saved).toBe(11400);
  });

  /* A counterfactual built on a handful of trades is not evidence, and
     quoting one teaches people not to trust the number. */
  it('says nothing when there is barely any history', () => {
    expect(worstDayOf([at(14, 9, -9000)], { limit: 1000 })).toBeNull();
  });

  it('says nothing when the cap was never reached', () => {
    expect(worstDayOf(day, { limit: 100000, timeZone: 'UTC' })).toBeNull();
  });

  it('says nothing when no day lost money', () => {
    const green = [at(14, 9, 100), at(14, 10, 200), at(15, 9, 300), at(15, 10, 400), at(16, 9, 500)];
    expect(worstDayOf(green, { limit: 50, timeZone: 'UTC' })).toBeNull();
  });

  it('says nothing without a usable limit', () => {
    expect(worstDayOf(day, { limit: 0 })).toBeNull();
    expect(worstDayOf(day, {})).toBeNull();
  });

  it('ignores rows with no close or no number', () => {
    const messy = [...day, { closedAt: null, pnl: -99999 }, { closedAt: '2026-09-14T13:00:00Z', pnl: 'x' }];
    expect(worstDayOf(messy, { limit: 5000, timeZone: 'UTC' }).loss).toBe(18400);
  });
});
