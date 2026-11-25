/**
 * The code the pricing page sends to checkout: the site offer it shows, where
 * that offer covers the interval. Nothing else.
 *
 * ONLY WHAT IS ON SCREEN IS SENT (owner, 21 Nov 2026). This used to send a
 * referral (?ref=) or promo-link (?promo=) code saved in the browser first.
 * A dead one ("PRODUCTHUNT") then failed checkout with no code anywhere on
 * screen to remove. Anyone with a code types it in the coupon box (setup,
 * Plan & billing) or on the payment page and applies it.
 *
 * `offer` is the applicable offer from useActiveOffer: null while loading,
 * outside its audience, or after it ends.
 */
export function checkoutCouponCode({ interval, offer = null }) {
  if (offer?.code && offer.intervals?.includes(interval)) return offer.code;
  return undefined;
}
