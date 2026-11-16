import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  captureReferralFromUrl,
  clearReferralBindPending,
  clearReferralCode,
  getStoredReferralCode,
  isReferralBindPending,
  markReferralBindPending,
  stripRefFromAddressBar,
} from '../../lib/referralCode';
import { captureLinkPromoFromUrl } from '../../lib/promoLink';
import { bindReferral } from '../../api/referralApi';
import ReferralCelebration from './ReferralCelebration';

/**
 * Mounts inside <BrowserRouter> and <AuthProvider>.
 *
 * CAPTURE. On every route change, reads `?ref=CODE`, stores it (30 days, see
 * lib/referralCode), marks a bind as pending and takes `ref` out of the
 * address bar. A *new* code shows a one-shot celebratory toast.
 *
 * BIND. Once someone is signed in — straight after signup, or on any later
 * load — the stored code is sent to POST /payments/referral/bind, once. That
 * ties the friend to the referrer on the server, so the referral survives a
 * different browser at checkout or the 30-day local expiry. Fire-and-forget:
 * nothing waits on it and nothing is shown. Any 200 clears the pending flag;
 * a failure leaves it for the next load.
 */
/** One bind call at a time across the app; any 200 clears the pending flag. */
let inFlight = false;
function bindIfPending(token) {
  if (!token || inFlight || !isReferralBindPending()) return;
  const code = getStoredReferralCode();
  if (!code) {
    // Expired or cleared: nothing left to bind.
    clearReferralBindPending();
    return;
  }
  inFlight = true;
  bindReferral({ accessToken: token, code })
    .then((res) => {
      clearReferralBindPending();
      // Your own link: keep it out of your own checkout and pricing pill.
      if (res?.bound === false && res?.reason === 'own_code') clearReferralCode();
    })
    .catch(() => { /* leave pending; the next signed-in load retries */ })
    .finally(() => { inFlight = false; });
}

export default function ReferralCapture() {
  const { search } = useLocation();
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const tokenRef = useRef(token);
  const [celebrationCode, setCelebrationCode] = useState(null);

  useEffect(() => {
    tokenRef.current = token;
    bindIfPending(token);
  }, [token]);

  useEffect(() => {
    // A promo link (?promo=CODE, from the promo email) is stored quietly — no
    // celebration, the email already did that.
    captureLinkPromoFromUrl(search);
    const result = captureReferralFromUrl(search);
    if (result) {
      markReferralBindPending();
      stripRefFromAddressBar();
      // Already signed in when they followed the link.
      bindIfPending(tokenRef.current);
      if (result.isNew) setCelebrationCode(result.code);
    }
  }, [search]);

  const handleClose = useCallback(() => setCelebrationCode(null), []);

  return <ReferralCelebration code={celebrationCode} onClose={handleClose} />;
}
