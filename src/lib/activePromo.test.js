import { describe, expect, it } from 'vitest';
import { discountedPrice, formatInr } from './activePromo';

/**
 * Guards for the promo price shown on the pricing cards and the launch banner.
 *
 * These numbers are advertised next to a struck-through list price and a
 * "nothing to enter" promise, so they are a commitment about money. The risk
 * they defend against is quoting a figure BELOW what Dodo actually charges —
 * a customer who is told ₹649 and billed ₹650 has been misled, in the one
 * direction that matters.
 *
 * Dodo computes the real charge from basis points on its side; we only ever
 * display. So the rule is: round, never floor.
 */

describe('discountedPrice', () => {
  it('rounds up on a half-rupee rather than down', () => {
    // 2999 × 50% = 1499.5 and 1299 × 50% = 649.5. Flooring would advertise
    // ₹1,499 and ₹649 — a rupee under, on both of the real plan prices.
    expect(discountedPrice(2999, 50)).toBe(1500);
    expect(discountedPrice(1299, 50)).toBe(650);
  });

  it('handles the real plan prices at other rates', () => {
    expect(discountedPrice(1299, 10)).toBe(1169); // 1169.1
    expect(discountedPrice(2999, 25)).toBe(2249); // 2249.25
  });

  it('returns null when there is no meaningful discount to show', () => {
    // A card that renders "null" is caught in review; one that renders the full
    // price as if discounted is not. So these must not fall back to the price.
    expect(discountedPrice(1299, 0)).toBeNull();
    expect(discountedPrice(1299, 100)).toBeNull();
    expect(discountedPrice(0, 50)).toBe(0);
    expect(discountedPrice(null, 50)).toBeNull();
    expect(discountedPrice(1299, null)).toBeNull();
    expect(discountedPrice(undefined, undefined)).toBeNull();
    expect(discountedPrice('abc', 50)).toBeNull();
  });
});

describe('formatInr', () => {
  it('groups digits the Indian way, not in thousands', () => {
    // en-US would render 149900 as "149,900" — wrong for an Indian price page.
    expect(formatInr(149900)).toBe('₹1,49,900');
    expect(formatInr(1500)).toBe('₹1,500');
    expect(formatInr(650)).toBe('₹650');
  });

  it('returns null for non-numeric input instead of "₹NaN"', () => {
    expect(formatInr(null)).toBeNull();
    expect(formatInr(undefined)).toBeNull();
    expect(formatInr('abc')).toBeNull();
  });
});
