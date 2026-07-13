import { motion } from 'framer-motion';

const PAINS = [
  {
    cost: '₹35,000',
    label: 'Avg revenge session',
    title: 'The spiral after a loss',
    body: "One red trade triggers five more. By the time you stop, you've sized up 4× and traded the same pair from both sides. Your plan is gone — only emotion is left.",
  },
  {
    cost: '₹25,000',
    label: 'Avg blow-up day',
    title: 'The one bad morning',
    body: 'Stops removed "for a bit." Leverage cranked to 50×. A wick takes out the account. Weeks of patient gains evaporate in a single 15-minute candle.',
  },
  {
    cost: '₹50,000+',
    label: 'Avg overtraded week',
    title: 'No hard stop, no end',
    body: "You said you'd stop after three losers. You took fifteen. Each one smaller, hoping to grind back. The account doesn't recover — it just bleeds.",
  },
];

export default function ProblemSection() {
  return (
    <section className="section-gap relative border-t border-white/[0.05] bg-gradient-to-b from-transparent to-surface-900/40">
      <div className="section-padding mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow mb-4">The pattern every trader knows</span>
          <h2 className="display-lg mt-4">
            You don&apos;t lose to the market.
            <br />
            <span className="gradient-text-accent">You lose to yourself.</span>
          </h2>
          <p className="body-lg mx-auto mt-5 max-w-xl">
            Every Delta trader has the same story. One bad morning. Stops removed. Leverage doubled.
            A whole month of gains gone in two hours.{' '}
            <span className="text-slate-200">Discipline by willpower doesn&apos;t scale.</span>
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PAINS.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-900/60 p-7"
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(circle at 0% 0%, rgba(244,63,94,0.06), transparent 50%)' }}
                aria-hidden
              />
              <div className="font-display text-4xl font-bold tracking-tight text-rose-400">{p.cost}</div>
              <div className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-slate-500">{p.label}</div>
              <h4 className="mt-5 text-lg font-semibold text-slate-100">{p.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
