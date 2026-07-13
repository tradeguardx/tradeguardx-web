import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Check = () => (
  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
  </svg>
);

const FREE = [
  <>Real-time <b>monitoring</b> of your Delta account</>,
  <>Daily-loss & risk-per-trade <b>alerts</b></>,
  <>Alerts on <b>Telegram, WhatsApp & email</b></>,
  <>Basic trade journal</>,
];

const PRO = [
  <>Everything in Free, plus:</>,
  <>Server-side <b>kill switch</b> — auto cancel, close & lock</>,
  <>Cooldown after consecutive losses</>,
  <>Leverage & risk-per-trade <b>enforcement</b></>,
  <>AI trade journal + <b>behaviour pattern</b> detection</>,
  <>CoinDCX access the day it ships</>,
];

export default function PricingSection() {
  return (
    <section id="pricing" className="section-gap relative border-t border-white/[0.05] bg-gradient-to-b from-surface-950 to-surface-900/50">
      <div className="section-padding mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow mb-4">Pricing</span>
          <h2 className="display-lg mt-4">Cheaper than one bad trade.</h2>
          <p className="body-lg mx-auto mt-5 max-w-lg">
            Start free with monitoring and alerts. Upgrade when you want the rules actually enforced.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/[0.06] bg-surface-900/60 p-8"
          >
            <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Free</div>
            <h3 className="mt-3 font-display text-3xl font-bold tracking-tight">Watchtower</h3>
            <p className="mt-1 text-sm text-slate-400">See every breach the moment it happens.</p>
            <div className="mt-6 flex items-baseline gap-1.5 border-b border-white/[0.06] pb-6">
              <span className="font-mono text-4xl font-medium tracking-tight">₹0</span>
              <span className="font-mono text-[13px] text-slate-500">/forever</span>
            </div>
            <ul className="mt-6 space-y-3">
              {FREE.map((f, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300 [&_b]:font-medium [&_b]:text-white">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              Start free
            </Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-b from-accent/[0.04] to-surface-900/60 p-8"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
            <div className="flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-widest text-accent">Pro</div>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                Most popular
              </span>
            </div>
            <h3 className="mt-3 font-display text-3xl font-bold tracking-tight">Kill Switch</h3>
            <p className="mt-1 text-sm text-slate-400">Rules you literally cannot break in the moment.</p>
            <div className="mt-6 border-b border-white/[0.06] pb-6">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-medium tracking-tight">₹1,299</span>
                <span className="font-mono text-[13px] text-slate-500">/month</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-500">incl. 18% GST</p>
            </div>
            <ul className="mt-6 space-y-3">
              {PRO.map((f, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300 [&_b]:font-medium [&_b]:text-white">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="mt-8 flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-[#04231a] shadow-lg shadow-accent/25 transition hover:bg-accent/90"
            >
              Get Pro
            </Link>
          </motion.div>
        </div>

        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/[0.06] bg-surface-900/50 p-6 text-center">
          <p className="text-sm leading-relaxed text-slate-400">
            One stopped tilt session pays for <b className="font-medium text-slate-200">years</b> of Pro.
            A single <span className="text-rose-400 line-through">₹2.4L blow-up</span> costs more than a
            decade of it. <Link to="/pricing" className="text-accent hover:underline">See full plan comparison →</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
