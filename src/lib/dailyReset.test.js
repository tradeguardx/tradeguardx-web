import { describe, expect, it } from 'vitest';
import { EXCHANGE_RESET_LOCAL, resetDefaultsFor } from './dailyReset';

const propFirm = { equityMode: 'funded', defaultTimezone: 'America/New_York', defaultResetTimeLocal: '17:00' };
const delta = { equityMode: 'live', defaultTimezone: 'UTC', defaultResetTimeLocal: '00:00' };
const bybit = { equityMode: 'live', defaultTimezone: 'UTC', defaultResetTimeLocal: '00:00' };

describe('resetDefaultsFor', () => {
  it("keeps a prop firm's own schedule — that clock belongs to the firm", () => {
    expect(resetDefaultsFor(propFirm, 'Asia/Kolkata')).toEqual({
      timezone: 'America/New_York',
      resetTime: '17:00',
    });
  });

  it('puts an exchange account on early morning where the TRADER is', () => {
    expect(resetDefaultsFor(bybit, 'America/New_York')).toEqual({
      timezone: 'America/New_York',
      resetTime: '05:30',
    });
    expect(resetDefaultsFor(bybit, 'Europe/London')).toEqual({
      timezone: 'Europe/London',
      resetTime: '05:30',
    });
  });

  it('is a no-op for an Indian trader: 05:30 IST is the 00:00 UTC we already use', () => {
    const { timezone, resetTime } = resetDefaultsFor(delta, 'Asia/Kolkata');
    const asLocal = new Date('2026-09-24T00:00:00Z').toLocaleString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    // The venue default (00:00 UTC) and what we now pre-fill are the same instant.
    expect(asLocal).toBe(resetTime);
  });

  it('falls back to the venue default when the browser will not name a zone', () => {
    expect(resetDefaultsFor(bybit, '')).toEqual({ timezone: 'UTC', resetTime: EXCHANGE_RESET_LOCAL });
  });

  it('never returns midnight for an exchange — that is the release time 037 removed', () => {
    for (const tz of ['America/New_York', 'Europe/London', 'Asia/Singapore', 'Asia/Kolkata']) {
      expect(resetDefaultsFor(bybit, tz).resetTime).not.toBe('00:00');
    }
  });
});
