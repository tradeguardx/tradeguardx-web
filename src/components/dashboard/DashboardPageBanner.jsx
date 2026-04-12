import { motion } from 'framer-motion';

/** Left accent bar gradients (compact strip) */
const ACCENT_BAR = {
  emerald: 'from-emerald-400 to-teal-400',
  violet: 'from-violet-400 to-fuchsia-500',
  cyan: 'from-cyan-400 to-blue-500',
  amber: 'from-amber-400 to-orange-400',
  rose: 'from-rose-400 to-pink-400',
  accent: 'from-accent to-emerald-400',
};

/**
 * Compact page header strip — title, optional badge, subtitle, and actions in one dense row.
 * Replaces the previous full-height gradient banner.
 */
export default function DashboardPageBanner({
  title,
  subtitle,
  accent = 'emerald',
  badge,
  actions,
  className = '',
}) {
  const bar = ACCENT_BAR[accent] || ACCENT_BAR.emerald;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`dash-panel mb-6 flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5 sm:pl-4 ${className}`}
      style={{
        borderColor: 'var(--dash-border)',
      }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div
          className={`mt-0.5 h-9 w-1 shrink-0 rounded-full bg-gradient-to-b ${bar} shadow-[0_0_12px_rgba(0,212,170,0.25)] sm:h-10`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1
              className="font-display text-lg font-bold tracking-tight sm:text-xl"
              style={{ color: 'var(--dash-text-primary)' }}
            >
              {title}
            </h1>
            {badge && <div className="flex flex-wrap items-center gap-2">{badge}</div>}
          </div>
          {subtitle && (
            <p
              className="mt-1 max-w-3xl text-xs leading-snug text-balance sm:text-sm line-clamp-2 sm:line-clamp-none"
              style={{ color: 'var(--dash-text-muted)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </motion.div>
  );
}

/**
 * Section title with accent bar — use below the strip for "Quick access", etc.
 */
export function DashboardSectionHeading({ icon, children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35 }}
      className={`mb-4 flex items-center gap-3 ${className}`}
    >
      <span className="h-8 w-1 rounded-full bg-gradient-to-b from-accent to-emerald-400 shadow-[0_0_12px_rgba(0,212,170,0.35)]" />
      {icon && <span className="text-accent">{icon}</span>}
      <h2
        className="text-xs font-bold uppercase tracking-[0.2em]"
        style={{ color: 'var(--dash-text-muted)' }}
      >
        {children}
      </h2>
    </motion.div>
  );
}
