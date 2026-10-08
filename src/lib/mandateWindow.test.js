import { describe, expect, it } from 'vitest';
import { debitMayBeInFlight, UPI_DEBIT_WINDOW_MS } from './mandateWindow';

const NOW = new Date('2026-10-09T12:00:00Z');
const inHours = (h) => new Date(NOW.getTime() + h * 3600000);

describe('debitMayBeInFlight', () => {
  /* Cancelling early is the common case and the promise holds for it. */
  it('is false with days to go, so "you will not be charged" stands', () => {
    expect(debitMayBeInFlight(inHours(24 * 6), NOW)).toBe(false);
    expect(debitMayBeInFlight(inHours(49), NOW)).toBe(false);
  });

  it('is true inside the UPI processing window', () => {
    expect(debitMayBeInFlight(inHours(47), NOW)).toBe(true);
    expect(debitMayBeInFlight(inHours(1), NOW)).toBe(true);
  });

  it('holds exactly at the boundary', () => {
    expect(debitMayBeInFlight(new Date(NOW.getTime() + UPI_DEBIT_WINDOW_MS), NOW)).toBe(true);
    expect(debitMayBeInFlight(new Date(NOW.getTime() + UPI_DEBIT_WINDOW_MS + 1), NOW)).toBe(false);
  });

  /* A date already past is not "in flight": that charge has landed or it has
     not, and this sentence is not the place to speculate. */
  it('is false once the date has passed', () => {
    expect(debitMayBeInFlight(inHours(-1), NOW)).toBe(false);
  });

  /* The caveat is an addition; showing it on a guess is its own error. */
  it('says nothing when the date is unknown or unparseable', () => {
    expect(debitMayBeInFlight(null, NOW)).toBe(false);
    expect(debitMayBeInFlight(undefined, NOW)).toBe(false);
    expect(debitMayBeInFlight('not-a-date', NOW)).toBe(false);
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(debitMayBeInFlight(inHours(10).toISOString(), NOW)).toBe(true);
  });
});
