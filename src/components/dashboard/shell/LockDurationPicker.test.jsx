import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LockDurationPicker from './LockDurationPicker';
import { durationAdj, durationLong, durationShort } from '../../../lib/lockDuration';
import { dayLabel } from './format';

vi.mock('../../../lib/userZone', () => ({ getUserZone: () => 'Asia/Kolkata', zoneLabel: () => 'IST' }));

describe('lock durations (22 Nov 2026: days, not only hours)', () => {
  it('words each length for a button, a sentence and a noun', () => {
    expect([3, 24, 72, 168].map(durationShort)).toEqual(['3h', '1 day', '3 days', '7 days']);
    expect([3, 12, 24, 168].map(durationLong)).toEqual(['3 hours', '12 hours', '1 day', '7 days']);
    expect([6, 72].map(durationAdj)).toEqual(['6-hour', '3-day']);
  });

  it('a resume date past tomorrow is named, never "tomorrow"', () => {
    const now = Date.parse('2026-11-22T04:00:00Z');
    expect(dayLabel(now + 2 * 3600_000, now)).toBe('today');
    expect(dayLabel(now + 24 * 3600_000, now)).toBe('tomorrow');
    expect(dayLabel(now + 72 * 3600_000, now)).toBe('Wed 25 Nov');
  });
});

describe('LockDurationPicker', () => {
  it('offers a short lock and a break, six choices in two labelled rows', () => {
    render(<LockDurationPicker hours={3} setHours={() => {}} />);
    expect(screen.getByText('Short lock')).toBeTruthy();
    expect(screen.getByText('Take a break')).toBeTruthy();
    expect(screen.getAllByRole('radio').map((b) => b.textContent)).toEqual(['3h', '6h', '12h', '1 day', '3 days', '7 days']);
  });

  it('picking a break selects it and says only support can end it early', () => {
    const setHours = vi.fn();
    const { rerender } = render(<LockDurationPicker hours={3} setHours={setHours} />);
    fireEvent.click(screen.getByRole('radio', { name: '3 days' }));
    expect(setHours).toHaveBeenCalledWith(72);
    rerender(<LockDurationPicker hours={72} setHours={setHours} />);
    expect(screen.getByRole('radio', { name: '3 days' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(/Only support can end a break early/)).toBeTruthy();
  });

  it('with a trade open, says how long it lasts instead of a clock time', () => {
    render(<LockDurationPicker hours={168} setHours={() => {}} startsNow={false} />);
    expect(screen.getByText(/from the moment the lock starts/).textContent).toContain('7 days');
  });
});
