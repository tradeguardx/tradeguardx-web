import { useEffect, useRef, useState } from 'react';
import { validateCoupon } from '../../api/paymentsApi';
import { getInvitedBy } from '../../api/referralApi';
import { useActiveOffer } from '../../hooks/useActiveOffer';
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

  /* A friend's referral, shown in the box and checked like any code (owner,
     21 Nov 2026): the discount checkout would otherwise add unseen. Removing
     it sends skipReferral so checkout does not put it back. */
  const [invited, setInvited] = useState(null);
  const [referralRemoved, setReferralRemoved] = useState(false);
  const invitedTried = useRef(false);
  const couponRef = useRef(coupon);
  useEffect(() => { couponRef.current = coupon; }, [coupon]);
  useEffect(() => {
    if (!enabled || !token || !key || invitedTried.current) return;
    invitedTried.current = true;
    getInvitedBy({ accessToken: token })
      .then(async (inv) => {
        if (!inv?.code) return;
        setInvited(inv);
        if (couponRef.current.trim()) return;
        setCoupon(inv.code);
        setChecking(true);
        try {
          setApplied({ code: inv.code, byInterval: await checkAll(token, inv.code, key.split(',')) });
        } finally {
          setChecking(false);
        }
      })
      .catch(() => { /* no line shown; checkout still applies the referral */ });
  }, [enabled, token, key]);
  const offerCode =
    enabled && !typed && offer && intervals.some((iv) => offerCoversInterval(offer, iv)) ? offer.code : null;

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
    /* Otherwise only the offer this page shows as applied, where the server
       confirmed it for this plan. Saved referral / promo-link codes are not
       sent unseen any more (owner, 21 Nov 2026): a code is typed and applied. */
    return offerCode && offerVerdicts?.[iv]?.valid ? offerCode : undefined;
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
    setCoupon: (v) => {
      if (!v && invited && typed === invited.code) setReferralRemoved(true);
      setCoupon(v);
      setApplied(null);
    },
    invitedName: invited && typed === invited.code ? invited.name : null,
    skipReferral: referralRemoved && !typed,
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
