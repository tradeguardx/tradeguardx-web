import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SupportedBrokers from '../components/landing/SupportedBrokers';

const plans = [
  {
    name: 'Free',
    price: 'Free forever',
    sub: 'No card required',
    cta: 'Get Free',
    ctaLink: '/signup',
    primary: false,
    features: [
      'Daily loss protection',
      'Hedging prevention',
      'Basic trade detection',
      'Basic rule enforcement',
    ],
    limitations: [
      'Limited trade journaling (7 days history)',
      'Limited number of configurable accounts',
      'Basic dashboard',
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    sub: '/month',
    cta: 'Start Pro',
    ctaLink: '/signup?plan=pro',
    primary: true,
    features: [
      'Everything in Free',
      'Risk per trade rule',
      'Max total loss protection',
      'Max trades per day',
      'Stacking protection',
      'Close day after N losses',
      'Advanced rule configuration',
      'Trade journaling (90 days history)',
    ],
    limitations: [],
  },
  {
    name: 'Pro+',
    price: '$39',
    sub: '/month',
    cta: 'Start Pro+',
    ctaLink: '/signup?plan=proplus',
    primary: false,
    badge: 'Professional',
    features: [
      'Everything in Pro',
      'Unlimited journaling',
      'Advanced analytics',
      'Trade performance metrics',
      'Win rate analysis',
      'Trade statistics',
      'Risk analytics',
      'Future AI insights',
    ],
    limitations: [],
  },
];

export default function PricingPage() {
  return (
    <div className="pt-28 pb-24 min-h-screen relative">
      <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Start free. Upgrade when you need more rules and analytics.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.primary
                  ? 'border-accent/50 bg-gradient-to-b from-accent/10 to-surface-900/80 shadow-glow'
                  : 'border-surface-700/50 bg-surface-900/30'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium">
                  {plan.badge}
                </span>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-500">{plan.sub}</span>
                </div>
                <p className="text-slate-500 text-sm mt-1">{plan.sub === 'No card required' ? '' : 'Billed monthly'}</p>
              </div>
              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-slate-300 text-sm">
                    <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.limitations.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {plan.limitations.map((l) => (
                    <li key={l} className="text-slate-500 text-xs">• {l}</li>
                  ))}
                </ul>
              )}
              <Link
                to={plan.ctaLink}
                className={`mt-8 block w-full py-3 rounded-xl text-center font-medium transition-all ${
                  plan.primary
                    ? 'bg-accent text-surface-950 hover:bg-accent-hover'
                    : 'bg-surface-700/50 text-white hover:bg-surface-600/50 border border-surface-600/50'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-slate-500 text-sm mt-12"
        >
          Pro and Pro+ require an account. You’ll sign in or create one after clicking Start.
        </motion.p>

        <SupportedBrokers />
      </div>
    </div>
  );
}
