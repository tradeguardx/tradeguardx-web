import { describe, expect, it } from 'vitest';
import { rMultipleGap, stopCellFor, stopPriceOf } from './stopLoss';

/*
 * A trader set a stop and the site said "none set". "none set" is a verdict;
 * it may only come from hasStopLoss === false, never from missing data.
 */
describe('stopCellFor', () => {
  it('shows the price when the API has one', () => {
    expect(stopCellFor({ stopLoss: '61900', hasStopLoss: true })).toEqual({ text: '61900', tone: 'price' });
  });
  it('keeps the older field names as fallbacks', () => {
    expect(stopCellFor({ stop_loss: 10 }).text).toBe('10');
    expect(stopCellFor({ stopPrice: 11 }).text).toBe('11');
  });
  it('says "set" for a stop without a price (Shark)', () => {
    expect(stopCellFor({ stopLoss: null, hasStopLoss: true })).toEqual({ text: 'set', tone: 'set' });
  });
  it('says "none set" only when we know there is no stop', () => {
    expect(stopCellFor({ stopLoss: null, hasStopLoss: false })).toEqual({ text: 'none set', tone: 'none' });
  });
  it('is a neutral dash when there is no stop data', () => {
    expect(stopCellFor({ stopLoss: null, hasStopLoss: null })).toEqual({ text: '—', tone: 'unknown' });
    expect(stopCellFor({})).toEqual({ text: '—', tone: 'unknown' });
    expect(stopCellFor(null).tone).toBe('unknown');
  });
});

describe('rMultipleGap', () => {
  it('does not blame the stop when there is a price', () => {
    expect(rMultipleGap({ stopLoss: '90', entryPrice: '100', exitPrice: null })).toMatch(/once the trade closes/);
    expect(rMultipleGap({ stopLoss: '100', entryPrice: '100', exitPrice: '110' })).toMatch(/Stop at entry/);
  });
  it('is accurate for a stop without a price', () => {
    expect(rMultipleGap({ hasStopLoss: true })).toMatch(/^Stop set — the exchange doesn’t report its price/);
  });
  it('separates no stop from no data', () => {
    expect(rMultipleGap({ hasStopLoss: false })).toMatch(/No stop loss on this trade/);
    expect(rMultipleGap({ hasStopLoss: null })).toBe('No stop data for this trade');
    expect(rMultipleGap(null)).toBe('No stop data for this trade');
  });
});

describe('stopPriceOf', () => {
  it('treats empty strings as no price', () => {
    expect(stopPriceOf({ stopLoss: '' })).toBeNull();
  });
});
