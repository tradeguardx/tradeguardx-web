import { useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import './blog.css';

/**
 * A blog figure that animates once it is on screen. `replay` remounts the
 * children, which restarts every CSS animation inside without any per-figure
 * timeline code.
 *
 * Figures are drawn in SVG and CSS rather than shipped as images: they stay
 * sharp at any width, cost a few KB instead of a few hundred, and their labels
 * are real text a crawler can read.
 */
export default function Figure({ label, caption, replayable = false, className = '', children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [run, setRun] = useState(0);

  return (
    <figure ref={ref} className={`bv-fig ${inView ? 'is-in' : ''} ${className}`} aria-label={label}>
      {replayable && (
        <div className="-mt-1 mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setRun((n) => n + 1)}
            className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:border-white/20 hover:text-slate-200"
          >
            ↻ Replay
          </button>
        </div>
      )}
      <div key={run}>{children}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
