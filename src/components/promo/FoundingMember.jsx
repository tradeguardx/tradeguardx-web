import { motion } from 'framer-motion';
import { getFoundingMemberConfig } from '../../lib/foundingMember';

/**
 * Variant components for the Founding-100 launch promo.
 *
 * Each renders nothing when the promo is disabled (env vars unset). So you can
 * mount these in their default places and they "go away" automatically when
 * the program ends — no code change needed.
 */

/**
 * Full callout — for pricing page (above plan cards) or signup page (above form).
 * Bold, emphasized, action-driving.
 */
export function FoundingMemberCallout({ context = 'pricing' }) {
  const cfg = getFoundingMemberConfig();
  if (!cfg) return null;

  const headline =
    context === 'signup'
      ? `Sign up now and get ${cfg.plan} free for ${cfg.months} months`
      : `Founding ${cfg.limit}: ${cfg.plan} free for ${cfg.months} months`;

  const sub =
    context === 'signup'
      ? `You're one of the first ${cfg.limit} users — your account is automatically upgraded. No card needed.`
      : `Open to the first ${cfg.limit} users only. No card required, no auto-renewal — your ${cfg.plan} access is on us until the trial ends.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl p-[1.5px]"
      style={{
        background:
          'linear-gradient(135deg, rgba(0,212,170,0.45), rgba(139,92,246,0.30), rgba(0,212,170,0.45))',
      }}
    >
      <div
        className="relative overflow-hidden rounded-[15px] p-5 sm:p-6"
        style={{ backgroundColor: '#0d1425' }}
      >
        {/* ambient glow */}
        <div
          className="pointer-events-none absolute -inset-6 opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(0,212,170,0.18), transparent 60%)' }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
                boxShadow: '0 0 18px rgba(0,212,170,0.40)',
              }}
              aria-hidden
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#07090f" stroke="none">
                <path d="M12 2l2.39 4.84L20 7.7l-3.86 3.76L17.07 17 12 14.27 6.93 17l.93-5.54L4 7.7l5.61-.86L12 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#7dffd4' }}>
                Launch promo · Founding {cfg.limit}
              </p>
              <p className="mt-1 font-display text-base font-bold leading-snug text-white sm:text-lg">
                {headline}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
                {sub}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact pill — for homepage hero (next to the primary CTA).
 * Single line, low visual weight, designed to whet appetite without
 * stealing focus from the main pitch.
 */
export function FoundingMemberPill() {
  const cfg = getFoundingMemberConfig();
  if (!cfg) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
      style={{
        borderColor: 'rgba(0,212,170,0.35)',
        backgroundColor: 'rgba(0,212,170,0.08)',
        color: '#7dffd4',
      }}
    >
      <span
        className="relative flex h-1.5 w-1.5"
        aria-hidden
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <span>
        First {cfg.limit} signups: {cfg.plan} free for {cfg.months} months
      </span>
    </motion.div>
  );
}
