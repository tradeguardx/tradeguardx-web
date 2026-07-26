import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Full-screen, swipeable walkthrough of creating a Delta Exchange API key in the
 * Delta *mobile app* (Algo Hub → APIs → create key → paste). Shown on phones,
 * where users are in the app rather than on delta.exchange in a browser tab.
 *
 * The step captions, titles and TradeGuardX branding are baked into the images
 * themselves, so the chrome here is deliberately minimal — just close, our own
 * step counter/dots (authoritative, unlike the numbers printed in the images),
 * and prev/next. Images are bundled under /public so the guide can't break at
 * this critical connect moment if an external host changes.
 */

const STEPS = [
  { src: '/guide/delta-app/step-1.png', alt: 'Step 1 — Open Delta, tap Algo Hub' },
  { src: '/guide/delta-app/step-2.png', alt: 'Step 2 — Tap APIs' },
  { src: '/guide/delta-app/step-3.png', alt: 'Step 3 — Name it, whitelist the IP, enable Trading' },
  { src: '/guide/delta-app/step-4.png', alt: 'Step 4 — Tap Create API key, copy key + secret' },
];

export default function DeltaAppGuide({ open, onClose }) {
  const [i, setI] = useState(0);
  const touchX = useRef(null);

  const go = useCallback(
    (delta) => setI((cur) => Math.max(0, Math.min(STEPS.length - 1, cur + delta))),
    [],
  );

  // Reset to the first step whenever it's reopened.
  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Keyboard: arrows to move, Esc to close. Lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, go, onClose]);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const atStart = i === 0;
  const atEnd = i === STEPS.length - 1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col"
          style={{ backgroundColor: 'rgba(4,6,10,0.96)', backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* top bar: counter + close */}
          <div className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
            <span className="text-[13px] font-semibold tracking-wide text-slate-300">
              Step {i + 1} <span className="text-slate-500">of {STEPS.length}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close guide"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* the screenshot */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
            <AnimatePresence mode="wait">
              <motion.img
                key={STEPS[i].src}
                src={STEPS[i].src}
                alt={STEPS[i].alt}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                draggable={false}
              />
            </AnimatePresence>

            {/* desktop-style arrows (also fine on tablet); phones use swipe */}
            {!atStart && (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous step"
                className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/16 sm:flex"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {!atEnd && (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next step"
                className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/16 sm:flex"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* bottom: dots + primary action */}
          <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-4">
            <div className="mb-4 flex items-center justify-center gap-2">
              {STEPS.map((s, idx) => (
                <button
                  key={s.src}
                  type="button"
                  aria-label={`Go to step ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: idx === i ? 22 : 8,
                    backgroundColor: idx === i ? '#00d4aa' : 'rgba(255,255,255,0.25)',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => (atEnd ? onClose() : go(1))}
              className="w-full rounded-xl bg-accent px-5 py-3.5 text-[15px] font-bold text-surface-950 transition-transform active:scale-[0.99]"
            >
              {atEnd ? 'Got it — enter my key' : 'Next'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
