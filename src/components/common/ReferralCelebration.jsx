import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AUTO_DISMISS_MS = 6000;

/**
 * Full-width announcement strip at the very top of the viewport. Slides down
 * over (above) the navbar, sits for ~6s while the auto-dismiss progress drains,
 * then slides back up. Triggered once when a *new* `?ref=CODE` is captured.
 *
 * z-[60] keeps it above the standard sticky nav (typically z-30/40).
 */
export default function ReferralCelebration({ code, onClose }) {
  useEffect(() => {
    if (!code) return;
    const t = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [code, onClose]);

  return (
    <AnimatePresence>
      {code && (
        <motion.div
          key="referral-strip"
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="fixed inset-x-0 top-0 z-[60]"
          role="status"
          aria-live="polite"
        >
          <div
            className="relative overflow-hidden"
            style={{
              background:
                'linear-gradient(90deg, #07090f 0%, #0d2a23 18%, #0a4f3e 50%, #0d2a23 82%, #07090f 100%)',
              borderBottom: '1px solid rgba(0,212,170,0.32)',
              boxShadow: '0 6px 24px -6px rgba(0,212,170,0.35)',
            }}
          >
            {/* Subtle moving sheen */}
            <motion.div
              className="pointer-events-none absolute inset-y-0 w-[40%]"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(0,212,170,0.18) 50%, transparent 100%)',
              }}
              initial={{ x: '-150%' }}
              animate={{ x: '350%' }}
              transition={{ duration: 1.6, delay: 0.15, ease: 'easeOut' }}
              aria-hidden
            />

            <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
              <div className="flex flex-1 items-center justify-center gap-3 text-center sm:gap-4">
                {/* Animated check */}
                <motion.div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
                    boxShadow: '0 0 14px rgba(0,212,170,0.55)',
                  }}
                  initial={{ scale: 0, rotate: -120 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.18 }}
                >
                  <motion.svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#07090f"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.32, ease: 'easeOut' }}
                    />
                  </motion.svg>
                </motion.div>

                {/* Copy */}
                <p className="text-[13px] sm:text-sm font-medium text-white">
                  <span
                    className="hidden sm:inline mr-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: '#7dffd4' }}
                  >
                    Referral applied
                  </span>
                  Discount code{' '}
                  <span
                    className="inline-block rounded-md px-1.5 py-0.5 font-mono text-[12px] font-bold tracking-wider"
                    style={{
                      background: 'rgba(0,212,170,0.18)',
                      color: '#7dffd4',
                      border: '1px solid rgba(0,212,170,0.35)',
                    }}
                  >
                    {code}
                  </span>{' '}
                  <span className="hidden sm:inline">will be applied at checkout.</span>
                  <span className="sm:hidden">at checkout.</span>
                </p>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss"
                className="shrink-0 rounded-md p-1.5 text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <motion.div
              className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
              style={{ background: 'linear-gradient(to right, #00d4aa, #10b981, #00d4aa)' }}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
