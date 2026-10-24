import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { nextResetAt, resetBoundaryFor, zoneSwitchPending } from './dailyReset';
import { setUserZone } from './userZone';
import DailyResetLine from '../components/dashboard/DailyResetLine';

const at = (iso) => Date.parse(iso);

describe('nextResetAt', () => {
  it('is the account zone midnight after now', () => {
    expect(nextResetAt({ timezone: 'Asia/Dubai', dailyResetTimeLocal: '00:00' }, at('2026-10-24T10:00:00Z'))).toBe(at('2026-10-24T20:00:00Z'));
    expect(nextResetAt({ timezone: 'Asia/Kolkata', dailyResetTimeLocal: '00:00' }, at('2026-10-24T10:00:00Z'))).toBe(at('2026-10-24T18:30:00Z'));
  });

  it('defaults to UTC midnight, the engine default', () => {
    expect(nextResetAt({}, at('2026-10-24T10:00:00Z'))).toBe(at('2026-10-25T00:00:00Z'));
  });

  it('keeps a prop firm cutoff and survives DST', () => {
    // New York falls back on 1 Nov 2026: 17:00 EST is 22:00Z.
    expect(nextResetAt({ timezone: 'America/New_York', dailyResetTimeLocal: '17:00', equityMode: 'funded' }, at('2026-11-01T12:00:00Z'))).toBe(at('2026-11-01T22:00:00Z'));
  });
});

describe('resetBoundaryFor', () => {
  it('is 05:30 in India and 05:00 everywhere else', () => {
    expect(resetBoundaryFor('Asia/Kolkata')).toEqual({ tz: 'Asia/Kolkata', time: '05:30' });
    expect(resetBoundaryFor('Asia/Calcutta')).toEqual({ tz: 'Asia/Calcutta', time: '05:30' });
    expect(resetBoundaryFor('Asia/Dubai')).toEqual({ tz: 'Asia/Dubai', time: '05:00' });
    expect(resetBoundaryFor('America/New_York')).toEqual({ tz: 'America/New_York', time: '05:00' });
  });

  it('India 05:30 is the same instant as the old UTC midnight', () => {
    const now = at('2026-10-24T10:00:00Z');
    expect(nextResetAt({ timezone: 'Asia/Kolkata', dailyResetTimeLocal: '05:30' }, now)).toBe(at('2026-10-25T00:00:00Z'));
  });
});

describe('zoneSwitchPending', () => {
  const now = at('2026-10-24T10:00:00Z');

  it('is true while a retail account still resets at another moment', () => {
    expect(zoneSwitchPending({ timezone: 'UTC', dailyResetTimeLocal: '00:00' }, 'Asia/Dubai', now)).toBe(true);
    // Old-style local midnight is not the new 05:00 either.
    expect(zoneSwitchPending({ timezone: 'Asia/Dubai', dailyResetTimeLocal: '00:00' }, 'Asia/Dubai', now)).toBe(true);
  });

  it('is false once the account is on the user\'s 05:00', () => {
    expect(zoneSwitchPending({ timezone: 'Asia/Dubai', dailyResetTimeLocal: '05:00' }, 'Asia/Dubai', now)).toBe(false);
  });

  it('is false for an Indian account still stored as UTC 00:00 — same instant as 05:30 IST', () => {
    expect(zoneSwitchPending({ timezone: 'UTC', dailyResetTimeLocal: '00:00' }, 'Asia/Kolkata', now)).toBe(false);
    expect(zoneSwitchPending({ timezone: 'Asia/Kolkata', dailyResetTimeLocal: '05:30' }, 'Asia/Calcutta', now)).toBe(false);
  });

  it('never applies to a prop-firm account', () => {
    expect(zoneSwitchPending({ timezone: 'America/New_York', dailyResetTimeLocal: '17:00', equityMode: 'funded' }, 'Asia/Dubai', now)).toBe(false);
  });
});

describe('DailyResetLine', () => {
  afterEach(() => setUserZone(null, { persist: false }));

  it('shows the real reset in the user zone, and a pending switch', () => {
    setUserZone('Asia/Dubai', { persist: false });
    render(<MemoryRouter><DailyResetLine account={{ timezone: 'UTC', dailyResetTimeLocal: '00:00' }} /></MemoryRouter>);
    const line = document.querySelector('[data-daily-reset]');
    // 00:00 UTC is 04:00 in Dubai.
    expect(line.textContent).toMatch(/Your day resets at 04:00 GST/);
    expect(line.textContent).toMatch(/then 05:00 Dubai time from the next day/);
    expect(screen.getByRole('link', { name: 'Change timezone' })).toHaveAttribute('href', '/dashboard/preferences');
  });

  it('says nothing about switching once the account is on the user zone', () => {
    setUserZone('Asia/Dubai', { persist: false });
    render(<MemoryRouter><DailyResetLine account={{ timezone: 'Asia/Dubai', dailyResetTimeLocal: '05:00' }} /></MemoryRouter>);
    const line = document.querySelector('[data-daily-reset]');
    expect(line.textContent).toMatch(/resets at 05:00 GST · in \d/);
    expect(line.textContent).not.toMatch(/from the next day/);
  });

  it('shows no pending switch for an Indian account still stored as UTC midnight', () => {
    setUserZone('Asia/Kolkata', { persist: false });
    render(<MemoryRouter><DailyResetLine account={{ timezone: 'UTC', dailyResetTimeLocal: '00:00' }} /></MemoryRouter>);
    const line = document.querySelector('[data-daily-reset]');
    expect(line.textContent).toMatch(/resets at 05:30 IST/);
    expect(line.textContent).not.toMatch(/from the next day/);
  });
});
