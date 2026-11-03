import { useId } from 'react';
import './brandMark.css';

const SHIELD =
  'M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
const CHECK = 'M9 12l2 2 4-4';

/**
 * The shield-and-tick mark, alive: a scan line sweeps down inside the shield
 * and the tick redraws as it passes — the guard is watching. Static for
 * prefers-reduced-motion. Same 24-unit geometry as the old single-path icon,
 * split so the inside can move without touching the outline.
 */
export default function BrandMark({ className = 'h-[18px] w-[18px] text-accent' }) {
  const clip = `tgx-shield-${useId().replace(/:/g, '')}`;
  return (
    <svg className={`tgx-mark ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={SHIELD} />
        </clipPath>
        <linearGradient id={`${clip}-scan`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.7" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect className="tgx-mark__scan" x="2" y="-8" width="20" height="8" fill={`url(#${clip}-scan)`} stroke="none" />
      </g>
      <path d={SHIELD} strokeLinecap="round" strokeLinejoin="round" />
      <path className="tgx-mark__check" d={CHECK} strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
    </svg>
  );
}
