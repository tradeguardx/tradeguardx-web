import { useEffect, useMemo, useState } from 'react';
import { validateCoupon } from '../../api/paymentsApi';
import { useActiveOffer } from '../../hooks/useActiveOffer';
import { checkoutCouponCode } from '../../lib/checkoutCoupon';
import { getStoredReferralCode } from '../../lib/referralCode';
import { getLinkPromoCode } from '../../lib/promoLink';
import { offerCoversInterval } from '../../lib/siteOffer';

const checkAll = (token, code, intervals) =>
  Promise.all(
    intervals.map((iv) =>
      validateCoupon({ accessToken: token, code, planSlug: 'pro', interval: iv })
        .then((res) => [iv, res])
        /* One interval failing must not throw away the other two. */
        .catch(() => [iv, { valid: false, reason: 'LOOKUP' }]),
    ),
  ).then(Object.fromEntries);

/**
 * The discount for someone subscribing again from Plan & billing, after a
 * trial or a plan has ended.
 *
 * Checkout already applied the site offer for them, but this page priced every
 * button at list and had nowhere to type a code. Someone who saw "use code
 * DIWALI25" on the site came here, read ₹1,299, and had no reason to believe
 * they would pay less. As in BillingStep, only a discount the server has
 * confirmed changes a price on screen.
 *
 * `enabled` is false in every other page state: those people have a mandate,
 * or owe a retry on one, and a new code does not apply to them.
 */
export function useSubscribeDiscount({ enabled, intervals, token }) {
  const { offer } = useActiveOffer();
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState(null);
  const [checking, setChecking] = useState(false);
  const [offerCheck, setOfferCheck] = useState(null);

  const typed = coupon.trim().toUpperCase();
  const key = intervals.join(',');
  const ownCode = useMemo(() => Boolean(getStoredReferralCode() || getLinkPromoCode()), []);
  const offerCode =
    enabled && !typed && !ownCode && offer && intervals.some((iv) => offerCoversInterval(offer, iv)) ? offer.code : null;

  useEffect(() => {
    if (!offerCode || !token || !key) return undefined;
    let alive = true;
    checkAll(token, offerCode, key.split(',')).then((byInterval) => {
      if (alive) setOfferCheck({ code: offerCode, byInterval });
    });
    return () => { alive = false; };
  }, [offerCode, key, token]);

  const offerVerdicts = offerCode && offerCheck?.code === offerCode ? offerCheck.byInterval : null;
  const verdicts = typed ? (applied?.code === typed ? applied.byInterval : null) : offerVerdicts;
  const discountFor = (iv) => (verdicts?.[iv]?.valid ? verdicts[iv] : null);
  const best = intervals.map(discountFor).find(Boolean) ?? null;

  /*
   * A typed code the server refused is not sent. Dodo ignores an unknown code
   * silently, and sending one also stops checkout applying the live offer, so
   * a typo would have cost them the discount they came for.
   */
  const codeFor = (iv) => {
    if (typed) {
      const v = verdicts?.[iv];
      const refused = v && !v.valid && v.reason !== 'LOOKUP' && v.reason !== 'UNSUPPORTED';
      return refused ? undefined : typed;
    }
    return checkoutCouponCode({ interval: iv, multiInterval: intervals.length > 1, offer });
  };

  const apply = async () => {
    if (!typed || checking || !token) return;
    setChecking(true);
    try {
      setApplied({ code: typed, byInterval: await checkAll(token, typed, intervals) });
    } finally {
      setChecking(false);
    }
  };

  return {
    offer,
    offerCode,
    coupon,
    setCoupon: (v) => { setCoupon(v); setApplied(null); },
    typed,
    checked: Boolean(typed && verdicts),
    refusal: verdicts && !best ? Object.values(verdicts)[0]?.reason ?? 'UNKNOWN' : null,
    apply,
    checking,
    best,
    discountFor,
    codeFor,
  };
}
