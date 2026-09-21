import { useEffect, useMemo, useRef, useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import FAQ from '../components/landing/FAQ';
import { getPricingPlans } from '../api/pricingApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import { createCheckoutSession } from '../api/paymentsApi';
import { getPendingCheckoutPlan, clearPendingCheckoutPlan, normalizePlanSlugForMatch, getPendingCheckoutInterval, normalizeInterval, BILLING_INTERVALS } from '../lib/checkoutIntent';
import { trackCheckoutStarted } from '../lib/analytics';
import { getStoredReferralCode } from '../lib/referralCode';
import { getLinkPromoCode } from '../lib/promoLink';
import { getActivePromo, discountedPrice, formatInr } from '../lib/activePromo';
import { paidCheckoutEligibility, isPaidPlan } from '../lib/planLimits';

/**
 * The code to send to checkout.
 *
 * An influencer referral WINS over a platform promo: the referral both discounts
 * the customer and attributes commission, so preferring the promo would silently
 * cost an influencer their payout.
 *
 * The platform promo is applied automatically rather than left for the customer
 * to paste on Dodo's page. Dodo SILENTLY IGNORES an unrecognised or missing
 * code — no warning, no error — so a customer who saw "10% off" in the banner
 * and forgot to type it is simply charged full price and has no idea. Sending
 * it ourselves is what makes the banner's promise true.
 */
function checkoutCouponCode() {
  // Referral > code from a promo link (?promo=) > site-wide promo from env.
  return getStoredReferralCode() || getLinkPromoCode() || getActivePromo()?.code || undefined;
}

// ─── Per-plan visual theming ─────────────────────────────────────────────────
const PLAN_THEME = {
  free: {
    border: 'from-slate-700/35 via-slate-700/15 to-slate-800/10',
    glow: null,
    iconBg: 'rgba(100,116,139,0.12)',
    iconColor: '#94a3b8',
    badgeBg: 'rgba(100,116,139,0.10)',
    badgeBorder: 'rgba(100,116,139,0.22)',
    badgeText: '#94a3b8',
    tagline: 'Full access, free for 7 days. No card — then pick a plan.',
    ctaBg: 'rgba(255,255,255,0.06)',
    ctaBorder: 'rgba(255,255,255,0.08)',
    ctaText: '#e2e8f0',
    ctaHoverBg: 'rgba(255,255,255,0.10)',
    checkColor: '#94a3b8',
  },
  pro: {
    border: 'from-accent/55 via-accent/22 to-accent/06',
    glow: 'rgba(0,212,170,0.16)',
    iconBg: 'rgba(0,212,170,0.14)',
    iconColor: '#00d4aa',
    badgeBg: 'rgba(0,212,170,0.14)',
    badgeBorder: 'rgba(0,212,170,0.30)',
    badgeText: '#00d4aa',
    tagline: 'For traders who can\'t afford another bad day.',
    ctaGradient: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
    ctaText: '#07090f',
    ctaShadow: '0 4px 20px rgba(0,212,170,0.30)',
    checkColor: '#00d4aa',
  },
  proplus: {
    border: 'from-violet-500/55 via-violet-500/22 to-violet-500/06',
    glow: 'rgba(139,92,246,0.14)',
    iconBg: 'rgba(139,92,246,0.14)',
    iconColor: '#a78bfa',
    badgeBg: 'rgba(139,92,246,0.14)',
    badgeBorder: 'rgba(139,92,246,0.30)',
    badgeText: '#c4b5fd',
    tagline: 'When discipline isn\'t optional anymore.',
    ctaGradient: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
    ctaText: '#ffffff',
    ctaShadow: '0 4px 20px rgba(139,92,246,0.28)',
    checkColor: '#a78bfa',
  },
};

const PLAN_ICONS = {
  free: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  pro: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  proplus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

function planKey(name = '') {
  return name.toLowerCase().replace(/\s|\+/g, '');
}

function planKeyFromApi(raw, name, index) {
  const slug = raw?.slug;
  if (slug != null && String(slug).trim() !== '') return normalizePlanSlugForMatch(slug);
  return planKey(name || `Plan ${index + 1}`);
}

function normalizePlan(raw, index) {
  const name = raw.name || `Plan ${index + 1}`;
  const key = planKeyFromApi(raw, name, index);
  const featureList = Array.isArray(raw.features)
    ? raw.features
    : Array.isArray(raw.features?.cardFeatures)
      ? raw.features.cardFeatures
      : [];
  const normalizedFeatures = featureList
    .map((f) =>
      typeof f === 'string'
        ? { text: f, included: true }
        : {
            text: f?.text || '',
            included: f?.included !== false,
            lockedTier: f?.lockedTier || null,
            comingSoon: Boolean(f?.comingSoon),
            highlight: Boolean(f?.highlight),
          },
    )
    .filter((f) => f.text);
  const monthlyPrice = Number(raw.priceMonthly ?? raw.monthlyPrice ?? 0);
  const ctaLink = raw.features?.ctaLink || (key === 'free' ? '/signup' : `/signup?plan=${key}`);
  // Billing intervals from the API; a plan without them (or Free) is monthly only.
  const intervals = Array.isArray(raw.intervals) && raw.intervals.length
    ? raw.intervals.map((iv) => ({ interval: normalizeInterval(iv.interval), price: Number(iv.price) || 0, perMonth: Number(iv.perMonth) || 0, savingsPct: Number(iv.savingsPct) || 0 }))
    : [{ interval: 'monthly', price: monthlyPrice, perMonth: monthlyPrice, savingsPct: 0 }];

  return {
    id: raw.id || key || `${index}`,
    key,
    name,
    monthlyPrice,
    intervals,
    refundDays: Number(raw.features?.refundDays) || 7,
    cta: raw.features?.cta || (key === 'free' ? 'Get Started Free' : `Start ${name} Plan`),
    ctaLink,
    primary: Boolean(raw.features?.primary ?? (key === 'pro')),
    badge: raw.features?.badge || null,
    limitations: Array.isArray(raw.features?.limitations) ? raw.features.limitations : [],
    features: normalizedFeatures,
  };
}

// ─── Trust badge strip ───────────────────────────────────────────────────────
const TRUST_BADGES = [
  {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    label: '14-day money-back',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Cancel anytime',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    label: 'Secure payment',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    label: 'No credit card to start',
  },
];

export default function PricingPage() {
  useSEO({
    title: 'Pricing',
    description: 'Free, Pro, and Pro+ plans for real-time trading risk management. Start free — upgrade when you need more rules and journal history.',
    url: 'https://tradeguardx.com/pricing',
  });
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [checkoutKey, setCheckoutKey] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  /**
   * Platform launch promo, read once. `useMemo` because getActivePromo() checks
   * expiry against Date.now(), and re-reading it every render would let a promo
   * vanish mid-interaction the instant it lapses — the countdown strip already
   * handles expiry, and a card silently reverting to full price while someone
   * is reading it is worse than showing a stale offer for the rest of a visit.
   *
   * An influencer `?ref=` code takes precedence at checkout, so this block is
   * hidden when one is present rather than promising a discount that loses.
   */
  const activePromo = useMemo(
    () => (getStoredReferralCode() || getLinkPromoCode() ? null : getActivePromo()),
    [],
  );
  const { session, user, subscription, subscriptionLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [interval, setInterval_] = useState(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('interval');
      return normalizeInterval(fromUrl || getPendingCheckoutInterval());
    } catch { return 'monthly'; }
  });
  /** Price line for a card on the selected interval; monthly-only plans ignore the toggle. */
  const priceFor = (plan) => plan.intervals.find((iv) => iv.interval === interval) || plan.intervals[0];

  useEffect(() => {
    // The pill under the header names whichever code will actually be sent;
    // a promo-link code reuses it so the email's promise is visibly kept.
    setReferralCode(getStoredReferralCode() || getLinkPromoCode());
  }, []);

  async function handlePaidPlanCta(plan) {
    if (plan.key === 'free') { navigate(plan.ctaLink); return; }
    if (!session?.access_token) { navigate(plan.ctaLink); return; }
    const elig = paidCheckoutEligibility(user?.billingPlan, plan.key);
    if (!elig.allowed) {
      if (elig.reason === 'current') toast.error('Already on this plan', 'You are already subscribed to this tier.');
      else if (elig.reason === 'downgrade') toast.info('Change plan in Billing', 'To switch to a lower tier, use Billing → manage subscription.');
      return;
    }
    setCheckoutKey(plan.key);
    try {
      const res = await createCheckoutSession({
        accessToken: session.access_token,
        planSlug: plan.key,
        interval: plan.intervals.length > 1 ? interval : 'monthly',
        couponCode: plan.intervals.length > 1 && interval !== 'monthly' ? undefined : checkoutCouponCode(),
      });
      const url = res?.data?.checkoutUrl;
      if (url) { trackCheckoutStarted(plan.key); window.location.href = url; return; }
      throw new Error('No checkout URL returned');
    } catch (err) {
      toast.error('Checkout failed', err?.message || 'Please try again.');
    } finally {
      setCheckoutKey(null);
    }
  }

  const resumeCheckoutRef = useRef(false);

  useEffect(() => {
    if (isLoading || loadError || plans.length === 0 || !session?.access_token) return;
    if (subscriptionLoading) return;
    const pending = getPendingCheckoutPlan();
    if (!pending || pending === 'free') return;
    const pendingN = normalizePlanSlugForMatch(pending);
    const plan = plans.find((p) => normalizePlanSlugForMatch(p.key) === pendingN);
    if (!plan) { clearPendingCheckoutPlan(); return; }
    if (plan.key === 'free') return;
    const resumeElig = paidCheckoutEligibility(user?.billingPlan, plan.key);
    if (!resumeElig.allowed) { clearPendingCheckoutPlan(); return; }
    if (resumeCheckoutRef.current) return;
    resumeCheckoutRef.current = true;
    let cancelled = false;
    setCheckoutKey(plan.key);
    (async () => {
      try {
        const res = await createCheckoutSession({
          accessToken: session.access_token,
          planSlug: plan.key,
          interval: plan.intervals.length > 1 ? interval : 'monthly',
          couponCode: plan.intervals.length > 1 && interval !== 'monthly' ? undefined : checkoutCouponCode(),
        });
        if (cancelled) return;
        const url = res?.data?.checkoutUrl;
        if (url) { clearPendingCheckoutPlan(); trackCheckoutStarted(plan.key); window.location.href = url; return; }
        throw new Error('No checkout URL returned');
      } catch (err) {
        if (!cancelled) { resumeCheckoutRef.current = false; toast.error('Checkout failed', err?.message || 'Please try again.'); }
      } finally {
        if (!cancelled) setCheckoutKey(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoading, loadError, plans, session?.access_token, subscriptionLoading, user?.billingPlan, toast, interval]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadPlans() {
      setIsLoading(true); setLoadError('');
      try {
        const apiPlans = await getPricingPlans({ signal: controller.signal });
        if (apiPlans.length === 0) throw new Error('Pricing API returned invalid plan data');
        if (!cancelled) {
          // Force canonical Free → Pro → Pro+ order regardless of API/DB sortOrder.
          // Anything unknown lands at the end.
          const ORDER = { free: 0, pro: 1, proplus: 2 };
          const normalized = apiPlans.map(normalizePlan);
          normalized.sort((a, b) => (ORDER[a.key] ?? 99) - (ORDER[b.key] ?? 99));
          setPlans(normalized);
        }
      } catch (error) {
        if (!cancelled) { setLoadError('Pricing is temporarily unavailable. Please try again shortly.'); setPlans([]); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadPlans();
    return () => { cancelled = true; controller.abort(); };
  }, []);


  // ─── CTA renderer (keeps all business logic) ──────────────────────────────
  function renderCta(plan) {
    const t = PLAN_THEME[plan.key] || PLAN_THEME.free;
    const isPrimary = plan.primary;

    const baseClass = 'relative w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 overflow-hidden';

    const primaryStyle = t.ctaGradient
      ? { background: t.ctaGradient, color: t.ctaText, boxShadow: t.ctaShadow }
      : { backgroundColor: t.ctaBg, color: t.ctaText, border: `1px solid ${t.ctaBorder}` };

    const secondaryStyle = { backgroundColor: t.ctaBg, color: t.ctaText, border: `1px solid ${t.ctaBorder}` };

    if (plan.key === 'free' && session?.access_token) {
      if (subscriptionLoading) return <button disabled className={`${baseClass} opacity-60 cursor-wait`} style={secondaryStyle}>Loading plan…</button>;
      if (isPaidPlan(user?.billingPlan)) return <Link to="/dashboard/account/billing" className={`block text-center ${baseClass}`} style={secondaryStyle}>Manage subscription</Link>;
      return <Link to={plan.ctaLink} className={`block text-center ${baseClass}`} style={isPrimary ? primaryStyle : secondaryStyle}>{plan.cta}</Link>;
    }

    if (plan.key !== 'free' && session?.access_token) {
      const paidElig = paidCheckoutEligibility(user?.billingPlan, plan.key);
      if (subscriptionLoading) return <button disabled className={`${baseClass} opacity-60 cursor-wait`} style={isPrimary ? primaryStyle : secondaryStyle}>Loading plan…</button>;
      if (paidElig && !paidElig.allowed && paidElig.reason === 'current') {
        // Same tier. A comp has nothing to buy; a paid subscriber can still
        // move between intervals (Dodo prorates via the customer portal).
        const currentStyle = { backgroundColor: 'rgba(0,212,170,0.10)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.35)' };
        const source = user?.subscriptionSource;
        if (source !== 'payment') return <div className={`${baseClass} text-center`} style={currentStyle}>{source === 'admin' ? 'Your plan — complimentary ✓' : 'Current plan ✓'}</div>;
        const currentInterval = subscription?.subscription?.billingInterval || 'monthly';
        const line = priceFor(plan);
        if (plan.intervals.length > 1 && line.interval !== currentInterval) {
          return <Link to="/dashboard/account/billing" className={`block text-center ${baseClass}`} style={isPrimary ? primaryStyle : secondaryStyle}>Switch to {line.interval} billing</Link>;
        }
        return <div className={`${baseClass} text-center`} style={currentStyle}>Current plan · billed {currentInterval} ✓</div>;
      }
      if (paidElig && !paidElig.allowed && paidElig.reason === 'downgrade') return <Link to="/dashboard/account/billing" className={`block text-center ${baseClass}`} style={isPrimary ? primaryStyle : secondaryStyle}>Manage subscription</Link>;
      return (
        <button type="button" onClick={() => handlePaidPlanCta(plan)} disabled={checkoutKey === plan.key} className={`${baseClass} disabled:opacity-60`} style={isPrimary ? primaryStyle : secondaryStyle}>
          {checkoutKey === plan.key ? 'Redirecting…' : plan.cta}
        </button>
      );
    }

    return <Link to={plan.ctaLink} className={`block text-center ${baseClass}`} style={isPrimary ? primaryStyle : secondaryStyle}>{plan.cta}</Link>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>

      {/* ── Ambient background ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[700px] w-[1100px] rounded-full blur-[160px]" style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.055), transparent 65%)' }} />
        <div className="absolute right-[-10%] top-[40%] h-[500px] w-[600px] rounded-full blur-[130px]" style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.04), transparent 70%)' }} />
        <div className="absolute left-[-5%] bottom-[10%] h-[400px] w-[500px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.03), transparent 70%)' }} />
        {/* Subtle dot-grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-16">

        {/* ── Concise pricing hero ─────────────────────────────────────────── */}
        <motion.header
          className="max-w-3xl mx-auto text-center mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-5"
            style={{ borderColor: 'rgba(0,212,170,0.22)', backgroundColor: 'rgba(0,212,170,0.07)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ boxShadow: '0 0 6px rgba(0,212,170,0.8)' }} />
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: '#00d4aa' }}>
              Pricing
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-[1.1]">
            Simple pricing.{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)' }}>
              Cancel anytime.
            </span>
          </h1>

          <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-7">
            Every account starts with 7 days of full access — free, no card. Keep it going by picking a plan.
          </p>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {TRUST_BADGES.map((b) => (
              <span
                key={b.label}
                className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium"
                style={{ borderColor: 'rgba(255,255,255,0.07)', color: '#64748b', backgroundColor: 'rgba(255,255,255,0.025)' }}
              >
                <span style={{ color: 'rgba(0,212,170,0.65)' }}>{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>

          {loadError && <p className="mt-6 text-amber-400 text-sm">{loadError}</p>}
          {isLoading && (
            <div className="mt-7 flex items-center justify-center gap-2 text-slate-600 text-sm">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-t-accent/80 border-accent/20 animate-spin" />
              Loading plans…
            </div>
          )}
          {referralCode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 mx-auto inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm"
              style={{
                borderColor: 'rgba(0,212,170,0.30)',
                backgroundColor: 'rgba(0,212,170,0.08)',
                color: '#00d4aa',
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-medium">
                Discount <span className="font-mono font-bold tracking-wider">{referralCode}</span> will be applied at checkout
              </span>
            </motion.div>
          )}
        </motion.header>

        {/* ── Billing interval ─────────────────────────────────────────────── */}
        {plans.some((p) => p.intervals.length > 1) && (
          <div className="mb-8 flex justify-center">
            <div role="tablist" aria-label="Billing interval" className="inline-flex items-center gap-1 rounded-full border p-1" style={{ borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
              {BILLING_INTERVALS.map((iv) => {
                const on = iv === interval;
                const best = plans.flatMap((p) => p.intervals).filter((x) => x.interval === iv).reduce((m, x) => Math.max(m, x.savingsPct), 0);
                return (
                  <button key={iv} type="button" role="tab" aria-selected={on} onClick={() => setInterval_(iv)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors" style={{ backgroundColor: on ? '#00d4aa' : 'transparent', color: on ? '#05221c' : '#94a3b8' }}>
                    {iv === 'monthly' ? 'Monthly' : iv === 'quarterly' ? 'Quarterly' : 'Yearly'}
                    {best > 0 && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: on ? 'rgba(5,34,28,0.18)' : 'rgba(0,212,170,0.12)', color: on ? '#05221c' : '#00d4aa' }}>−{best}%</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Plan cards ───────────────────────────────────────────────────── */}
        {plans.length > 0 && (
          <div className={`grid ${plans.length >= 3 ? 'md:grid-cols-3 max-w-5xl' : 'md:grid-cols-2 max-w-3xl'} gap-5 lg:gap-6 mx-auto mb-6 items-stretch`}>
            {plans.map((plan, i) => {
              const t = PLAN_THEME[plan.key] || PLAN_THEME.free;
              const isPrimary = plan.primary;
              const line = priceFor(plan);
              const price = line.price;
              const multi = plan.intervals.length > 1;
              const perLabel = line.interval === 'yearly' ? '/yr' : line.interval === 'quarterly' ? '/qtr' : '/mo';
              const billedLabel = line.interval === 'yearly' ? 'Billed yearly' : line.interval === 'quarterly' ? 'Billed quarterly' : 'Billed monthly';
              // First-month promo price for this card. Only on monthly — the
              // interval discount is the deal on quarterly and yearly.
              const promoPrice =
                activePromo?.discountPct && price > 0 && (!multi || line.interval === 'monthly')
                  ? discountedPrice(price, activePromo.discountPct)
                  : null;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.1, duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`relative flex ${isPrimary ? 'md:-my-6 md:scale-[1.04] z-10' : 'z-0'}`}
                >
                  {/* Outer ambient glow for primary/proplus */}
                  {t.glow && (
                    <div
                      className="pointer-events-none absolute -inset-8 rounded-[3rem] blur-3xl"
                      style={{ background: `radial-gradient(ellipse at 50% 30%, ${isPrimary ? t.glow.replace(/0\.\d+/, '0.28') : t.glow}, transparent 65%)` }}
                      aria-hidden
                    />
                  )}

                  {/* Gradient border shell */}
                  <div className={`relative flex flex-col w-full rounded-[1.6rem] p-[1.5px] bg-gradient-to-b ${t.border}`}>
                    {/* Card inner */}
                    <div
                      className="relative flex flex-col flex-1 overflow-hidden rounded-[1.5rem]"
                      style={{ backgroundColor: isPrimary ? '#0d1627' : '#0b1020' }}
                    >
                      {/* Per-plan inner top glow */}
                      {t.glow && (
                        <div
                          className="pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-[1.5rem]"
                          style={{ background: `linear-gradient(to bottom, ${t.glow.replace(/0\.\d+/, isPrimary ? '0.10' : '0.06')}, transparent)` }}
                          aria-hidden
                        />
                      )}

                      <div className="relative flex flex-col flex-1 p-7">
                        {/* Top row: icon + badge */}
                        <div className="flex items-start justify-between mb-5 min-h-[44px]">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl"
                            style={{ backgroundColor: t.iconBg, color: t.iconColor }}
                          >
                            {PLAN_ICONS[plan.key] || PLAN_ICONS.free}
                          </div>
                          {plan.badge && (
                            <span
                              className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
                              style={{ backgroundColor: t.badgeBg, borderColor: t.badgeBorder, color: t.badgeText }}
                            >
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        {/* Plan name + tagline */}
                        <h3 className="font-display text-2xl font-bold text-white mb-1.5 tracking-tight">{plan.name}</h3>
                        <p className="text-[12px] leading-relaxed mb-6 min-h-[32px]" style={{ color: '#64748b' }}>{t.tagline}</p>

                        {/* Price.
                            When a first-month promo is running, the DISCOUNTED
                            figure is the headline and the list price is struck
                            through beside it. Showing full price as the hero
                            with the offer relegated to a footnote buries the
                            number that decides the sale.

                            The "from month two" framing is gated on cycles === 1
                            so it cannot describe a coupon that actually recurs —
                            copy and coupon are read from the same config. */}
                        {promoPrice != null ? (
                          <>
                            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mb-1.5">
                              <AnimatePresence mode="wait">
                                <motion.span
                                  key={promoPrice}
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 6 }}
                                  className="font-display text-5xl font-black text-white tracking-tight"
                                >
                                  {formatInr(promoPrice)}
                                </motion.span>
                              </AnimatePresence>
                              {activePromo.cycles === 1 && (
                                <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                                  first month
                                </span>
                              )}
                              <span className="text-lg font-semibold line-through" style={{ color: '#64748b' }}>
                                {formatInr(price)}
                              </span>
                            </div>

                            {activePromo.cycles === 1 && (
                              <p className="text-[12px] leading-relaxed mb-1" style={{ color: '#94a3b8' }}>
                                Then {formatInr(price)}/mo from month two. Cancel before it renews
                                and you pay nothing more.
                              </p>
                            )}
                            <p className="text-[11px] mb-3 font-medium" style={{ color: '#475569' }}>
                              Incl. 18% GST · billed monthly
                            </p>

                            {/* States plainly that nothing is required of the
                                customer. The code is sent as `discount_code` on
                                the Dodo checkout session, so it is already on the
                                page when they arrive. Telling them to "enter
                                LAUNCH10" would invite them to retype a code that
                                is applied — and Dodo ignores a bad one in
                                silence, at full price. */}
                            <div
                              className="mb-6 flex items-start gap-2 rounded-xl border px-3 py-2.5"
                              style={{
                                borderColor: 'rgba(0,212,170,0.28)',
                                backgroundColor: 'rgba(0,212,170,0.07)',
                              }}
                            >
                              <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="#00d4aa" strokeWidth={2.4} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <p className="text-[12px] leading-snug" style={{ color: '#00d4aa' }}>
                                <span className="font-mono font-bold tracking-wider">{activePromo.code}</span>{' '}
                                is applied automatically at checkout — nothing to enter.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-1.5 mb-1">
                              <AnimatePresence mode="wait">
                                <motion.span
                                  key={price}
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 6 }}
                                  className="font-display text-5xl font-black text-white tracking-tight"
                                >
                                  {price === 0 ? '₹0' : `₹${price.toLocaleString('en-IN')}`}
                                </motion.span>
                              </AnimatePresence>
                              {price > 0 && <span className="text-sm font-medium" style={{ color: '#64748b' }}>{perLabel}</span>}
                              {price > 0 && line.interval !== 'monthly' && (
                                <span className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: '#00d4aa' }}>save {line.savingsPct}%</span>
                              )}
                            </div>
                            {price > 0 && line.interval !== 'monthly' && (
                              <p className="text-[12px] leading-relaxed mb-1" style={{ color: '#94a3b8' }}>
                                That&rsquo;s ₹{line.perMonth.toLocaleString('en-IN')}/mo — against ₹{plan.monthlyPrice.toLocaleString('en-IN')} billed monthly.
                              </p>
                            )}
                            <p className="text-[11px] mb-6 font-medium" style={{ color: '#475569' }}>
                              {price === 0 ? 'No credit card required' : `${billedLabel} · incl. 18% GST · ${line.interval === 'monthly' ? 'cancel anytime' : `${plan.refundDays}-day money-back`}`}
                            </p>
                          </>
                        )}

                        {/* CTA — moved above the feature list for stronger conversion focus */}
                        <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} className="mb-7">
                          {renderCta(plan)}
                        </motion.div>

                        {/* Divider */}
                        <div className="mb-5 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)' }} />

                        {/* Feature list */}
                        <ul className="space-y-3 flex-1">
                          {plan.features.map((f) => (
                            <li key={f.text} className="flex items-start gap-2.5">
                              {f.included ? (
                                <span
                                  className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                                  style={{ backgroundColor: `${t.checkColor}1a` }}
                                >
                                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" style={{ color: t.checkColor }}>
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              ) : (
                                <span
                                  className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                                >
                                  <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#475569' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m0-12a4 4 0 014 4v3H8V9a4 4 0 014-4z" />
                                  </svg>
                                </span>
                              )}
                              <span
                                className={`flex-1 text-sm leading-snug ${f.included ? '' : 'line-through'}`}
                                style={{
                                  color: f.included ? (f.highlight ? '#ffffff' : '#cbd5e1') : '#475569',
                                  fontWeight: f.highlight ? 600 : 400,
                                }}
                              >
                                {f.text}
                              </span>
                              {/* "Coming soon" pill for included-but-not-shipped */}
                              {f.included && f.comingSoon && (
                                <span
                                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.20)' }}
                                >
                                  Soon
                                </span>
                              )}
                              {/* Tier-unlock pill for locked features */}
                              {!f.included && f.lockedTier && (
                                <span
                                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                  style={{
                                    backgroundColor:
                                      f.lockedTier === 'Pro+'
                                        ? 'rgba(139,92,246,0.10)'
                                        : 'rgba(0,212,170,0.10)',
                                    color: f.lockedTier === 'Pro+' ? '#a78bfa' : '#00d4aa',
                                    border:
                                      f.lockedTier === 'Pro+'
                                        ? '1px solid rgba(139,92,246,0.22)'
                                        : '1px solid rgba(0,212,170,0.22)',
                                  }}
                                >
                                  {f.lockedTier}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>

                        {/* Limitations */}
                        {plan.limitations.length > 0 && (
                          <ul className="mt-5 pt-4 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {plan.limitations.map((l) => (
                              <li key={l} className="flex items-start gap-2 text-[11px]" style={{ color: '#475569' }}>
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: '#334155' }} />
                                {l}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && plans.length === 0 && (
          <div className="max-w-3xl mx-auto mb-12 rounded-2xl px-6 py-10 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <p className="text-slate-300 text-base">Unable to load pricing plans right now.</p>
            <p className="text-slate-500 text-sm mt-2">Please refresh the page or try again in a few minutes.</p>
          </div>
        )}

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <FAQ />

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative mt-20 mb-8 overflow-hidden rounded-3xl p-[1px]"
          style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.30) 0%, rgba(0,212,170,0.06) 50%, rgba(139,92,246,0.20) 100%)' }}
        >
          <div className="relative overflow-hidden rounded-[1.4rem] px-8 py-16 text-center" style={{ backgroundColor: '#0d1425' }}>
            {/* Ambient blobs */}
            <div className="pointer-events-none absolute left-1/4 top-0 h-48 w-48 rounded-full blur-3xl" style={{ background: 'rgba(0,212,170,0.07)' }} aria-hidden />
            <div className="pointer-events-none absolute right-1/4 bottom-0 h-40 w-40 rounded-full blur-3xl" style={{ background: 'rgba(139,92,246,0.06)' }} aria-hidden />

            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(0,212,170,0.75)' }}>
                Get started today
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to protect your trades?
              </h2>
              <p className="text-base mb-10 max-w-md mx-auto" style={{ color: '#475569' }}>
                {session?.access_token && !subscriptionLoading && isPaidPlan(user?.billingPlan)
                  ? 'You are on a paid plan. Manage billing anytime from your account.'
                  : 'Join traders who trust TradeGuardX. Start free — no card required.'}
              </p>
              <motion.div
                className="inline-block"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  to={session?.access_token ? '/dashboard' : '/signup'}
                  className="inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold text-[#07090f] transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
                    boxShadow: '0 4px 24px rgba(0,212,170,0.30)',
                  }}
                >
                  {session?.access_token ? 'Open dashboard' : 'Get Started Free'}
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
