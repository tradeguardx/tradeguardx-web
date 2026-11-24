import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getMyReview, saveMyReview } from '../../api/reviewsApi';
import { trackCtaClick } from '../../lib/analytics';
import ReviewForm from '../reviews/ReviewForm';
import { SKIP_PATHS, askedToday, dayOf, shouldAsk } from './reviewPromptGate';

/**
 * "How's TradeGuardX been for you?" — a review popup in the dashboard
 * (owner, 24 Nov 2026; replaces the 25 Oct "avatar menu only" decision).
 *
 * WHO: eligible to review (has ever connected a key), has not reviewed, and
 * first connected at least MIN_DAYS ago so they have used it. Never decided by
 * how their trading went (owner rule, 25 Oct): no P&L, lock or loss signal is
 * read here, so a bad day is as likely to be asked as a good one.
 *
 * WHEN: DELAY_MS after landing in the dashboard, never on setup, billing or the
 * review page, never over another dialog (it waits and retries).
 *
 * HOW OFTEN (owner, 24 Nov 2026): once a day, every day, until they review.
 * "Once a day" is the calendar day in their timezone, so it greets the first
 * visit each morning, not exactly 24 h later. "Don't ask again" = never (kept
 * as the one way out of a daily ask). Per user, per browser (localStorage); a
 * written review stops it everywhere because /reviews/me then returns it.
 *
 * The form inside is the same ReviewForm as /dashboard/review, so writing here
 * publishes exactly like writing there.
 */
const DELAY_MS = 8_000;
const RETRY_MS = 20_000;
const MAX_RETRIES = 3;

const keyFor = (userId) => `tgx_review_prompt_v1:${userId}`;
function readMemo(userId) {
  try { return JSON.parse(localStorage.getItem(keyFor(userId)) || '{}') || {}; } catch { return {}; }
}
function writeMemo(userId, memo) {
  try { localStorage.setItem(keyFor(userId), JSON.stringify(memo)); } catch { /* best-effort */ }
}
const track = (k) => { try { trackCtaClick(k); } catch { /* best-effort */ } };

const otherDialogOpen = () => Boolean(document.querySelector('[role="dialog"], [aria-modal="true"]'));

export default function ReviewPrompt() {
  const { session, user } = useAuth();
  const token = session?.access_token;
  const userId = user?.id;
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);
  const [posted, setPosted] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (!token || !userId || decided.current) return undefined;
    let cancelled = false;
    let timer;
    let tries = 0;
    const ctrl = new AbortController();

    const attempt = async () => {
      if (cancelled) return;
      // Cheap local checks first: most visits end here with no request.
      const memo = readMemo(userId);
      if (memo.never || askedToday(memo, Date.now())) {
        decided.current = true;
        return;
      }
      let data = me;
      if (!data) {
        try { data = await getMyReview(token, { signal: ctrl.signal }); } catch { return; } // fail closed: no popup
        if (cancelled) return;
        setMe(data);
      }
      if (!shouldAsk({ me: data, memo, now: Date.now(), pathname: pathRef.current })) {
        // A skipped path only defers; anything else is final for this visit.
        if (!SKIP_PATHS.some((p) => pathRef.current.startsWith(p))) decided.current = true;
        else if (tries++ < MAX_RETRIES) timer = setTimeout(attempt, RETRY_MS);
        return;
      }
      if (otherDialogOpen()) {
        if (tries++ < MAX_RETRIES) timer = setTimeout(attempt, RETRY_MS);
        return;
      }
      decided.current = true;
      writeMemo(userId, { ...memo, lastDay: dayOf(Date.now()), count: (memo.count ?? 0) + 1 });
      track('review_prompt_shown');
      setOpen(true);
    };

    timer = setTimeout(attempt, DELAY_MS);
    return () => { cancelled = true; clearTimeout(timer); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  const close = useCallback((why) => {
    setOpen(false);
    if (why === 'never' && userId) writeMemo(userId, { ...readMemo(userId), never: true });
    if (!posted) track(why === 'never' ? 'review_prompt_never' : 'review_prompt_later');
  }, [userId, posted]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close('later'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && me && (
        <ReviewPromptDialog
          me={me}
          posted={posted}
          onSave={async (r) => {
            const res = await saveMyReview(token, r);
            setPosted(true);
            track('review_prompt_posted');
            return res;
          }}
          onLater={() => close('later')}
          onNever={() => close('never')}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ───────────────────────── presentational dialog ───────────────────────── */

function Sparkles() {
  const reduce = useReducedMotion();
  const dots = [
    { x: '12%', y: '30%', s: 5, d: 0 },
    { x: '84%', y: '22%', s: 4, d: 0.6 },
    { x: '74%', y: '68%', s: 6, d: 1.2 },
    { x: '22%', y: '74%', s: 4, d: 1.8 },
    { x: '50%', y: '12%', s: 3, d: 0.9 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((p) => (
        <motion.span
          key={p.x + p.y}
          className="absolute rounded-full"
          style={{ left: p.x, top: p.y, width: p.s, height: p.s, background: '#f5b545', boxShadow: '0 0 10px rgba(245,181,69,.8)' }}
          animate={reduce ? { opacity: 0.6 } : { opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
          transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, delay: p.d, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export function ReviewPromptDialog({ me, posted, onSave, onLater, onNever }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-[75] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button type="button" aria-label="Close" onClick={onLater} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-prompt-title"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[460px] overflow-y-auto overflow-x-hidden rounded-2xl border shadow-2xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <div
          className="relative px-6 pb-2 pt-7 text-center"
          style={{ background: 'radial-gradient(120% 100% at 50% 0%, rgba(245,181,69,.16), transparent 70%)' }}
        >
          <Sparkles />
          <button
            type="button"
            onClick={onLater}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <motion.div
            className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(245,181,69,.14)', border: '1px solid rgba(245,181,69,.35)' }}
            animate={reduce ? undefined : { rotate: [0, -6, 6, -3, 0] }}
            transition={reduce ? undefined : { duration: 1.1, delay: 0.4, ease: 'easeInOut' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#f5b545" aria-hidden>
              <path d="M12 2.8l2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.83 6.5 19.72l1.05-6.12L3.1 9.27l6.15-.9z" />
            </svg>
          </motion.div>
          <p className="relative mt-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#f5b545' }} id="review-prompt-title">
            One minute, if you have it
          </p>
          <p className="relative mx-auto mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            Your review helps other traders decide. Good or bad, it goes up exactly as you write it.
          </p>
        </div>

        <div className="px-5 pb-5 pt-1 sm:px-6">
          <ReviewForm state={me} onSave={onSave} />
          <div className="mt-4 flex items-center justify-center gap-5 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
            {posted ? (
              <button type="button" onClick={onLater} className="rounded-lg px-4 py-2 text-[13px] font-semibold" style={{ color: 'var(--ink)', background: 'var(--surface-2)' }}>
                Close
              </button>
            ) : (
              <>
                <button type="button" onClick={onLater} className="text-[13px] font-semibold" style={{ color: 'var(--ink-2)' }}>
                  Not now
                </button>
                <button type="button" onClick={onNever} className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>
                  Don’t ask again
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
