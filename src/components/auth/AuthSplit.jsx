import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Two-column shell for /login and /signup: the pitch on the left, the form
 * on the right. The form itself is untouched — this only wraps it.
 *
 * The left panel is hidden below `lg` so a phone gets straight to the form;
 * the copy is the landing page's job there.
 */

const POINTS = [
  'Your key can trade, never withdraw. Funds cannot leave through us.',
  'A killswitch you cannot call off yourself once it is running.',
  'A journal that prices what your habits actually cost you.',
];

function Check() {
  return (
    <svg className="mt-1 h-4 w-4 flex-shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function AuthSplit({ children }) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* ── Left: the pitch ─────────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-24">
        {/* grid + glow, kept inside the panel */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 30% 40%, black, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 30% 40%, black, transparent 75%)',
            }}
          />
          <div className="absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full bg-accent/[0.06] blur-[140px]" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-[560px]"
        >
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-emerald-500 shadow-lg shadow-accent/25">
              <svg className="h-6 w-6 text-surface-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <span className="font-display text-[22px] font-bold text-white">TradeGuardX</span>
          </Link>

          <h1 className="mt-14 font-display text-[44px] font-bold leading-[1.08] tracking-[-0.02em] text-white xl:text-[52px]">
            The rules you set when you were calm.
          </h1>

          <p className="mt-7 text-[17px] leading-[1.65] text-slate-400">
            We watch every fill on your account. Break a rule you set for yourself and we cancel the
            orders, close the positions, and check you are actually flat &mdash; within seconds, from
            our servers, not your browser.
          </p>

          <ul className="mt-10 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-300">
                <Check />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </aside>

      {/* ── Right: the form, exactly as before ──────────────────────── */}
      <div className="relative flex flex-col items-center justify-center px-4 py-16 lg:bg-surface-950/40">
        {children}
      </div>
    </div>
  );
}
