import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Check = () => (
  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
  </svg>
);

/**
 * One plan, three billing intervals — the prices and product ids live in
 * plans.features.intervals for slug `pro`. Keep these in step with that row;
 * /pricing renders the same numbers straight from the database.
 *
 * The free tier is deliberately NOT a card here. Leading a pricing section
 * with ₹0 sells the wrong thing: the reason to be here is enforcement, and
 * the trial already gives that away for a week without a card.
 */
const PLANS = [
  {
    interval: 'Monthly',
    price: '₹1,299',
    per: '/month',
    sub: 'Billed monthly',
    tag: null,
    primary: false,
  },
  {
    interval: 'Quarterly',
    price: '₹3,299',
    per: '/quarter',
    sub: '₹1,100 a month, billed every 3 months',
    tag: 'Save 15%',
    primary: false,
  },
  {
    interval: 'Yearly',
    price: '₹8,999',
    per: '/year',
    sub: '₹750 a month, billed once a year',
    tag: 'Save 42%',
    primary: true,
  },
];

const INCLUDED = [
  <>Automatic <b>kill switch</b> — cancels orders, closes positions, locks the account</>,
  <><b>Every rule</b> — daily loss, profit target, risk per trade, trade cap, cooldowns, drawdown, stop-loss</>,
  <>Manual lockout you <b>cannot call off</b> — 3, 6 or 12 hours</>,
  <><b>Unlimited</b> trading accounts</>,
  <>Delta Exchange <b>and CoinDCX</b> — both included</>,
  <><b>3 financial years</b> of history, journal & behaviour ledger</>,
  <>Tax centre, economic calendar, Telegram & email alerts</>,
  <>Priority support</>,
];

export default function PricingSection() {
  return (
    <section id="pricing" className="section-gap relative border-t border-white/[0.05] bg-gradient-to-b from-surface-950 to-surface-900/50">
      <div className="section-padding mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow mb-4">Pricing</span>
          <h2 className="display-lg mt-4">Cheaper than one bad trade.</h2>
          <p className="body-lg mx-auto mt-5 max-w-lg">
            One plan, everything included. Pick how often you want to pay — the longer you commit,
            the less it costs.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.interval}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={`relative flex flex-col overflow-hidden rounded-2xl border p-7 ${
                plan.primary
                  ? 'border-accent/40 bg-gradient-to-b from-accent/[0.05] to-surface-900/60'
                  : 'border-white/[0.06] bg-surface-900/60'
              }`}
            >
              {plan.primary && (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              )}
              <div className="flex items-center justify-between gap-2">
                <div className={`font-mono text-[11px] uppercase tracking-widest ${plan.primary ? 'text-accent' : 'text-slate-500'}`}>
                  {plan.interval}
                </div>
                {plan.tag && (
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                    {plan.tag}
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-medium tracking-tight">{plan.price}</span>
                <span className="font-mono text-[13px] text-slate-500">{plan.per}</span>
              </div>
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-slate-500">{plan.sub}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-600">incl. 18% GST</p>

              <Link
                to="/pricing"
                className={`mt-6 flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold transition ${
                  plan.primary
                    ? 'bg-accent text-[#04231a] shadow-lg shadow-accent/25 hover:bg-accent/90'
                    : 'border border-white/[0.12] bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]'
                }`}
              >
                Get Pro
              </Link>
            </motion.div>
          ))}
        </div>

        {/* One list, because the interval changes the price and nothing else. */}
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/[0.06] bg-surface-900/40 p-7">
          <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-widest text-slate-500">
            Every plan includes
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((f, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300 [&_b]:font-medium [&_b]:text-white">
                <Check />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-10 max-w-xl text-center">
          <p className="text-sm leading-relaxed text-slate-400">
            Free for 7 days, no card. Cancel anytime, and there is a 14-day refund if you change
            your mind after paying.{' '}
            <Link to="/pricing" className="text-accent hover:underline">See full plan comparison →</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
