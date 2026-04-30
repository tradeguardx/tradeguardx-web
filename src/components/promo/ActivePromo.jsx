import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActivePromo, splitRemaining } from '../../lib/activePromo';

const SESSION_KEY = 'tgx_promo_dismissed_for';

function CountdownDigit({ value }) {
  const display = String(value).padStart(2, '0');
  return (
    <span className="inline-block min-w-[1.6em] text-center font-mono font-bold tabular-nums tracking-tight">
      {display}
    </span>
  );
}

function CopyCodeButton({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className="group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 transition-all"
      style={{
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.22)',
        backdropFilter: 'blur(8px)',
      }}
      aria-label={`Copy code ${code}`}
    >
      <span className="font-mono text-base font-bold tracking-[0.18em] text-white">
        {code}
      </span>
      <span className="text-white/80 transition-transform group-hover:scale-110">
        {copied ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </span>
      {copied && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-white/90"
        >
          Copied!
        </motion.span>
      )}
    </button>
  );
}

/**
 * Eye-catching horizontal promo band: animated gradient, copy-to-clipboard
 * code pill, live countdown to a fixed expiration. Auto-hides when expired
 * or when user dismisses (per-session). Renders nothing when no active promo
 * is configured (`getActivePromo()` returns null).
 */
export default function ActivePromo() {
  const promo = useMemo(() => getActivePromo(), []);
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef(null);

  // Remember per-session dismiss keyed by code+expiresAt so a new promo isn't
  // suppressed by the user dismissing an old one.
  const dismissKey = promo ? `${promo.code}@${promo.expiresAt}` : null;

  useEffect(() => {
    if (!dismissKey) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === dismissKey) {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [dismissKey]);

  useEffect(() => {
    if (!promo) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [promo]);

  // Publish the rendered band height as a CSS variable so the fixed navbar
  // can offset its `top` by the promo height. Also pad the body so page
  // content doesn't slide under the promo.
  const visible = Boolean(promo) && !dismissed && (promo ? promo.expiresAt - now > 0 : false);
  useLayoutEffect(() => {
    if (!visible || !ref.current) {
      document.documentElement.style.removeProperty('--tg-promo-h');
      document.body.style.paddingTop = '';
      return;
    }
    const apply = () => {
      const h = ref.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--tg-promo-h', `${h}px`);
      document.body.style.paddingTop = `${h}px`;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--tg-promo-h');
      document.body.style.paddingTop = '';
    };
  }, [visible]);

  if (!promo || dismissed) return null;

  const remainingMs = promo.expiresAt - now;
  if (remainingMs <= 0) return null;

  const { days, hours, minutes, seconds } = splitRemaining(remainingMs);
  const showDays = days > 0;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, dismissKey);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const headline = promo.discountPct
    ? `${promo.discountPct}% off all paid plans`
    : 'Limited-time offer';

  return (
    <AnimatePresence>
      <motion.section
        key={dismissKey}
        ref={ref}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-0 right-0 top-0 z-[55] overflow-hidden"
        role="region"
        aria-label="Active promotion"
      >
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(120deg, #00d4aa 0%, #10b981 25%, #8b5cf6 50%, #f43f5e 75%, #00d4aa 100%)',
            backgroundSize: '300% 100%',
          }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        />

        {/* Darken for text contrast */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(7,9,15,0.30) 0%, rgba(7,9,15,0.55) 100%)' }}
          aria-hidden
        />

        {/* Drifting sparkle dots */}
        {[...Array(6)].map((_, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${10 + i * 15}%`,
              top: '50%',
              width: 4 + (i % 3),
              height: 4 + (i % 3),
              background: 'rgba(255,255,255,0.45)',
              filter: 'blur(0.4px)',
            }}
            animate={{
              y: [-12, -24, -12],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.6,
              ease: 'easeInOut',
            }}
            aria-hidden
          />
        ))}

        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
            {/* Headline */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <motion.span
                  className="inline-block"
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden
                >
                  <svg className="h-4 w-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                </motion.span>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
                  {promo.headline}
                </p>
              </div>
              <h2 className="mt-1 font-display text-xl font-bold leading-snug text-white sm:text-2xl">
                {headline}
              </h2>
            </div>

            {/* Code + countdown */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex flex-col items-center gap-1 sm:items-start">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  Use code
                </span>
                <CopyCodeButton code={promo.code} />
              </div>

              <div
                className="hidden h-12 w-px sm:block"
                style={{ background: 'rgba(255,255,255,0.20)' }}
                aria-hidden
              />

              <div className="flex flex-col items-center gap-1 sm:items-start">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  Ends in
                </span>
                <div
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-lg text-white sm:text-xl"
                  style={{
                    background: 'rgba(0,0,0,0.28)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {showDays && (
                    <>
                      <CountdownDigit value={days} />
                      <span className="text-xs font-medium opacity-70">d</span>
                    </>
                  )}
                  <CountdownDigit value={hours} />
                  <motion.span
                    className="opacity-70"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    :
                  </motion.span>
                  <CountdownDigit value={minutes} />
                  <motion.span
                    className="opacity-70"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    :
                  </motion.span>
                  <CountdownDigit value={seconds} />
                </div>
              </div>
            </div>
          </div>

          {/* Dismiss */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:right-4 sm:top-4"
            aria-label="Dismiss promotion"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
