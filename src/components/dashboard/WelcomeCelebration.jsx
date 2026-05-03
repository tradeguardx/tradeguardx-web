import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isPaidPlan, planDisplayLabel } from '../../lib/planLimits';

const AUTO_DISMISS_MS = 7000;

// Particle palette — accent + complementary glows.
const PARTICLE_COLORS = ['#00d4aa', '#10b981', '#a78bfa', '#fbbf24', '#f43f5e'];

function makeParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    angle: (Math.PI * 2 * i) / count + Math.random() * 0.4,
    distance: 140 + Math.random() * 180,
    size: 6 + Math.random() * 8,
    delay: Math.random() * 0.15,
    duration: 0.9 + Math.random() * 0.6,
    rotate: (Math.random() - 0.5) * 540,
  }));
}

/**
 * One-shot welcome celebration on first dashboard arrival after signup.
 * Triggered by `?welcome=1` in the URL — SignupPage navigates with that flag
 * after a successful signup. Detected once per page-load, then we strip the
 * flag from the URL so a refresh doesn't re-fire.
 *
 * If the user landed with a paid plan (e.g. auto-comp granted them Pro), the
 * copy upgrades to "You're a founding member" — otherwise it's a generic
 * welcome.
 */
export default function WelcomeCelebration() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Pop celebration on first render when ?welcome=1 is present, then strip the
  // param so refresh doesn't re-trigger.
  useEffect(() => {
    if (params.get('welcome') !== '1') return;
    setOpen(true);
    const next = new URLSearchParams(params);
    next.delete('welcome');
    setParams(next, { replace: true });
  }, [params, setParams]);

  // Auto-dismiss
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [open]);

  const particles = useMemo(() => makeParticles(28), []);

  if (!open) return null;

  const tier = user?.subscribedPlanSlug || user?.plan || 'free';
  const isPaid = isPaidPlan(tier);
  const planLabel = planDisplayLabel(tier);

  const headline = isPaid
    ? `Welcome — you're a founding member`
    : `Welcome to TradeGuardX`;
  const sub = isPaid
    ? `Your ${planLabel} access is unlocked. Start setting up your trading rules and protect your next session.`
    : `You're in. Start by adding a trading account and configuring your first risk rules.`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          role="dialog"
          aria-live="polite"
        >
          {/* Subtle backdrop — not full opaque so user feels the dashboard underneath */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(7, 9, 15, 0.55)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.86, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative overflow-visible rounded-3xl p-[1.5px] shadow-2xl max-w-md w-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(0,212,170,0.55), rgba(139,92,246,0.40), rgba(0,212,170,0.55))',
            }}
          >
            <div
              className="relative overflow-visible rounded-[calc(1.5rem-1px)] p-7 sm:p-8 text-center"
              style={{ backgroundColor: '#0d1425' }}
            >
              {/* Particle burst — anchored to center, rays out */}
              <div className="pointer-events-none absolute left-1/2 top-[78px] -translate-x-1/2" aria-hidden>
                {particles.map((p) => {
                  const dx = Math.cos(p.angle) * p.distance;
                  const dy = Math.sin(p.angle) * p.distance;
                  return (
                    <motion.span
                      key={p.id}
                      className="absolute block rounded-full"
                      style={{
                        width: p.size,
                        height: p.size,
                        background: `radial-gradient(circle, ${p.color} 0%, ${p.color}00 70%)`,
                        filter: 'blur(0.4px)',
                      }}
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.6, rotate: 0 }}
                      animate={{
                        x: dx,
                        y: dy,
                        opacity: [0, 1, 0],
                        scale: [0.6, 1.2, 0.5],
                        rotate: p.rotate,
                      }}
                      transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
              </div>

              {/* Glowing center icon */}
              <motion.div
                className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
                  boxShadow: '0 0 35px rgba(0,212,170,0.55)',
                }}
                initial={{ scale: 0.3, rotate: -120 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 14 }}
              >
                <motion.svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#07090f"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M5 12.5l4.5 4.5L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
                  />
                </motion.svg>
              </motion.div>

              {/* Copy */}
              {isPaid && (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#7dffd4' }}>
                  Founding member
                </p>
              )}
              <h2 className="mb-2 font-display text-2xl font-bold leading-snug text-white">
                {headline}
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                {sub}
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
                  color: '#07090f',
                  boxShadow: '0 4px 18px rgba(0,212,170,0.30)',
                }}
              >
                Let's go
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              {/* Auto-dismiss thin progress bar */}
              <motion.div
                className="absolute inset-x-6 bottom-3 h-[2px] origin-left rounded-full"
                style={{ background: 'linear-gradient(to right, #00d4aa, #10b981)' }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
