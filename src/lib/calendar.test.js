import { describe, expect, it } from 'vitest';
import { rangeFor, countdown, inLabel, timeCell, nextHighImpact, filterDays, impactCounts, isPast, lockWindow } from './calendar';
import { calendarSample } from '../fixtures/calendarSample';

const now = new Date('2026-09-23T10:00:00+05:30');
const ev = (over) => ({ id: 'x', time: '18:00', time_status: 'exact', event_time_utc: '2026-09-23T12:30:00Z', impact: 3, country: 'USD', ...over });

describe('calendar helpers', () => {
  it('week range is Monday–Sunday and shifts by offset', () => {
    expect(rangeFor('week', 0, now)).toMatchObject({ from: '2026-09-21', to: '2026-09-27', label: 'This week' });
    expect(rangeFor('week', 1, now)).toMatchObject({ from: '2026-09-28', to: '2026-10-04', label: 'Next week' });
    expect(rangeFor('month', 0, now)).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
  });
  it('never fabricates a clock time for non-exact events', () => {
    expect(timeCell(ev({ time_status: 'tentative', time: '' }))).toEqual({ text: 'TENTATIVE', exact: false });
    expect(timeCell(ev({ time_status: 'all_day' }))).toEqual({ text: 'ALL DAY', exact: false });
    expect(timeCell(ev({ time_status: 'day_n', day_n: 2 }))).toEqual({ text: 'DAY 2', exact: false });
    expect(timeCell(ev({}))).toEqual({ text: '18:00', exact: true });
  });
  it('counts down from event_time_utc on the client clock', () => {
    expect(countdown(3 * 3600000 + 7 * 60000 + 5000)).toBe('03:07:05');
    expect(countdown(-5000)).toBe('00:00:00');
    expect(inLabel(3 * 3600000 + 7 * 60000)).toBe('IN 3H 07M');
    expect(inLabel(7 * 3600000)).toBeNull();
    expect(isPast(ev({ event_time_utc: '2026-09-23T03:00:00Z', is_past: false }), now.getTime())).toBe(true);
  });
  it('picks the nearest future exact high-impact event, honouring the currency filter', () => {
    const days = [{ date: 'd', label: 'd', events: [
      ev({ id: 'past', event_time_utc: '2026-09-23T03:00:00Z' }),
      ev({ id: 'tent', time_status: 'tentative', event_time_utc: '2026-09-23T06:00:00Z' }),
      ev({ id: 'eur', country: 'EUR', event_time_utc: '2026-09-23T07:00:00Z' }),
      ev({ id: 'usd', event_time_utc: '2026-09-23T12:30:00Z' }),
    ] }];
    expect(nextHighImpact(days, now.getTime()).event.id).toBe('eur');
    expect(nextHighImpact(days, now.getTime(), ['USD']).event.id).toBe('usd');
  });
  it('filters by impact and currency but always keeps holidays; counts are unfiltered', () => {
    const days = calendarSample(now).days;
    const c = impactCounts(days);
    expect(c[3]).toBeGreaterThan(0);
    const f = filterDays(days, { impacts: new Set([3]), countries: ['CNY'] });
    expect(f.flatMap((d) => d.events).map((e) => e.title)).toEqual(['Bank Holiday']);
  });
  it('builds a ±15 minute lock window', () => {
    const w = lockWindow(ev({}), 15, 'Asia/Kolkata');
    expect(w.fromLabel).toBe('17:45');
    expect(w.toLabel).toBe('18:15');
  });
});
