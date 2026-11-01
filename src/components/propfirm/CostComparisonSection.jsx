import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';

function useCountUp(target, durationMs, triggered) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!triggered) return;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [triggered, target, durationMs]);

  return value;
}

const withoutItems = [
  {
    label: 'Failed prop challenge reset',
    cost: '~ $300',
    note: 'One bad day. One violated rule. Full reset fee.',
  },
  {
    label: 'Revenge trading session',
    cost: '~ $400',
    note: 'Emotional spiral after a loss — average damage per incident.',
  },
  {
    label: 'Overtrading a losing week',
    cost: '~ $600+',
    note: 'No hard stop on daily trades. Judgment goes, account follows.',
  },
  {
    label: 'Undisciplined position sizing',
    cost: '~ $250',
    note: 'One oversized trade on a whim. Risk management ignored.',
  },
];

const withItems = [
  {
    label: 'TradeGuardX Pro',
    cost: '$25 / mo',
    note: 'Full rule engine + AI journal + behavior pattern reports.',
  },
  {
    label: 'One prevented mistake',
    cost: '= 12 months',
    note: 'A single avoided prop reset covers a full year of Pro.',
  },
  {
    label: 'AI behavior analysis',
    cost: 'Included',
    note: 'Identifies the patterns you repeat — before they cost you.',
  },
  {
    label: 'Automatic enforcement',
    cost: 'Every trade',
    note: 'Rules run without you having to remember. That\'s the point.',
  },
];

function Row({ label, cost, note, index, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: color === 'red' ? -16 : 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.05] last:border-0"
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className={`mt-1 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center ${
            color === 'red' ? 'bg-red-500/15 border border-red-500/30' : 'bg-accent/15 border border-accent/30'
          }`}
        >
          {color === 'red' ? (
            <svg className="h-2.5 w-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-2.5 w-2.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{note}</p>
        </div>
      </div>
      <span
        className={`flex-shrink-0 font-mono text-sm font-bold tabular-nums ${
          color === 'red' ? 'text-red-400' : 'text-accent'
        }`}
      >
        {cost}
      </span>
    </motion.div>
  );
}

export default function CostComparisonSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const countedLoss = useCountUp(1500, 2000, inView);

  return (
    <section id="cost-comparison" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-surface-900/40 to-transparent" />
      {/* Subtle red/green ambient glow */}
      <div className="pointer-events-none absolute left-[20%] top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-red-500/5 blur-[80px]" />
      <div className="pointer-events-none absolute right-[20%] top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-accent/5 blur-[80px]" />

      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
            The real cost
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            One missed rule costs more
            <br />
            <span className="gradient-text-accent">than a year of protection.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Most traders lose hundreds every month to the same avoidable mistakes.
            TradeGuardX costs less than one bad trade.
          </p>
        </motion.div>

        {/* Comparison panels */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Without panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="gradient-card gradient-card-warm p-6 backdrop-blur-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <div>
                <p className="font-display text-base font-bold text-red-200">Without TradeGuardX</p>
                <p className="text-xs text-red-400/70">Typical monthly damage from rule breaks</p>
              </div>
            </div>

            <div>
              {withoutItems.map((item, i) => (
                <Row key={item.label} {...item} index={i} color="red" />
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-red-200">Average monthly loss</span>
                <span className="font-mono text-xl font-black text-red-400">${countedLoss.toLocaleString()}+</span>
              </div>
              <p className="mt-1 text-xs text-red-400/60">
                To emotional, undisciplined trading decisions
              </p>
            </div>
          </motion.div>

          {/* With panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="gradient-card p-6 backdrop-blur-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10">
                <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p className="font-display text-base font-bold text-accent">With TradeGuardX</p>
                <p className="text-xs text-accent/60">What you get for $25 / month</p>
              </div>
            </div>

            <div>
              {withItems.map((item, i) => (
                <Row key={item.label} {...item} index={i} color="green" />
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-accent/25 bg-accent/8 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-accent/90">Break-even point</span>
                <span className="font-mono text-xl font-black text-accent">1 trade</span>
              </div>
              <p className="mt-1 text-xs text-accent/50">
                Prevent one mistake and Pro pays for itself — many times over
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA nudge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-10 text-center"
        >
          <p className="mb-4 text-slate-400">
            Start free. Upgrade when you see the difference.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-3.5 text-base font-semibold text-[#0a0c10] shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-95"
          >
            See pricing
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
