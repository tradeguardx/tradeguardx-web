import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * A titled, icon-led card that collapses to its header.
 *
 * Settings pages accumulate cards that are each read once and then ignored
 * (change password, connect a key), so showing every one expanded makes the
 * page longer without making it more useful. Collapsed-by-default keeps the
 * set scannable, while `defaultOpen` lets a card that currently NEEDS
 * attention — an active lockout, an error — open itself.
 *
 * The header is a real <button> with aria-expanded rather than a clickable
 * div, so it works from the keyboard and announces its state.
 */
export default function CollapsibleCard({
  title,
  subtitle,
  icon,
  /**
   * Tints the icon tile. A literal, NOT var(--accent): that variable is
   * defined only in the landing-page stylesheets and does not resolve inside
   * the dashboard, where accent is a Tailwind token.
   */
  accent = '#00d4aa',
  badge,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hover, setHover] = useState(false);
  const panelId = useId();

  // defaultOpen is usually false on first render and only becomes true once
  // async state arrives (an active lockout, a failure). Reading it just as the
  // initial useState value meant such a card never actually opened itself.
  // Opens only — never force-closes, so a deliberate collapse isn't undone.
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <motion.div
      initial={false}
      animate={{
        // A whisper of lift on hover — enough to read as interactive without
        // the card jumping around under the cursor.
        borderColor: hover || open ? 'color-mix(in srgb, var(--dash-border) 40%, ' + accent + ')' : 'var(--dash-border)',
      }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: 'var(--dash-bg-raised)',
        boxShadow: 'var(--dash-shadow-card)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-6 py-5 text-left"
      >
        {icon && (
          <motion.span
            animate={{ scale: hover ? 1.06 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
              color: accent,
            }}
          >
            {icon}
          </motion.span>
        )}

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
            <span
              className="mt-0.5 block text-sm leading-relaxed"
              style={{ color: 'var(--dash-text-muted)' }}
            >
              {subtitle}
            </span>
          )}
        </span>

        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="h-4 w-4 shrink-0"
          style={{ color: hover ? accent : 'var(--dash-text-muted)' }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>

      {/* AnimatePresence so the panel animates OUT before unmounting. It is
          genuinely unmounted rather than hidden, so live state inside (the
          killswitch's countdown and polling) stops while out of sight. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.18 } }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
