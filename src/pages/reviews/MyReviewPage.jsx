import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sx } from '../../components/dashboard/shell/sx';
import ReviewForm from '../../components/reviews/ReviewForm';
import { deleteMyReview, getMyReview, saveMyReview } from '../../api/reviewsApi';

/**
 * /dashboard/review — write, edit or delete your own review.
 *
 * Renders nothing until the state loads (no "you can't review" flash for a
 * user who can), then the shared form. The form handles not-eligible itself.
 */
export default function MyReviewPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [state, setState] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return undefined;
    const ctrl = new AbortController();
    getMyReview(accessToken, { signal: ctrl.signal })
      .then(setState)
      .catch((e) => e?.name !== 'AbortError' && setError(e?.message || 'Could not load your review.'));
    return () => ctrl.abort();
  }, [accessToken]);

  return (
    <div style={sx('max-width:680px')}>
      <div style={sx('margin-bottom:16px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Your review</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>
          Good or bad, it goes up exactly as you write it.
        </p>
      </div>
      <section style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);padding:26px 22px')}>
        {error && <p role="alert" style={sx('margin:0;color:var(--red);font-size:13.5px')}>{error}</p>}
        {!error && !state && <p style={sx('margin:0;color:var(--ink-3);font-size:13.5px')}>Loading…</p>}
        {state && (
          <ReviewForm
            key={state.review?.id ?? 'new'}
            state={state}
            onSave={(r) => saveMyReview(accessToken, r)}
            onDelete={() => deleteMyReview(accessToken)}
          />
        )}
      </section>
    </div>
  );
}
