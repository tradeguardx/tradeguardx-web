import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const DISMISS_KEY = 'tgx_floating_cta_dismissed';

function initiallyDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Sticky signup CTA — a floating dark pill that slides in once the visitor has
 * scrolled past the hero and is actually reading, then hides again near the
 * footer (where the page's own final CTA lives) and can be dismissed for the
 * session.
 *
 * Shown on ALL breakpoints, centered as a floating pill with a margin from the
 * edges (never a full-bleed bar). On desktop it sits well clear of the
 * bottom-right scroll-to-top button; on mobile that button is hidden (see
 * ReadingProgress) so the two never collide.
 *
 * Layout is built to keep the text clean at every width: the icon drops on very
 * small phones, the headline stays on one line where it fits and wraps to two
 * gracefully where it doesn't, and the button/close never shrink.
 */
export default function FloatingSignupCTA() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(initiallyDismissed);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // One-tap Google signup — same flow the signup page uses. New users land on the
  // dashboard with the welcome celebration; if OAuth can't start (misconfig), fall
  // back to the normal signup page so the CTA is never a dead end.
  const startGoogleSignup = async () => {
    try {
      await loginWithGoogle('/dashboard?welcome=1');
    } catch {
      navigate('/signup');
    }
  };

  useEffect(() => {
    if (dismissed) return undefined;

    const onScroll = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      const pastHero = y > vh * 0.9;
      const nearBottom = y + vh > docH - vh * 0.9;
      setVisible(pastHero && !nearBottom);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [dismissed]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 bottom-3 z-[45] flex justify-center px-3 sm:bottom-5 sm:px-4"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="flex w-full max-w-xl items-center gap-3 rounded-2xl border px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3"
            style={{
              pointerEvents: 'auto',
              backgroundColor: 'rgba(11, 16, 26, 0.94)',
              borderColor: 'rgba(255,255,255,0.09)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 16px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,170,0.06)',
            }}
          >
            {/* Icon badge — dropped on phones (<640px) to give the text room. */}
            <span
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full sm:flex"
              style={{ backgroundColor: 'rgba(0,212,170,0.14)', border: '1px solid rgba(0,212,170,0.28)' }}
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="#00d4aa">
                <path d="M11 1.5 3.5 11H9l-1.2 7.5L16.5 8.5H11L11 1.5Z" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-display text-[13.5px] font-bold leading-tight text-white sm:text-[15px]">
                Start protecting your account
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400 sm:text-xs">
                7-day free trial &middot; No card &middot; Cancel anytime
              </p>
            </div>

            <button
              type="button"
              onClick={startGoogleSignup}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold text-[#052418] transition-transform hover:scale-[1.03] active:scale-[0.98] sm:px-4 sm:py-2.5 sm:text-sm"
              style={{ backgroundColor: 'var(--accent, #00d4aa)' }}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white sm:h-[18px] sm:w-[18px]">
                <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </span>
              Try Free
            </button>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
