import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import FAQ from '../components/landing/FAQ';
import { getPricingPlans } from '../api/pricingApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import { createCheckoutSession } from '../api/paymentsApi';

const PLAN_STYLE = {
  free: {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    iconGradient: 'from-slate-400/20 to-slate-500/10',
    iconColor: 'text-slate-400',
  },
  pro: {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    iconGradient: 'from-accent/25 to-emerald-500/15',
    iconColor: 'text-accent',
  },
  proplus: {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    iconGradient: 'from-purple-500/25 to-pink-500/15',
    iconColor: 'text-purple-400',
  },
};

function planKey(name = '') {
  return name.toLowerCase().replace(/\s|\+/g, '');
}

function normalizePlan(raw, index) {
  const name = raw.name || `Plan ${index + 1}`;
  const key = planKey(name);
  const style = PLAN_STYLE[key] || PLAN_STYLE.free;
  const featureList = Array.isArray(raw.features)
    ? raw.features
    : Array.isArray(raw.features?.cardFeatures)
      ? raw.features.cardFeatures
      : [];
  const normalizedFeatures = featureList.map((f) => {
    if (typeof f === 'string') return { text: f, included: true };
    return {
      text: f?.text || '',
      included: f?.included !== false,
    };
  }).filter((f) => f.text);
  const monthlyPrice = Number(raw.priceMonthly ?? raw.monthlyPrice ?? 0);
  const ctaLink = raw.features?.ctaLink || (key === 'free' ? '/signup' : `/signup?plan=${key}`);

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
    icon: style.icon,
    iconGradient: style.iconGradient,
    iconColor: style.iconColor,
  };
}

function CheckIcon() {
  return (
    <svg className="w-4.5 h-4.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [checkoutKey, setCheckoutKey] = useState(null);
  const { session } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handlePaidPlanCta(plan) {
    if (plan.key === 'free') {
      navigate(plan.ctaLink);
      return;
    }
    if (!session?.access_token) {
      navigate(plan.ctaLink);
      return;
    }
    setCheckoutKey(plan.key);
    try {
      const res = await createCheckoutSession({
        accessToken: session.access_token,
        planSlug: plan.key,
      });
      const url = res?.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      toast.error('Checkout failed', err?.message || 'Please try again.');
    } finally {
      setCheckoutKey(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadPlans() {
      setIsLoading(true);
      setLoadError('');

      try {
        const apiPlans = await getPricingPlans({ signal: controller.signal });
        if (apiPlans.length === 0) {
          throw new Error('Pricing API returned invalid plan data');
        }

        if (!cancelled) {
          setPlans(apiPlans.map(normalizePlan));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError('Pricing is temporarily unavailable. Please try again shortly.');
          setPlans([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const comparisonFeatures = useMemo(() => {
    const featuresMap = new Map();

    plans.forEach((plan) => {
      plan.features.forEach((feature) => {
        const existing = featuresMap.get(feature.text) || { name: feature.text };
        existing[plan.key] = feature.included;
        featuresMap.set(feature.text, existing);
      });
    });

    return Array.from(featuresMap.values());
  }, [plans]);

  return (
    <div className="pt-28 pb-8 min-h-screen relative">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent/[0.04] blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[600px] right-0 w-[400px] h-[400px] bg-purple-500/[0.03] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            Pricing
          </span>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5">
            Choose your protection level
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
            Start free, upgrade when you need more. All plans include core trade protection with no hidden fees.
          </p>
          {loadError && (
            <p className="text-amber-400 text-sm mb-6">{loadError}</p>
          )}
          {isLoading && (
            <p className="text-slate-500 text-sm mb-6">Loading latest pricing from server...</p>
          )}

        </motion.div>

        {/* Plans */}
        {plans.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto mb-10">
            {plans.map((plan, i) => {
              const price = plan.monthlyPrice;
              const displayPrice = price === 0 ? '$0' : `$${price}`;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
                  whileHover={{ y: -4 }}
                  className={`relative rounded-3xl p-[1px] flex flex-col transition-all duration-500 ${
                    plan.primary
                      ? 'bg-gradient-to-b from-accent/40 via-accent/10 to-transparent shadow-glow-lg md:scale-[1.04] z-10'
                      : ''
                  }`}
                >
                  <div className={`rounded-[1.4rem] p-7 md:p-8 flex flex-col flex-1 ${
                    plan.primary
                      ? 'bg-gradient-to-b from-surface-900 via-surface-900 to-surface-950'
                      : 'border border-white/[0.06] bg-surface-900/40'
                  }`}>
                    {/* Badge */}
                    {plan.badge && (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${
                        plan.primary
                          ? 'bg-accent text-surface-950 shadow-md shadow-accent/30'
                          : 'bg-surface-800 text-slate-300 border border-white/[0.08]'
                      }`}>
                        {plan.badge}
                      </span>
                    )}

                    {/* Plan icon + name */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${plan.iconGradient} flex items-center justify-center ${plan.iconColor}`}>
                        {plan.icon}
                      </div>
                      <h3 className="font-display text-xl font-bold text-white">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="mb-7">
                      <div className="flex items-baseline gap-1.5">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={displayPrice}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.2 }}
                            className="text-4xl md:text-5xl font-display font-bold text-white"
                          >
                            {displayPrice}
                          </motion.span>
                        </AnimatePresence>
                        {price > 0 && (
                          <span className="text-slate-500 text-sm">/month</span>
                        )}
                      </div>
                      {price === 0 && (
                        <p className="text-slate-600 text-xs mt-1.5">No credit card required</p>
                      )}
                      {price > 0 && (
                        <p className="text-slate-600 text-xs mt-1.5">Billed monthly</p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <li key={f.text} className="flex items-start gap-2.5 text-sm">
                          {f.included ? (
                            <CheckIcon />
                          ) : (
                            <XIcon />
                          )}
                          <span className={f.included ? 'text-slate-300' : 'text-slate-600'}>
                            {f.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Limitations */}
                    {plan.limitations.length > 0 && (
                      <ul className="mt-5 pt-4 border-t border-white/[0.04] space-y-2">
                        {plan.limitations.map((l) => (
                          <li key={l} className="flex items-start gap-2 text-slate-600 text-xs">
                            <span className="w-1 h-1 rounded-full bg-slate-700 mt-1.5 flex-shrink-0" />
                            {l}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CTA */}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8">
                      {plan.key !== 'free' && session?.access_token ? (
                        <button
                          type="button"
                          onClick={() => handlePaidPlanCta(plan)}
                          disabled={checkoutKey === plan.key}
                          className={`block w-full py-3.5 rounded-xl text-center font-semibold transition-all duration-300 text-sm disabled:opacity-60 ${
                            plan.primary
                              ? 'bg-accent text-surface-950 hover:bg-accent-hover shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/30'
                              : 'bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12]'
                          }`}
                        >
                          {checkoutKey === plan.key ? 'Redirecting…' : plan.cta}
                        </button>
                      ) : (
                        <Link
                          to={plan.ctaLink}
                          className={`block w-full py-3.5 rounded-xl text-center font-semibold transition-all duration-300 text-sm ${
                            plan.primary
                              ? 'bg-accent text-surface-950 hover:bg-accent-hover shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/30'
                              : 'bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12]'
                          }`}
                        >
                          {plan.cta}
                        </Link>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          !isLoading && (
            <div className="max-w-3xl mx-auto mb-12 rounded-2xl border border-white/[0.08] bg-surface-900/40 px-6 py-10 text-center">
              <p className="text-slate-300 text-base">Unable to load pricing plans right now.</p>
              <p className="text-slate-500 text-sm mt-2">Please refresh the page or try again in a few minutes.</p>
            </div>
          )
        )}

        {/* Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-6 flex-wrap text-sm mb-20"
        >
          <span className="flex items-center gap-2 text-slate-500">
            <svg className="w-5 h-5 text-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            7-day money-back guarantee
          </span>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span className="flex items-center gap-2 text-slate-500">
            <svg className="w-5 h-5 text-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cancel anytime
          </span>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span className="flex items-center gap-2 text-slate-500">
            <svg className="w-5 h-5 text-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure payment
          </span>
        </motion.div>

        {/* Feature comparison table */}
        {plans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto mb-20"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white text-center mb-3">
              Compare plans side by side
            </h2>
            <p className="text-slate-500 text-center text-sm mb-10">
              Every feature at a glance. Pick the plan that fits your trading.
            </p>

            <div className="rounded-3xl glass overflow-hidden">
              {/* Table header */}
              <div
                className="grid border-b border-white/[0.06]"
                style={{ gridTemplateColumns: `minmax(0, 2fr) repeat(${plans.length}, minmax(0, 1fr))` }}
              >
                <div className="px-6 py-4">
                  <span className="text-sm font-semibold text-slate-400">Feature</span>
                </div>
                {plans.map((plan) => (
                  <div key={plan.id} className="px-4 py-4 text-center">
                    <span className={`text-sm font-display font-bold ${plan.primary ? 'text-accent' : 'text-white'}`}>
                      {plan.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Table rows */}
              {comparisonFeatures.map((feature, i) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.02 }}
                  className={`grid border-b border-white/[0.03] last:border-0 ${
                    i % 2 === 0 ? 'bg-white/[0.01]' : ''
                  }`}
                  style={{ gridTemplateColumns: `minmax(0, 2fr) repeat(${plans.length}, minmax(0, 1fr))` }}
                >
                  <div className="px-6 py-3.5">
                    <span className="text-sm text-slate-400">{feature.name}</span>
                  </div>
                  {plans.map((plan) => {
                    const val = feature[plan.key] ?? false;
                    return (
                      <div key={`${feature.name}-${plan.key}`} className="px-4 py-3.5 flex items-center justify-center">
                        {val === true ? (
                          <CheckIcon />
                        ) : val === false ? (
                          <XIcon />
                        ) : (
                          <span className="text-xs font-medium text-slate-300">{val}</span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* FAQ */}
        <FAQ />

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center py-20"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to protect your trades?
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            Join thousands of traders who trust TradeGuardX. Start free, no card required.
          </p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-accent text-surface-950 font-semibold text-lg hover:bg-accent-hover transition-all duration-300 shadow-lg shadow-accent/20"
            >
              Get Started Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
