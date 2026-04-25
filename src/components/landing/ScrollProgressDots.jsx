import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SECTIONS = [
  { id: null, label: 'Overview' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'story-intervention', label: 'See it block trades' },
  { id: 'features', label: 'Protection rules' },
  { id: 'cost-comparison', label: 'The real cost' },
  { id: 'story-walkthrough', label: 'Product tour' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'faq', label: 'FAQ' },
];

export default function ScrollProgressDots() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(null);
  const observersRef = useRef([]);

  useEffect(() => {
    // Track hero via scrollY threshold
    const heroThreshold = window.innerHeight * 0.5;

    const onScroll = () => {
      if (window.scrollY < heroThreshold) {
        setActive(0);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // IntersectionObserver for all non-null sections
    const sectionEntries = SECTIONS.slice(1).map((s) => ({
      ...s,
      el: document.getElementById(s.id),
    })).filter((s) => s.el);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = SECTIONS.findIndex((s) => s.id === entry.target.id);
            if (idx !== -1) setActive(idx);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );

    sectionEntries.forEach(({ el }) => observer.observe(el));
    observersRef.current = [observer];

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const scrollTo = (id) => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2.5 lg:flex">
      {SECTIONS.map((section, i) => (
        <div key={i} className="relative flex items-center justify-end">
          {/* Tooltip */}
          <AnimatePresence>
            {hovered === i && (
              <motion.div
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.18 }}
                className="absolute right-6 whitespace-nowrap rounded-lg border border-white/[0.08] bg-surface-950/95 px-2.5 py-1.5 text-xs font-medium text-slate-300 shadow-xl backdrop-blur-sm"
              >
                {section.label}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => scrollTo(section.id)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`Jump to ${section.label}`}
            className="flex items-center justify-center rounded-full transition-all duration-300"
            style={{
              width: active === i ? 10 : 6,
              height: active === i ? 10 : 6,
              backgroundColor:
                active === i
                  ? 'rgb(0, 212, 170)'
                  : hovered === i
                  ? 'rgba(255,255,255,0.3)'
                  : 'rgba(255,255,255,0.15)',
              boxShadow: active === i ? '0 0 8px rgba(0,212,170,0.6)' : 'none',
            }}
          />
        </div>
      ))}
    </div>
  );
}
