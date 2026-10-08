import { getStoredReferralCode } from './referralCode';
import { getLinkPromoCode } from './promoLink';
import { getActivePromo } from './activePromo';

/**
 * The code to send to checkout, if any. Referral > promo link (?promo=) >
 * site-wide promo from env.
 *
 * Moved out of PricingPage because the setup flow's billing step needs it
 * too. It was only ever applied on the pricing page, so anyone who arrived
 * through a referral link and then subscribed from setup lost the
 * attribution silently: the referee paid full price and the referrer was
 * never credited for a sale they made.
 *
 * THE INTERVAL RESTRICTION BELONGS TO PROMOS, NOT REFERRALS. A site-wide
 * promo is advertised against the monthly price, so applying it to a
 * quarterly or yearly checkout would make the banner's promise untrue —
 * that is what the restriction is for.
 *
 * A referral code has no such tie. It is meant to work on every plan, and
 * the voucher owed to the referrer is tiered BY the plan bought, so
 * quarterly and yearly are the ones worth attributing most.
 */
export function checkoutCouponCode({ interval, multiInterval }) {
  const referral = getStoredReferralCode();
  if (referral) return referral;

  if (multiInterval && interval !== 'monthly') return undefined;
  return getLinkPromoCode() || getActivePromo()?.code || undefined;
}
