/* global process -- Node test runner: the device zone is process.env.TZ */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  allZones, browserZone, dayEnd, dayKey, formatDateKey, getUserZone, monthKey, setUserZone, subscribeUserZone,
  zoneLabel, zoneOffsetLabel, zonePlace,
} from './userZone';

/**
 * The display zone is the one thing every date on the dashboard depends on,
 * and it used to be "India, for everyone". These pin the order it is chosen
 * in, and the day arithmetic in the zones that break naive code: a
 * half-hour offset, and a DST night.
 */

const DEVICE = process.env.TZ;
beforeEach(() => { setUserZone(null); localStorage.clear(); });
afterEach(() => { process.env.TZ = DEVICE; setUserZone(null); });

describe('which zone wins', () => {
  it('uses the profile zone over the device', () => {
    process.env.TZ = 'Europe/London';
    setUserZone('Asia/Dubai');
    expect(getUserZone()).toBe('Asia/Dubai');
  });

  it('falls back to the device zone when the profile has none', () => {
    process.env.TZ = 'America/New_York';
    setUserZone(null);
    expect(browserZone()).toBe('America/New_York');
    expect(getUserZone()).toBe('America/New_York');
  });

  it('ignores a zone it cannot format in, rather than throwing on every date', () => {
    process.env.TZ = 'Asia/Dubai';
    setUserZone('Mars/Olympus_Mons');
    expect(getUserZone()).toBe('Asia/Dubai');
  });

  it('folds the old Calcutta spelling into Kolkata', () => {
    setUserZone('Asia/Calcutta');
    expect(getUserZone()).toBe('Asia/Kolkata');
  });

  it('remembers the profile zone for the next page load, and forgets it on sign-out', () => {
    setUserZone('Asia/Dubai');
    expect(localStorage.getItem('tgx.userZone')).toBe('Asia/Dubai');
    setUserZone(null);
    expect(localStorage.getItem('tgx.userZone')).toBeNull();
  });

  it('does not persist a mirrored user\'s zone', () => {
    setUserZone('Asia/Tokyo', { persist: false });
    expect(getUserZone()).toBe('Asia/Tokyo');
    expect(localStorage.getItem('tgx.userZone')).toBeNull();
  });

  it('tells subscribers when it changes', () => {
    const seen = [];
    const off = subscribeUserZone((tz) => seen.push(tz));
    setUserZone('Asia/Dubai');
    setUserZone('Asia/Dubai'); // no change, no call
    off();
    setUserZone('Asia/Tokyo');
    expect(seen).toEqual(['Asia/Dubai']);
  });
});

describe('labels', () => {
  it('names the common zones the way people there write them', () => {
    expect(zoneLabel('Asia/Kolkata')).toBe('IST');
    expect(zoneLabel('Asia/Dubai')).toBe('GST');
    expect(zoneLabel('UTC')).toBe('UTC');
    expect(zoneLabel('America/New_York', new Date('2026-07-01T12:00:00Z'))).toBe('EDT');
    expect(zoneLabel('Europe/London', new Date('2026-07-01T12:00:00Z'))).toBe('BST');
  });

  it('falls back to the offset where there is no common name', () => {
    expect(zoneLabel('Asia/Kathmandu')).toBe('GMT+5:45');
    expect(zoneOffsetLabel('Asia/Dubai')).toBe('GMT+4');
    expect(zoneOffsetLabel('Asia/Kolkata')).toBe('GMT+5:30');
    expect(zoneOffsetLabel('America/St_Johns', new Date('2026-01-15T12:00:00Z'))).toBe('GMT-3:30');
  });

  it('turns an IANA name into a place', () => {
    expect(zonePlace('Asia/Dubai')).toBe('Dubai');
    expect(zonePlace('America/New_York')).toBe('New York');
    expect(zonePlace('Asia/Kolkata')).toBe('India');
  });
});

describe('day keys', () => {
  it('splits the day at IST midnight — 18:30Z — for a half-hour zone', () => {
    expect(dayKey('2026-09-30T18:29:59Z', 'Asia/Kolkata')).toBe('2026-09-30');
    expect(dayKey('2026-09-30T18:30:00Z', 'Asia/Kolkata')).toBe('2026-10-01');
    expect(dayKey('2026-09-30T18:14:59Z', 'Asia/Kathmandu')).toBe('2026-09-30');
    expect(dayKey('2026-09-30T18:15:00Z', 'Asia/Kathmandu')).toBe('2026-10-01');
  });

  it('uses the profile zone by default', () => {
    setUserZone('Asia/Dubai');
    // 19:59Z is 23:59 GST on the 30th, and already 01:29 IST on the 1st.
    expect(dayKey('2026-09-30T19:59:00Z')).toBe('2026-09-30');
    expect(monthKey('2026-09-30T19:59:00Z')).toBe('2026-09');
    setUserZone('Asia/Kolkata');
    expect(dayKey('2026-09-30T19:59:00Z')).toBe('2026-10-01');
    expect(monthKey('2026-09-30T19:59:00Z')).toBe('2026-10');
  });

  it('keeps the right day across a DST change', () => {
    // New York springs forward on 8 Mar 2026: before it, midnight is 05:00Z;
    // after it, 04:00Z.
    expect(dayKey('2026-03-08T04:59:00Z', 'America/New_York')).toBe('2026-03-07');
    expect(dayKey('2026-03-08T05:00:00Z', 'America/New_York')).toBe('2026-03-08');
    expect(dayKey('2026-03-09T03:59:00Z', 'America/New_York')).toBe('2026-03-08');
    expect(dayKey('2026-03-09T04:00:00Z', 'America/New_York')).toBe('2026-03-09');
  });

  it('ends a 23-hour and a 25-hour day at the real midnight', () => {
    expect(new Date(dayEnd(Date.parse('2026-03-08T12:00:00Z'), 'America/New_York')).toISOString()).toBe('2026-03-09T03:59:59.999Z');
    expect(new Date(dayEnd(Date.parse('2026-11-01T12:00:00Z'), 'America/New_York')).toISOString()).toBe('2026-11-02T04:59:59.999Z');
    expect(new Date(dayEnd(Date.parse('2026-09-30T06:00:00Z'), 'Asia/Kolkata')).toISOString()).toBe('2026-09-30T18:29:59.999Z');
  });

  it('prints a server date key as that date in every zone', () => {
    setUserZone('America/Los_Angeles');
    expect(formatDateKey('2026-10-03')).toBe('3 Oct');
    setUserZone('Pacific/Kiritimati');
    expect(formatDateKey('2026-10-03')).toBe('3 Oct');
  });

  it('returns an empty key for a bad date instead of "Invalid Date"', () => {
    expect(dayKey('not a date')).toBe('');
  });
});

describe('the picker list', () => {
  it('includes UTC and Kolkata, once each, sorted', () => {
    const z = allZones();
    expect(z).toContain('UTC');
    expect(z).toContain('Asia/Kolkata');
    expect(z).not.toContain('Asia/Calcutta');
    expect(new Set(z).size).toBe(z.length);
    expect([...z].sort()).toEqual(z);
  });
});
