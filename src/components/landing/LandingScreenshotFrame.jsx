/**
 * Polished product screenshot chrome for the marketing homepage.
 * Keeps screenshots crisp: padding, rounded inner image, subtle border + shadow — no muddy full-bleed gradients.
 */
export function LandingScreenshotFrame({ chromeTitle, chromeBadge, children, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0e14] shadow-[0_28px_90px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.05] ${className}`}
    >
      {/* Title bar — traffic lights | title | badge */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.06] bg-[#12151c]/95 px-4 py-2.5 sm:px-5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/90 shadow-sm" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/90 shadow-sm" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/90 shadow-sm" />
        </div>
        <span className="truncate text-center font-mono text-[11px] text-slate-400 sm:text-xs">{chromeTitle}</span>
        {chromeBadge ? (
          <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent/90">
            {chromeBadge}
          </span>
        ) : (
          <span className="w-px shrink-0 opacity-0" aria-hidden />
        )}
      </div>
      {/* Content slot — padding around screenshot */}
      <div className="bg-[#0a0b0f] p-2 sm:p-3 md:p-4">{children}</div>
    </div>
  );
}

/** Inner image: sharp edges, sits inside frame padding */
export function LandingScreenshotImage({ src, alt, className = '' }) {
  return (
    <img
      src={src}
      alt={alt}
      className={`mx-auto block w-full max-w-full rounded-lg border border-white/[0.06] bg-[#0d0f14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
