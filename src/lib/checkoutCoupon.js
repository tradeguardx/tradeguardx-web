import { getStoredReferralCode } from './referralCode';
import { getLinkPromoCode } from './promoLink';

/**
 * The code to send to checkout, if any. Referral > promo link (?promo=) >
 * the site-wide offer from the admin panel (src/api/offersApi.js).
 *
 * Moved out of PricingPage because the setup flow's billing step needs it
 * too. It was only ever applied on the pricing page, so anyone who arrived
 * through a referral link and then subscribed from setup lost the
 * attribution silently: the referee paid full price and the referrer was
 * never credited for a sale they made.
 *
 * A REFERRAL WINS. It is meant to work on every plan, and the voucher owed to
 * the referrer is tiered BY the plan bought. Dodo takes one code, so nothing
 * is stacked.
 *
 * A promo LINK code stays monthly-only on a multi-interval plan: the email
 * that carries it advertises it against the monthly price.
 *
 * The site OFFER says itself which intervals it covers (`offer.intervals`,
 * the same list its Dodo discount is restricted to), so it is sent exactly
 * there — including on an interval a link code does not cover, which is what
 * the server does when no code is sent. `offer` is the applicable offer from useActiveOffer — null while
 * loading, outside its audience, or after it ends. The server would apply it
 * on its own as well; sending it explicitly keeps the two in step.
 */
export function checkoutCouponCode({ interval, multiInterval, offer = null }) {
  const referral = getStoredReferralCode();
  if (referral) return referral;

  const link = getLinkPromoCode();
  if (link && !(multiInterval && interval !== 'monthly')) return link;

  if (offer?.code && offer.intervals?.includes(interval)) return offer.code;
  return undefined;
}
