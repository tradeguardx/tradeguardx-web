import { useId, useState } from 'react';

/**
 * A titled card that collapses to its header.
 *
 * Settings pages accumulate cards that are each read once and then ignored
 * (change password, connect a key), so showing every one expanded makes the
 * page longer without making it more useful. Collapsed-by-default keeps the
 * whole set scannable, while `defaultOpen` lets a card that currently NEEDS
 * attention — an active lockout, an error — open itself.
 *
 * The header is a real <button> with aria-expanded rather than a clickable
 * div, so it works from the keyboard and announces its state.
 */
export default function CollapsibleCard({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'var(--dash-border)',
        backgroundColor: 'var(--dash-bg-raised)',
        boxShadow: 'var(--dash-shadow-card)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-6 py-5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className="font-display text-lg font-bold"
              style={{ color: 'var(--dash-text-primary)' }}
            >
              {title}
            </span>
            {badge}
          </span>
          {subtitle && (
            <span className="mt-1 block text-sm" style={{ color: 'var(--dash-text-muted)' }}>
              {subtitle}
            </span>
          )}
        </span>

        <svg
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--dash-text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Unmounted rather than hidden: these panels hold live state (countdown
          timers, polling) that shouldn't keep running while out of sight. */}
      {open && (
        <div id={panelId} className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}
