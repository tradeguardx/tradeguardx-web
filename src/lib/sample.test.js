import { describe, expect, it } from 'vitest';
import { MIN_SAMPLE, enoughSample, inference, sampleGap, sampleNote } from './sample';

/**
 * These guard a claim, not a calculation: that the product does not describe a
 * trader's edge from a handful of trades.
 */
describe('sample gate', () => {
  it('holds an inference back until there is a sample', () => {
    // "Win rate 20%" on five trades becomes 33% with one more win. A
    // thirteen-point swing from a single outcome is not a description of
    // anybody's trading.
    expect(enoughSample(5)).toBe(false);
    expect(enoughSample(MIN_SAMPLE)).toBe(true);
    expect(enoughSample(MIN_SAMPLE - 1)).toBe(false);
  });

  it('counts down in trades, not in statistics', () => {
    expect(sampleNote(5)).toBe('needs 15 more trades');
    expect(sampleNote(19)).toBe('needs 1 more trade');
    expect(sampleNote(0)).toBe(`needs ${MIN_SAMPLE} closed trades`);
    expect(sampleNote(25)).toBe('');
  });

  it('survives a missing count', () => {
    expect(enoughSample(null)).toBe(false);
    expect(enoughSample(undefined)).toBe(false);
    expect(sampleGap(null)).toBe(MIN_SAMPLE);
  });

  it('renders the dash and the reason together', () => {
    const r = inference(5, 20, '1 of 5 trades', { format: (v) => `${v}%` });
    expect(r.v).toBe('—');
    expect(r.note).toBe('needs 15 more trades');
    expect(r.ready).toBe(false);
  });

  it('passes the value through once the bar is met', () => {
    const r = inference(40, 55, '22 of 40 trades', { format: (v) => `${v}%` });
    expect(r).toEqual({ v: '55%', note: '22 of 40 trades', ready: true });
  });

  it('still withholds when the figure itself is missing', () => {
    expect(inference(40, null, 'x').ready).toBe(false);
  });
});
