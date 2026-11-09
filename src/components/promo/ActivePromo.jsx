import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { splitRemaining, discountedPrice, formatInr, normalizePlanName } from '../../lib/activePromo';
import { getFoundingMemberConfig } from '../../lib/foundingMember';
import { getPricingPlans } from '../../api/pricingApi';
import { useActiveOffer } from '../../hooks/useActiveOffer';
import { offerHeadline, offerPriceLine } from '../../lib/siteOffer';
import DiwaliSky from './DiwaliSky';

const SESSION_KEY = 'tgx_promo_dismissed_for';

function CountdownDigit({ value }) {
  return (
    <span className="inline-block min-w-[1.6em] text-center font-mono font-bold tabular-nums tracking-tight">
      {String(value).padStart(2, '0')}
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
      className="group relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2"
      style={{
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.22)',
        backdropFilter: 'blur(8px)',
      }}
      aria-label={`Copy code ${code}`}
    >
      <span className="font-mono text-sm font-bold tracking-[0.16em] text-white sm:text-base sm:tracking-[0.18em]">{code}</span>
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

/* Festive accents, only for an offer the admin marked theme 'diwali'. */
const THEMES = {
  default: {
    bg: 'linear-gradient(120deg, #00d4aa 0%, #10b981 25%, #8b5cf6 50%, #f43f5e 75%, #00d4aa 100%)',
    overlay: 'linear-gradient(180deg, rgba(7,9,15,0.30) 0%, rgba(7,9,15,0.55) 100%)',
    dot: 'rgba(255,255,255,0.45)',
    bar: 'linear-gradient(to right, #00d4aa, #10b981, #00d4aa)',
    accent: 'text-yellow-200',
  },
  /* The background is <DiwaliSky /> (night sky, toran, rockets); these are
     the accents drawn over it. */
  diwali: {
    sky: true,
    bar: 'linear-gradient(to right, #f59e0b, #fde68a, #f59e0b)',
    accent: 'text-amber-200',
  },
};
const themeOf = (offer) => THEMES[offer?.theme] ?? THEMES.default;

/** A small diya: an oil lamp with its flame. */
function DiyaMark() {
  return (
    <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" aria-hidden>
      <path className="dw-flame" d="M12 2.5c1.9 2.3 2.5 4.1 1.7 5.5-.5.8-1 1.2-1.7 1.2s-1.2-.4-1.7-1.2C9.5 6.6 10.1 4.8 12 2.5z" fill="#fde68a" />
      <path className="dw-flame dw-flame-alt" d="M12 5.4c.7 1 .9 1.8.5 2.4-.2.3-.3.4-.5.4s-.3-.1-.5-.4c-.4-.6-.2-1.4.5-2.4z" fill="#f97316" />
      <path d="M2.5 12.5h19c-.7 4.3-4.6 7.2-9.5 7.2s-8.8-2.9-9.5-7.2z" fill="#f59e0b" />
      <path d="M7.5 12.5c.8-1.5 2.5-2.4 4.5-2.4s3.7.9 4.5 2.4" fill="none" stroke="#fcd34d" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CodePromoContent({ promo, now }) {
  const remainingMs = promo.endsAt - now;
  const { days, hours, minutes, seconds } = splitRemaining(remainingMs);
  const showDays = days > 0;
  const theme = themeOf(promo);
  // The headline is derived from the coupon (cycles + intervals), so it
  // cannot outrun it. The price-led line under it appears only once the
  // pricing API has answered — a real figure, never a guessed one.
  const headline = offerHeadline(promo);
  const featured = useFeaturedPlan(null);
  const priceLine = featured
    ? offerPriceLine(promo, { planName: featured.name, monthly: featured.monthly, format: formatInr })
    : null;

  return (
    <div className="relative flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between sm:gap-6">
      <div className="text-center sm:text-left">
        <div className="flex items-center justify-center gap-1.5 sm:justify-start">
          {promo.theme === 'diwali' ? (
            <DiyaMark />
          ) : (
            <motion.span
              className="inline-block"
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            >
              <svg className="h-3.5 w-3.5 text-yellow-300 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
            </motion.span>
          )}
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 sm:text-[11px] sm:tracking-[0.22em]">{promo.headline}</p>
        </div>
        <h2 className="font-display text-sm font-bold leading-tight text-white sm:mt-1 sm:text-2xl">{headline}</h2>
        {priceLine && (
          <p className="mt-0.5 text-[11px] font-semibold text-white/85 sm:text-xs">
            <span className={theme.accent}>{priceLine}</span>
            {promo.cycles === 1 && featured && (
              <span className="text-white/70">, then {formatInr(featured.monthly)}/mo</span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="flex flex-col items-center gap-0.5 sm:items-start sm:gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 sm:text-[10px]">Use code</span>
          <CopyCodeButton code={promo.code} />
        </div>
        <div className="hidden h-12 w-px sm:block" style={{ background: 'rgba(255,255,255,0.20)' }} aria-hidden />
        <div className="flex flex-col items-center gap-0.5 sm:items-start sm:gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 sm:text-[10px]">Ends in</span>
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-white sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xl"
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
            <motion.span className="opacity-70" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
              :
            </motion.span>
            <CountdownDigit value={minutes} />
            <motion.span className="opacity-70" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
              :
            </motion.span>
            <CountdownDigit value={seconds} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FoundingMemberContent({ cfg }) {
  return (
    <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-6">
      <div className="text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <motion.span
            className="inline-block"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            <svg className="h-4 w-4 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.39 4.84L20 7.7l-3.86 3.76L17.07 17 12 14.27 6.93 17l.93-5.54L4 7.7l5.61-.86L12 2z" />
            </svg>
          </motion.span>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
            Early bird · Founding {cfg.limit}
          </p>
        </div>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-white sm:text-xl">
          Join the first {cfg.limit} traders.{cfg.trialDays > 0 && <> <span className="text-yellow-200">Get {cfg.plan} free for {cfg.trialDays} days.</span></>}
        </h2>
      </div>

      <Link
        to="/signup"
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#07090f] transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Claim your spot
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}

/**
 * Featured plan — name and monthly price — straight from the pricing API.
 *
 * Deliberately NOT an env var. The banner quotes a real price against a real
 * strike-through, and a hardcoded figure drifts the moment pricing changes —
 * leaving the homepage advertising a number checkout no longer honours. The API
 * reads the same `plans` rows the pricing page does, so the two cannot disagree.
 *
 * Returns null while loading OR on failure, and the banner simply omits the
 * price line in that case. A promo strip is not worth blocking the page for,
 * and quoting a guessed price would be worse than quoting none.
 */
function useFeaturedPlan(planName) {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getPricingPlans({ signal: ctrl.signal })
      .then((plans) => {
        if (ctrl.signal.aborted) return;
        const norm = normalizePlanName;

        // A named plan wins (founding mode names one). Otherwise fall back to
        // whichever plan the pricing page already marks primary, so the banner
        // features the same tier the pricing page highlights — two surfaces
        // pushing different plans is worse than either choice alone.
        const want = planName ? norm(planName) : null;
        const match = want
          ? plans.find((x) => norm(x?.slug) === want || norm(x?.name) === want)
          : (plans.find((x) => x?.features?.primary) ??
             plans.find((x) => norm(x?.slug) === 'pro'));

        const monthly = Number(match?.priceMonthly ?? match?.monthlyPrice);
        /* Launch promos are rupee coupons (restricted to the INR products in
           Dodo): no featured plan, so no banner, for a visitor priced in USD. */
        setPlan(
          match && (match.currency ?? 'INR') === 'INR' && Number.isFinite(monthly) && monthly > 0
            ? { name: match.name || planName || 'Pro', monthly }
            : null,
        );
      })
      .catch(() => {
        /* banner renders without the price line */
      });
    return () => ctrl.abort();
  }, [planName]);

  return plan;
}

/**
 * Founding-member AND a discount code, in one strip.
 *
 * This is the offer as it actually works: since 9 Nov 2026 there is no free
 * trial (trialDays is always 0), so the strip leads with the founding spot
 * and the coupon on the FIRST PAID month. Only if free days are configured
 * does it say "free for N days" first. Showing them
 * separately (as the two original modes did) split one offer into two
 * half-offers, and whichever rendered second was never seen at all.
 *
 * The order matters — trial first, price second. Leading with a discount asks
 * someone to think about paying before they have used anything.
 */
function LaunchOfferContent({ founding, promo }) {
  const featured = useFeaturedPlan(founding.plan);
  const monthly = featured?.monthly ?? null;
  const after = promo.discountPct ? discountedPrice(monthly, promo.discountPct) : null;
  const showPrice = monthly != null && after != null;

  return (
    <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-6">
      <div className="text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300/95 sm:text-[11px] sm:tracking-[0.22em]">
          {promo.headline} · Founding {founding.limit}
        </p>

        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-white sm:text-2xl">
          {founding.trialDays > 0
            ? `Get ${founding.plan} free for ${founding.trialDays} days.`
            : `Join the first ${founding.limit} traders on ${founding.plan}.`}
        </h2>

        {showPrice ? (
          <div className="mt-1 flex flex-col items-center gap-x-3 gap-y-0.5 sm:flex-row sm:items-baseline">
            <span className="text-xs text-white/80 sm:text-sm">
              {founding.trialDays > 0 ? 'Then your first month for' : 'Your first month for'}
            </span>
            <span className="font-display text-2xl font-bold text-yellow-200 sm:text-3xl">
              {formatInr(after)}
            </span>
            <span className="text-xs text-white/70 line-through sm:text-sm">
              {formatInr(monthly)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 sm:text-[11px]">
              with code {promo.code}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-xs text-white/80 sm:text-sm">
            {founding.trialDays > 0 ? `Then ${offerHeadline(promo).toLowerCase()}` : offerHeadline(promo)} with code {promo.code}.
          </p>
        )}
      </div>

      <Link
        to="/signup"
        className="inline-flex shrink-0 flex-col items-center rounded-xl bg-white px-5 py-2.5 text-center text-[#07090f] transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
          Founding {founding.limit}
        </span>
        <span className="text-sm font-bold">Claim offer &rarr;</span>
      </Link>
    </div>
  );
}

/**
 * Top-of-viewport launch promo strip. Three modes:
 *   1. Launch — BOTH founding-member and a discount code are configured. One
 *      strip carries the whole offer: the founding spot (plus free days only
 *      if configured), then a discounted first month.
 *   2. Founding-member alone — flat message + signup CTA, no countdown.
 *   3. Discount code alone — coupon + live countdown for time-bounded promos.
 *
 * Mode 1 exists because the previous rule (founding wins when both are set)
 * meant configuring a coupon alongside a founding promo silently hid the
 * coupon — the banner never mentioned it, so nobody used a code they were
 * never shown.
 *
 * Coordinates layout via CSS var `--tg-promo-h` (Navbar reads this) and
 * `body.padding-top` (so page content doesn't slide under the strip). Cleans
 * up both on dismiss/expiry/program-end.
 */
export default function ActivePromo() {
  const foundingCfg = useMemo(() => getFoundingMemberConfig(), []);
  /* The offer from the admin panel (payments-service). `ready` is false until
     both it and the visitor's band have answered, and no mode is chosen
     before then — so nothing flashes and then changes or disappears. */
  const { ready, offer: codePromo, band } = useActiveOffer();
  const mode = !ready
    ? null
    : foundingCfg && codePromo
    ? 'launch'
    : foundingCfg
      ? 'founding'
      : codePromo
        ? 'code'
        : null;

  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef(null);

  // Per-session dismiss key (so a new launch promo isn't suppressed by an old dismissal).
  const dismissKey = mode === 'launch'
    ? `launch-${foundingCfg.limit}-${foundingCfg.trialDays}-${codePromo.code}`
    : foundingCfg
    ? `founding-${foundingCfg.limit}-${foundingCfg.trialDays}-${foundingCfg.plan}`
    : codePromo
      ? `code-${codePromo.code}@${codePromo.endsAt}`
      : null;

  useEffect(() => {
    if (!dismissKey) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === dismissKey) setDismissed(true);
    } catch {
      /* ignore */
    }
  }, [dismissKey]);

  useEffect(() => {
    if (mode !== 'code') return;  // only the countdown display needs a ticker
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Applies to 'launch' as well as 'code': in launch mode the strip quotes a
  // discounted price, so letting it outlive the coupon would advertise a price
  // checkout no longer gives.
  const codeExpired =
    (mode === 'code' || mode === 'launch') && codePromo.endsAt - now <= 0;
  /* The offer's audience is already applied by useActiveOffer ('in' offers
     only reach a visitor in the INR band). The founding strip is an Indian
     launch programme, so it keeps its own India-only check. */
  const audienceOk = mode === 'code' ? true : band === 'in';
  const visible = Boolean(mode) && !dismissed && !codeExpired && audienceOk;

  // Publish height as CSS var so the fixed Navbar can offset its `top`,
  // and pad the body so page content doesn't slide under the strip.
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

  if (!visible) return null;

  const handleDismiss = () => {
    try {
      if (dismissKey) sessionStorage.setItem(SESSION_KEY, dismissKey);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const theme = themeOf(mode === 'founding' ? null : codePromo);

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
        data-offer-theme={mode === 'founding' ? undefined : codePromo?.theme ?? 'default'}
      >
        {theme.sky ? <DiwaliSky /> : (<>
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: theme.bg,
            backgroundSize: '300% 100%',
          }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        />

        {/* Darken overlay for text contrast */}
        <div
          className="absolute inset-0"
          style={{ background: theme.overlay }}
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
              background: theme.dot,
              filter: 'blur(0.4px)',
            }}
            animate={{ y: [-12, -24, -12], opacity: [0, 0.7, 0] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }}
            aria-hidden
          />
        ))}
        </>)}

        <div className={`relative mx-auto max-w-7xl px-4 py-2 pr-10 sm:px-6 sm:py-5 sm:pr-16${theme.sky ? ' [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]' : ''}`}>
          {mode === 'launch' && (
            <LaunchOfferContent founding={foundingCfg} promo={codePromo} />
          )}
          {mode === 'founding' && <FoundingMemberContent cfg={foundingCfg} />}
          {mode === 'code' && <CodePromoContent promo={codePromo} now={now} />}
        </div>

        {/* Dismiss — in-memory + per-session storage; reappears next session */}
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

        {/* Auto-dismiss progress bar — only for code-promo mode (countdown-based) */}
        {mode === 'code' && (
          <motion.div
            className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
            style={{ background: theme.bar }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: Math.max(1, (codePromo.endsAt - Date.now()) / 1000), ease: 'linear' }}
          />
        )}
      </motion.section>
    </AnimatePresence>
  );
}
