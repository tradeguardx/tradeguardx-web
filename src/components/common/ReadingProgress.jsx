import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY || 0;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setProgress(nextProgress);
      setShowTop(scrollTop > 420);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-transparent pointer-events-none">
        <motion.div
          className="h-full bg-gradient-to-r from-accent via-emerald-400 to-teal-300 shadow-[0_0_18px_rgba(0,212,170,0.35)]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      </div>

      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={goTop}
            aria-label="Scroll to top"
            className="fixed bottom-6 right-6 z-[70] w-11 h-11 rounded-xl border border-white/[0.1] bg-surface-900/80 backdrop-blur-lg text-slate-200 hover:text-white hover:border-accent/30 hover:bg-surface-800/90 transition-all shadow-lg shadow-black/30"
          >
            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
