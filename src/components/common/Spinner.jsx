const SIZE = {
  sm: { box: 'w-4 h-4', stroke: 1.5 },
  md: { box: 'w-5 h-5', stroke: 2 },
  lg: { box: 'w-7 h-7', stroke: 2 },
};

/**
 * Inline arc spinner — use inside buttons, table cells, or anywhere a full-page
 * loader is overkill. Accent-coloured by default; pass `className` to override.
 *
 * @param {'sm'|'md'|'lg'} size
 * @param {string} className  extra Tailwind classes (e.g. "text-slate-400")
 */
export default function Spinner({ size = 'md', className = '' }) {
  const { box, stroke } = SIZE[size] ?? SIZE.md;
  return (
    <svg
      className={`${box} animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      aria-hidden="true"
    >
      {/* full-circle track */}
      <circle
        cx="12" cy="12" r="9"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeOpacity="0.15"
      />
      {/* spinning arc — three-quarter arc gives the classic gap */}
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="text-accent"
      />
    </svg>
  );
}
