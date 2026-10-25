import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StarPicker from './Stars';
import ReviewCard, { VerifiedBadge } from './ReviewCard';
import './reviews.css';

const ANON = 'A TradeGuardX trader';
const REDACTED = { email: 'an email address', phone: 'a phone number', link: 'a link' };

/** "a phone number and a link" */
function listOf(kinds) {
  const words = kinds.map((k) => REDACTED[k]).filter(Boolean);
  if (words.length < 2) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/**
 * The review form, shared by the dashboard (/dashboard/review) and the
 * personal link page (/review?t=…). `state` is what GET /reviews/me or
 * /reviews/by-token returns; `onSave` and `onDelete` do the network call.
 *
 * It says what will happen BEFORE the click — live immediately, low ratings
 * included, contact details blanked — because a reviewer who is surprised
 * afterwards stops trusting every other review on the page.
 */
export default function ReviewForm({ state, onSave, onDelete }) {
  const existing = state.review;
  const limits = state.limits ?? { bodyMin: 20, bodyMax: 2000, titleMax: 80, displayNameMax: 40 };

  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [anon, setAnon] = useState(existing?.displayName === ANON);
  const [name, setName] = useState(existing && existing.displayName !== ANON ? existing.displayName : state.defaultName === ANON ? '' : state.defaultName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const len = body.trim().length;
  const ready = rating > 0 && len >= limits.bodyMin && len <= limits.bodyMax && !busy;

  const preview = useMemo(
    () => ({
      id: 'preview',
      rating: rating || 5,
      title: title.trim() || null,
      body: body.trim() || 'Your review will appear here.',
      displayName: anon ? ANON : name.trim() || ANON,
      exchanges: state.exchanges,
      traderSince: state.traderSince,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      editedAt: existing ? new Date().toISOString() : null,
      hidden: null,
      reply: existing?.reply ?? null,
    }),
    [rating, title, body, anon, name, state, existing],
  );

  if (!state.eligible) {
    return (
      <div className="rv rv-card" style={{ padding: 22 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Reviews open once you’ve connected an exchange</p>
        <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--rv-ink-2)' }}>
          Every review on TradeGuardX shows the exchange the reviewer actually trades on. That only works if we can see
          it, so connect your exchange key first and then come back.
        </p>
        <Link to="/dashboard/connect" className="rv-btn" style={{ display: 'inline-block', marginTop: 14, textDecoration: 'none' }}>
          Connect an exchange
        </Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      const res = await onSave({
        rating,
        title: title.trim() || null,
        body: body.trim(),
        displayName: anon ? ANON : name.trim() || null,
      });
      setSaved(res.review);
    } catch (err) {
      setError(err?.message || 'Could not post your review. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onDelete();
      setSaved({ deleted: true });
    } catch (err) {
      setError(err?.message || 'Could not delete your review.');
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  if (saved?.deleted) {
    return (
      <div className="rv rv-card rv-saved" style={{ padding: 22 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Your review is deleted.</p>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--rv-ink-2)' }}>It’s gone from the public page. You can write a new one any time.</p>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="rv rv-saved">
        <div className="rv-card" style={{ padding: 22, borderColor: 'color-mix(in srgb, var(--rv-mint) 40%, transparent)' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>{existing ? 'Your review is updated.' : 'Thank you. Your review is live.'}</p>
          <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--rv-ink-2)' }}>
            It’s on the public <Link to="/reviews" style={{ color: 'var(--rv-mint)' }}>reviews page</Link> now, exactly as below.
            {saved.redactions?.length ? ` We blanked out ${listOf(saved.redactions)}, which we do for everyone’s privacy.` : ''}
          </p>
          {saved.status === 'hidden' && (
            <p style={{ margin: '10px 0 0', fontSize: 13.5, color: 'var(--rv-red)' }}>
              This review is currently hidden ({saved.hidden?.reason}). Your edit is saved; we’ll look at it again.
            </p>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <ReviewCard review={saved} />
        </div>
        <button type="button" className="rv-btn rv-btn-ghost" style={{ marginTop: 14 }} onClick={() => setSaved(null)}>
          Edit again
        </button>
      </div>
    );
  }

  return (
    <form className="rv" onSubmit={submit} noValidate>
      <div style={{ display: 'grid', gap: 22 }}>
        <div>
          <span className="rv-label">How has TradeGuardX been for you?</span>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div>
          <label className="rv-label" htmlFor="rv-body">Your review</label>
          <textarea
            id="rv-body"
            className="rv-field"
            value={body}
            maxLength={limits.bodyMax + 200}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened? Did a rule ever stop you? What annoyed you? Good and bad both help other traders."
          />
          <p className="rv-hint" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span>{len < limits.bodyMin ? `At least ${limits.bodyMin} characters` : 'Looks good'}</span>
            <span style={{ color: len > limits.bodyMax ? 'var(--rv-red)' : undefined }}>
              {len}/{limits.bodyMax}
            </span>
          </p>
        </div>

        <div>
          <label className="rv-label" htmlFor="rv-title">Headline <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <input id="rv-title" className="rv-field" value={title} maxLength={limits.titleMax} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annoying on the day, right every time" />
        </div>

        <div>
          <label className="rv-label" htmlFor="rv-name">Name shown</label>
          <input
            id="rv-name"
            className="rv-field"
            value={anon ? ANON : name}
            disabled={anon}
            maxLength={limits.displayNameMax}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name and initial"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, fontSize: 13, color: 'var(--rv-ink-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            Post without my name
          </label>
          <div style={{ marginTop: 10 }}>
            <span className="rv-hint" style={{ marginRight: 8 }}>Shown with every review:</span>
            <VerifiedBadge exchanges={state.exchanges} traderSince={state.traderSince} />
          </div>
        </div>

        <div className="rv-card" style={{ background: 'transparent' }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--rv-ink-2)' }}>Before you post</p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--rv-ink-2)' }}>
            <li>It goes live straight away. We don’t approve reviews first, and we never hide a review for being negative.</li>
            <li>Phone numbers, emails and links are blanked out automatically.</li>
            <li>You can edit or delete it later from your dashboard.</li>
            <li>We don’t pay or reward anyone for reviews.</li>
          </ul>
        </div>

        <div>
          <span className="rv-label">How it will look</span>
          <ReviewCard review={preview} animate={false} />
        </div>

        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 13.5, color: 'var(--rv-red)' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="rv-btn" disabled={!ready}>
            {busy ? 'Posting…' : existing ? 'Update review' : 'Post review'}
          </button>
          {existing && onDelete && !confirmDelete && (
            <button type="button" className="rv-btn rv-btn-ghost" onClick={() => setConfirmDelete(true)}>
              Delete review
            </button>
          )}
          {confirmDelete && (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              Delete for good?
              <button type="button" className="rv-btn" style={{ background: 'var(--rv-red)', borderColor: 'var(--rv-red)', color: '#fff' }} onClick={remove} disabled={busy}>
                Yes, delete
              </button>
              <button type="button" className="rv-btn rv-btn-ghost" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
