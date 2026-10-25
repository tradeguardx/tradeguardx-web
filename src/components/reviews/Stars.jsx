import { useState } from 'react';
import './reviews.css';

const PATH = 'M12 2.8l2.83 5.74 6.33.92-4.58 4.47 1.08 6.3L12 17.27l-5.66 2.96 1.08-6.3L2.84 9.46l6.33-.92z';
const STAR_LABELS = ['', 'Bad', 'Poor', 'Okay', 'Good', 'Great'];

function Star({ size, filled }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={PATH} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Read-only stars for a card. */
export function StarRow({ value, size = 16 }) {
  return (
    <span className="rv-stars rv-stars-sm" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`rv-star ${n <= value ? 'on' : ''}`}>
          <Star size={size} filled={n <= value} />
        </span>
      ))}
    </span>
  );
}

/**
 * The picker. A radio group, so arrow keys work and a screen reader hears
 * "Good, 4 of 5". Picking a rating pops the stars up to it in sequence.
 */
export default function StarPicker({ value, onChange, size = 34 }) {
  const [hover, setHover] = useState(0);
  const [burst, setBurst] = useState(0);
  const shown = hover || value;

  const pick = (n) => {
    onChange(n);
    setBurst((b) => b + 1);
  };

  return (
    <div>
      <div
        className="rv-stars"
        role="radiogroup"
        aria-label="Your rating"
        onMouseLeave={() => setHover(0)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); pick(Math.min(5, (value || 0) + 1)); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); pick(Math.max(1, (value || 1) - 1)); }
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={`${n}-${burst}`}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${STAR_LABELS[n]}, ${n} of 5`}
            tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
            className={`rv-star ${n <= shown ? 'on' : ''} ${burst && n <= value ? 'pop' : ''}`}
            style={{ '--d': `${(n - 1) * 0.05}s` }}
            onMouseEnter={() => setHover(n)}
            onClick={() => pick(n)}
          >
            <Star size={size} filled={n <= shown} />
          </button>
        ))}
      </div>
      <p className="rv-hint" style={{ minHeight: 18 }} aria-live="polite">
        {shown ? STAR_LABELS[shown] : 'Tap a star'}
      </p>
    </div>
  );
}
