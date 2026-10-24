import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { nextResetAt, zoneSwitchPending } from './dailyReset';
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

describe('zoneSwitchPending', () => {
  it('is true while a retail account still runs on another clock', () => {
    const now = at('2026-10-24T10:00:00Z');
    expect(zoneSwitchPending({ timezone: 'UTC', dailyResetTimeLocal: '00:00' }, 'Asia/Dubai', now)).toBe(true);
    expect(zoneSwitchPending({ timezone: 'Asia/Dubai', dailyResetTimeLocal: '00:00' }, 'Asia/Dubai', now)).toBe(false);
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
    expect(line.textContent).toMatch(/then midnight Dubai time from the next day/);
    expect(screen.getByRole('link', { name: 'Change timezone' })).toHaveAttribute('href', '/dashboard/preferences');
  });

  it('says nothing about switching once the account is on the user zone', () => {
    setUserZone('Asia/Dubai', { persist: false });
    render(<MemoryRouter><DailyResetLine account={{ timezone: 'Asia/Dubai', dailyResetTimeLocal: '00:00' }} /></MemoryRouter>);
    const line = document.querySelector('[data-daily-reset]');
    expect(line.textContent).toMatch(/resets at 00:00 GST · in \d/);
    expect(line.textContent).not.toMatch(/then midnight/);
  });
});
