import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { captureReferralFromUrl } from '../../lib/referralCode';
import ReferralCelebration from './ReferralCelebration';

/**
 * Mounts inside <BrowserRouter>. On every route change, reads `?ref=CODE`
 * from the URL and persists it. When a *new* code is captured (not a repeat
 * of what's already stored), shows a one-shot celebratory toast.
 */
export default function ReferralCapture() {
  const { search } = useLocation();
  const [celebrationCode, setCelebrationCode] = useState(null);

  useEffect(() => {
    const result = captureReferralFromUrl(search);
    if (result?.isNew) {
      setCelebrationCode(result.code);
    }
  }, [search]);

  const handleClose = useCallback(() => setCelebrationCode(null), []);

  return <ReferralCelebration code={celebrationCode} onClose={handleClose} />;
}
