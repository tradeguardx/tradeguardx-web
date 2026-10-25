import { useState } from 'react';
import { Link } from 'react-router-dom';
import StarPicker from './Stars';
import ReviewCard, { VerifiedBadge } from './ReviewCard';
import './reviews.css';

const ANON = 'A TradeGuardX trader';
const REDACTED = { email: 'an email address', phone: 'a phone number', link: 'a link' };

function listOf(kinds) {
  const words = kinds.map((k) => REDACTED[k]).filter(Boolean);
  if (words.length < 2) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/** The question under the stars follows the rating, so the box never feels blank. */
const PROMPT = {
  1: 'What went wrong?',
  2: 'What went wrong?',
  3: 'What would make it better?',
  4: 'What do you like about it?',
  5: 'What do you like about it?',
};

/**
 * The review form, shared by /dashboard/review and the /review?t=… link page.
 *
 * Deliberately short: stars first, then one box, then post. The policy is one
 * line under the button rather than a block above it. Someone with a review
 * already sees it as a card with Edit and Delete, not a pre-filled form.
 */
export default function ReviewForm({ state, onSave, onDelete }) {
  const limits = state.limits ?? { bodyMin: 20, bodyMax: 2000, displayNameMax: 40 };
  const [current, setCurrent] = useState(state.review);
  const [mode, setMode] = useState(state.review ? 'view' : 'edit');
  const [justSaved, setJustSaved] = useState(false);

  if (!state.eligible) {
    return (
      <div className="rvw rvw-empty">
        <p className="rvw-empty-title">Connect an exchange to leave a review</p>
        <p className="rvw-empty-text">Every review shows the exchange the reviewer trades on, so we need yours first.</p>
        <Link to="/dashboard/connect" className="rvw-btn rvw-btn-primary">Connect an exchange</Link>
      </div>
    );
  }

  if (mode === 'deleted') {
    return (
      <div className="rvw rvw-empty rvw-saved">
        <p className="rvw-empty-title">Review deleted</p>
        <button type="button" className="rvw-btn rvw-btn-ghost" onClick={() => { setCurrent(null); setMode('edit'); }}>
          Write a new one
        </button>
      </div>
    );
  }

  if (mode === 'view' && current) {
    return (
      <ReviewView
        review={current}
        justSaved={justSaved}
        onEdit={() => { setJustSaved(false); setMode('edit'); }}
        onDelete={onDelete ? async () => { await onDelete(); setMode('deleted'); } : null}
      />
    );
  }

  return (
    <Editor
      state={state}
      existing={current}
      limits={limits}
      onCancel={current ? () => setMode('view') : null}
      onSaved={(r) => { setCurrent(r); setJustSaved(true); setMode('view'); }}
      onSave={onSave}
    />
  );
}

function Editor({ state, existing, limits, onSave, onSaved, onCancel }) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? '');
  const [anon, setAnon] = useState(existing?.displayName === ANON);
  const initialName = existing && existing.displayName !== ANON ? existing.displayName : state.defaultName === ANON ? '' : state.defaultName ?? '';
  const [name, setName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const len = body.trim().length;
  const short = limits.bodyMin - len;
  const ready = rating > 0 && len >= limits.bodyMin && len <= limits.bodyMax && !busy;
  const shownName = anon || !name.trim() ? ANON : name.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      const res = await onSave({ rating, title: existing?.title ?? null, body: body.trim(), displayName: shownName });
      onSaved(res.review);
    } catch (err) {
      setError(err?.message || 'Couldn’t post that. Try again in a moment.');
      setBusy(false);
    }
  };

  return (
    <form className="rvw rvw-form" onSubmit={submit} noValidate>
      <div className="rvw-center">
        <h2 className="rvw-q">{existing ? 'Edit your review' : 'How’s TradeGuardX been for you?'}</h2>
        <StarPicker value={rating} onChange={setRating} size={40} />
      </div>

      {rating > 0 && (
        <div className="rvw-reveal">
          <label className="rvw-sr" htmlFor="rvw-body">Your review</label>
          <textarea
            id="rvw-body"
            className="rvw-field"
            value={body}
            autoFocus={!existing}
            maxLength={limits.bodyMax + 200}
            onChange={(e) => setBody(e.target.value)}
            placeholder={PROMPT[rating]}
          />
          <div className="rvw-meta">
            <span>{short > 0 ? `${short} more character${short === 1 ? '' : 's'}` : ''}</span>
            {len > limits.bodyMax * 0.8 && <span className={len > limits.bodyMax ? 'rvw-over' : ''}>{len}/{limits.bodyMax}</span>}
          </div>

          <div className="rvw-who">
            <span className="rvw-avatar" aria-hidden>{shownName === ANON ? '?' : shownName.charAt(0).toUpperCase()}</span>
            <div className="rvw-who-text">
              {editingName && !anon ? (
                <input
                  className="rvw-field rvw-name"
                  value={name}
                  autoFocus
                  maxLength={limits.displayNameMax}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setEditingName(false))}
                  aria-label="Name shown"
                />
              ) : (
                <span className="rvw-who-name">
                  {shownName}
                  {!anon && (
                    <button type="button" className="rvw-link" onClick={() => setEditingName(true)}>
                      change
                    </button>
                  )}
                </span>
              )}
              <VerifiedBadge exchanges={state.exchanges} traderSince={state.traderSince} compact />
              <label className="rvw-toggle">
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
                Hide my name
              </label>
            </div>
          </div>

          {error && <p role="alert" className="rvw-error">{error}</p>}

          <div className="rvw-actions">
            <button type="submit" className="rvw-btn rvw-btn-primary" disabled={!ready}>
              {busy ? 'Posting…' : existing ? 'Save changes' : 'Post review'}
            </button>
            {onCancel && (
              <button type="button" className="rvw-btn rvw-btn-ghost" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
          <p className="rvw-foot">Public right away. We never hide a review for being negative.</p>
        </div>
      )}
    </form>
  );
}

function ReviewView({ review, justSaved, onEdit, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="rvw">
      {justSaved && (
        <div className="rvw-done rvw-saved">
          <span className="rvw-tick" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
          </span>
          <div>
            <p className="rvw-done-title">Thanks. It’s live.</p>
            <p className="rvw-done-text">
              <Link to="/reviews">See it on the reviews page</Link>
              {review.redactions?.length ? ` · we blanked out ${listOf(review.redactions)}` : ''}
            </p>
          </div>
        </div>
      )}
      {!justSaved && <p className="rvw-kicker">Your review</p>}
      {review.status === 'hidden' && (
        <p className="rvw-error">Hidden: {review.hidden?.reason}. Edit it and we’ll look again.</p>
      )}
      <ReviewCard review={review} animate={justSaved} />
      <div className="rvw-actions">
        <button type="button" className="rvw-btn rvw-btn-ghost" onClick={onEdit}>Edit</button>
        {onDelete && !confirm && (
          <button type="button" className="rvw-btn rvw-btn-text" onClick={() => setConfirm(true)}>Delete</button>
        )}
        {onDelete && confirm && (
          <>
            <button
              type="button"
              className="rvw-btn rvw-btn-danger"
              disabled={busy}
              onClick={async () => { setBusy(true); try { await onDelete(); } finally { setBusy(false); } }}
            >
              {busy ? 'Deleting…' : 'Yes, delete it'}
            </button>
            <button type="button" className="rvw-btn rvw-btn-text" onClick={() => setConfirm(false)}>Keep it</button>
          </>
        )}
      </div>
    </div>
  );
}
