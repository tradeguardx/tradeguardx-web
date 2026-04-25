import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import FAQ from '../components/landing/FAQ';
import { getPricingPlans } from '../api/pricingApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import { createCheckoutSession } from '../api/paymentsApi';
import { getPendingCheckoutPlan, clearPendingCheckoutPlan, normalizePlanSlugForMatch } from '../lib/checkoutIntent';
import { paidCheckoutEligibility, isPaidPlan } from '../lib/planLimits';
import { getPendingCheckoutPlan, clearPendingCheckoutPlan, normalizePlanSlugForMatch } from '../lib/checkoutIntent';
import { paidCheckoutEligibility, isPaidPlan } from '../lib/planLimits';

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
    tagline: 'Core protection, forever free.',
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
    tagline: 'Full analytics. Full enforcement.',
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
    tagline: 'Built for prop traders and power users.',
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
    .map((f) => (typeof f === 'string' ? { text: f, included: true } : { text: f?.text || '', included: f?.included !== false }))
    .filter((f) => f.text);
  const monthlyPrice = Number(raw.priceMonthly ?? raw.monthlyPrice ?? 0);
  const ctaLink = raw.features?.ctaLink || (key === 'free' ? '/beta-traders' : `/beta-traders?plan=${key}`);

  return {
    id: raw.id || key || `${index}`,
    key,
    name,
    monthlyPrice,
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
    label: '7-day money-back',
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
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [checkoutKey, setCheckoutKey] = useState(null);
  const { session, user, subscriptionLoading } = useAuth();
  const { session, user, subscriptionLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handlePaidPlanCta(plan) {
    if (plan.key === 'free') { navigate(plan.ctaLink); return; }
    if (!session?.access_token) { navigate(plan.ctaLink); return; }
    const elig = paidCheckoutEligibility(user?.plan, plan.key);
    if (!elig.allowed) {
      if (elig.reason === 'current') toast.error('Already on this plan', 'You are already subscribed to this tier.');
      else if (elig.reason === 'downgrade') toast.info('Change plan in Billing', 'To switch to a lower tier, use Billing → manage subscription.');
      return;
    }
    setCheckoutKey(plan.key);
    try {
      const res = await createCheckoutSession({ accessToken: session.access_token, planSlug: plan.key });
      const url = res?.data?.checkoutUrl;
      if (url) { window.location.href = url; return; }
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
    const resumeElig = paidCheckoutEligibility(user?.plan, plan.key);
    if (!resumeElig.allowed) { clearPendingCheckoutPlan(); return; }
    if (resumeCheckoutRef.current) return;
    resumeCheckoutRef.current = true;
    let cancelled = false;
    setCheckoutKey(plan.key);
    (async () => {
      try {
        const res = await createCheckoutSession({ accessToken: session.access_token, planSlug: plan.key });
        if (cancelled) return;
        const url = res?.data?.checkoutUrl;
        if (url) { clearPendingCheckoutPlan(); window.location.href = url; return; }
        throw new Error('No checkout URL returned');
      } catch (err) {
        if (!cancelled) { resumeCheckoutRef.current = false; toast.error('Checkout failed', err?.message || 'Please try again.'); }
      } finally {
        if (!cancelled) setCheckoutKey(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoading, loadError, plans, session?.access_token, subscriptionLoading, user?.plan, toast]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadPlans() {
      setIsLoading(true); setLoadError('');
      try {
        const apiPlans = await getPricingPlans({ signal: controller.signal });
        if (apiPlans.length === 0) throw new Error('Pricing API returned invalid plan data');
        if (!cancelled) setPlans(apiPlans.map(normalizePlan));
      } catch (error) {
        if (!cancelled) { setLoadError('Pricing is temporarily unavailable. Please try again shortly.'); setPlans([]); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadPlans();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  // Static comparison — source of truth for what each tier actually provides.
  // free: limited rules, 7-day journal, 1 account
  // pro: all rules, 90-day journal, 5 accounts
  // proplus: unlimited everything
  const COMPARISON_SECTIONS = [
    {
      category: 'Core Protection',
      rows: [
        { label: 'Daily loss protection', free: true, pro: true, proplus: true },
        { label: 'Hedging prevention', free: true, pro: true, proplus: true },
        { label: 'Basic rule enforcement', free: true, pro: true, proplus: true },
        { label: 'Risk per trade rule', free: false, pro: true, proplus: true },
        { label: 'Max drawdown lock', free: false, pro: true, proplus: true },
      ],
    },
    {
      category: 'Trading Rules',
      rows: [
        { label: 'Active rules', free: 'Limited', pro: 'All rules', proplus: 'Unlimited' },
        { label: 'Custom rule builder', free: false, pro: true, proplus: true },
        { label: 'Rule violation alerts', free: false, pro: true, proplus: true },
      ],
    },
    {
      category: 'Journal & Analytics',
      rows: [
        { label: 'Trade journal history', free: '7 days', pro: '90 days', proplus: 'Unlimited' },
        { label: 'AI trade insights', free: false, pro: true, proplus: true },
        { label: 'Behavior pattern analysis', free: false, pro: true, proplus: true },
        { label: 'Trade replay', free: false, pro: true, proplus: true },
      ],
    },
    {
      category: 'Accounts',
      rows: [
        { label: 'Trading accounts', free: '1', pro: '5', proplus: 'Unlimited' },
        { label: 'Multi-account analytics', free: false, pro: false, proplus: true },
      ],
    },
  ];

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
      if (isPaidPlan(user?.plan)) return <Link to="/dashboard/account/billing" className={`block text-center ${baseClass}`} style={secondaryStyle}>Manage subscription</Link>;
      return <Link to={plan.ctaLink} className={`block text-center ${baseClass}`} style={isPrimary ? primaryStyle : secondaryStyle}>{plan.cta}</Link>;
    }

    if (plan.key !== 'free' && session?.access_token) {
      const paidElig = paidCheckoutEligibility(user?.plan, plan.key);
      if (subscriptionLoading) return <button disabled className={`${baseClass} opacity-60 cursor-wait`} style={isPrimary ? primaryStyle : secondaryStyle}>Loading plan…</button>;
      if (paidElig && !paidElig.allowed && paidElig.reason === 'current') return <button disabled className={`${baseClass} opacity-70 cursor-not-allowed`} style={secondaryStyle}>Current plan ✓</button>;
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

      <div className="relative mx-auto max-w-7xl px-6 pt-28 pb-16">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-7" style={{ borderColor: 'rgba(0,212,170,0.22)', backgroundColor: 'rgba(0,212,170,0.07)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ boxShadow: '0 0 6px rgba(0,212,170,0.8)' }} />
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: '#00d4aa' }}>Protection plans</span>
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight text-white mb-5 leading-[1.08]">
            Trade with{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #00d4aa 0%, #34d399 100%)' }}>
              discipline.
            </span>
            <br />
            Pay as you grow.
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-11 leading-relaxed">
            Start free with core protection. Upgrade for deeper AI insights, unlimited history, and stronger enforcement.
          </p>

          {/* Trust strip */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {TRUST_BADGES.map((b, i) => (
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
            <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 text-sm">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-t-accent/80 border-accent/20 animate-spin" />
              Loading plans…
            </div>
          )}
        </motion.div>

        {/* ── Plan cards ───────────────────────────────────────────────────── */}
        {plans.length > 0 && (
          <div className="grid md:grid-cols-3 gap-4 lg:gap-5 max-w-5xl mx-auto mb-6 md:items-center">
            {plans.map((plan, i) => {
              const t = PLAN_THEME[plan.key] || PLAN_THEME.free;
              const isPrimary = plan.primary;
              const price = plan.monthlyPrice;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.1, duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className={`relative flex flex-col ${isPrimary ? 'md:-mt-5 md:-mb-5 z-10' : 'z-0'}`}
                >
                  {/* Outer ambient glow for primary/proplus */}
                  {t.glow && (
                    <div
                      className="pointer-events-none absolute -inset-8 rounded-[3rem] blur-3xl"
                      style={{ background: `radial-gradient(ellipse at 50% 30%, ${t.glow}, transparent 65%)` }}
                      aria-hidden
                    />
                  )}

                  {/* Gradient border shell */}
                  <div className={`relative flex flex-col flex-1 rounded-[1.6rem] p-[1px] bg-gradient-to-b ${t.border}`}>
                    {/* Card inner */}
                    <div
                      className="relative flex flex-col flex-1 overflow-hidden rounded-[1.5rem]"
                      style={{ backgroundColor: isPrimary ? '#0d1627' : '#0b1020' }}
                    >
                      {/* Per-plan inner top glow */}
                      {t.glow && (
                        <div
                          className="pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-[1.5rem]"
                          style={{ background: `linear-gradient(to bottom, ${t.glow.replace('0.16', '0.06').replace('0.14', '0.05')}, transparent)` }}
                          aria-hidden
                        />
                      )}

                      <div className="relative flex flex-col flex-1 p-7">
                        {/* Top row: icon + badge */}
                        <div className="flex items-start justify-between mb-5">
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
                        <h3 className="font-display text-xl font-bold text-white mb-1">{plan.name}</h3>
                        <p className="text-[12px] leading-relaxed mb-6" style={{ color: '#475569' }}>{t.tagline}</p>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5 mb-1">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={price}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              className="font-display text-4xl font-black text-white"
                            >
                              {price === 0 ? '$0' : `$${price}`}
                            </motion.span>
                          </AnimatePresence>
                          {price > 0 && <span className="text-sm" style={{ color: '#475569' }}>/mo</span>}
                        </div>
                        <p className="text-[11px] mb-6" style={{ color: '#334155' }}>
                          {price === 0 ? 'No credit card required' : 'Billed monthly · cancel anytime'}
                        </p>

                        {/* Divider */}
                        <div className="mb-5 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />

                        {/* Feature list */}
                        <ul className="space-y-2.5 flex-1">
                          {plan.features.map((f) => (
                            <li key={f.text} className="flex items-start gap-2.5">
                              {f.included ? (
                                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: t.checkColor }}>
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#1e293b' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span className="text-sm leading-snug" style={{ color: f.included ? '#cbd5e1' : '#334155' }}>
                                {f.text}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {/* Limitations */}
                        {plan.limitations.length > 0 && (
                          <ul className="mt-5 pt-4 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {plan.limitations.map((l) => (
                              <li key={l} className="flex items-start gap-2 text-[11px]" style={{ color: '#334155' }}>
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: '#1e293b' }} />
                                {l}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* CTA */}
                        <div className="mt-7">
                          <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                            {renderCta(plan)}
                          </motion.div>
                        </div>
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

        {/* ── Feature comparison table ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto mt-24 mb-24"
        >
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
              Compare plans side by side
            </h2>
            <p className="text-sm" style={{ color: '#475569' }}>
              Every feature at a glance. Pick the plan that fits your trading.
            </p>
          </div>

          {/* Column headers */}
          <div
            className="grid rounded-t-2xl"
            style={{ gridTemplateColumns: 'minmax(0,2fr) repeat(3,minmax(0,1fr))', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="px-6 py-5" />
            {[
              { key: 'free', label: 'Free', color: '#64748b' },
              { key: 'pro', label: 'Pro', color: '#00d4aa', highlight: true },
              { key: 'proplus', label: 'Pro+', color: '#a78bfa' },
            ].map((col) => (
              <div
                key={col.key}
                className="px-4 py-5 text-center"
                style={col.highlight ? { backgroundColor: 'rgba(0,212,170,0.04)' } : {}}
              >
                <span className="text-sm font-display font-bold" style={{ color: col.color }}>{col.label}</span>
              </div>
            ))}
          </div>

          {/* Sections */}
          <div className="overflow-hidden rounded-b-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none' }}>
            {COMPARISON_SECTIONS.map((section, si) => (
              <div key={section.category}>
                {/* Category header */}
                <div
                  className="grid px-6 py-2.5"
                  style={{
                    gridTemplateColumns: 'minmax(0,2fr) repeat(3,minmax(0,1fr))',
                    backgroundColor: 'rgba(255,255,255,0.025)',
                    borderTop: si > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#334155' }}>
                    {section.category}
                  </span>
                  <div className="col-span-3" style={{}}>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
                      {['', '', ''].map((_, i) => (
                        <div key={i} style={i === 1 ? { backgroundColor: 'rgba(0,212,170,0.025)' } : {}} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Feature rows */}
                {section.rows.map((row, ri) => (
                  <div
                    key={row.label}
                    className="grid"
                    style={{
                      gridTemplateColumns: 'minmax(0,2fr) repeat(3,minmax(0,1fr))',
                      borderBottom: ri < section.rows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.006)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center px-6 py-3.5">
                      <span className="text-sm" style={{ color: '#64748b' }}>{row.label}</span>
                    </div>
                    {[
                      { key: 'free', val: row.free, color: '#64748b', highlight: false },
                      { key: 'pro', val: row.pro, color: '#00d4aa', highlight: true },
                      { key: 'proplus', val: row.proplus, color: '#a78bfa', highlight: false },
                    ].map((col) => (
                      <div
                        key={col.key}
                        className="flex items-center justify-center px-4 py-3.5"
                        style={col.highlight ? { backgroundColor: 'rgba(0,212,170,0.02)' } : {}}
                      >
                        {col.val === true ? (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: col.color }}>
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : col.val === false ? (
                          <span className="h-px w-3 rounded-full block" style={{ backgroundColor: '#1e293b' }} />
                        ) : (
                          <span className="text-xs font-semibold tabular-nums" style={{ color: col.color }}>{col.val}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

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
                {session?.access_token && !subscriptionLoading && isPaidPlan(user?.plan)
                  ? 'You are on a paid plan. Manage billing anytime from your account.'
                  : 'Join traders who trust TradeGuardX. Start free — no card required.'}
              </p>
              <motion.div
                className="inline-block"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  to={session?.access_token ? '/dashboard' : '/beta-traders'}
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
