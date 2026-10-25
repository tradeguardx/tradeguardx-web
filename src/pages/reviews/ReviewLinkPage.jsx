import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import ReviewForm from '../../components/reviews/ReviewForm';
import { getReviewByToken, saveReviewByToken } from '../../api/reviewsApi';

/**
 * /review?t=… — the personal link from an email or WhatsApp. No login: the
 * signed token says who you are, and only lets you write your own review.
 * noindex; it is a form, not content.
 */
export default function ReviewLinkPage() {
  useSEO({ title: 'Leave a review', url: 'https://tradeguardx.com/review', noindex: true });
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [state, setState] = useState(null);
  const [error, setError] = useState(token ? '' : 'This link is missing its code. Open the link from your email again.');

  useEffect(() => {
    if (!token) return undefined;
    const ctrl = new AbortController();
    getReviewByToken(token, { signal: ctrl.signal })
      .then(setState)
      .catch((e) => e?.name !== 'AbortError' && setError(e?.message || 'This link isn’t working.'));
    return () => ctrl.abort();
  }, [token]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#07090f' }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-24 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">TradeGuardX reviews</p>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-400">Takes a minute. Good or bad, it goes up as you write it.</p>
        <div className="mt-8 rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          {error ? (
            <div>
              <p className="text-[15px] text-rose-400" role="alert">{error}</p>
              <Link to="/dashboard/review" className="mt-4 inline-block text-[14px] font-semibold text-accent hover:underline">
                Sign in and review from your dashboard →
              </Link>
            </div>
          ) : !state ? (
            <p className="text-[14px] text-slate-500">Loading…</p>
          ) : (
            <ReviewForm state={state} onSave={(r) => saveReviewByToken(token, r)} />
          )}
        </div>
      </div>
    </div>
  );
}
