import { motion } from 'framer-motion';

const testimonials = [
  {
    quote:
      'I failed two FTMO challenges before TradeGuardX. The daily loss block literally stopped me on a bad NFP day — I was about to blow the account. Passed Phase 2 the following week.',
    name: 'Marcus D.',
    role: 'FTMO Funded Trader',
    initials: 'MD',
    avatarColor: 'from-accent/30 to-emerald-500/20 border-accent/25',
    initialsColor: 'text-accent',
    highlightRule: 'Daily loss protection',
    ruleColor: 'text-accent border-accent/20 bg-accent/5',
  },
  {
    quote:
      "I didn't believe I had a revenge-trading problem until the extension blocked me three times in one afternoon. That was the wake-up call. My win rate went from 42% to 61% in six weeks.",
    name: 'Priya K.',
    role: 'Forex Day Trader',
    initials: 'PK',
    avatarColor: 'from-blue-500/30 to-indigo-500/20 border-blue-500/25',
    initialsColor: 'text-blue-400',
    highlightRule: 'Max trades per day',
    ruleColor: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
  },
  {
    quote:
      'The no-stop-loss detection is a game changer. I was running a naked position during a news spike and had no idea until TradeGuardX flagged it. Would have been a liquidation.',
    name: 'Jake T.',
    role: 'Crypto Prop Trader',
    initials: 'JT',
    avatarColor: 'from-purple-500/30 to-pink-500/20 border-purple-500/25',
    initialsColor: 'text-purple-400',
    highlightRule: 'Stop loss protection',
    ruleColor: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  },
];

function Stars() {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-surface-900/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
            From traders
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Rules that actually held.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate-400">
            What happens when enforcement is automatic, not optional.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="gradient-card group flex flex-col p-6 backdrop-blur-sm"
            >
              {/* Stars */}
              <Stars />

              {/* Quote */}
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-300">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Rule badge */}
              <div className="mt-5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${t.ruleColor}`}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  {t.highlightRule}
                </span>
              </div>

              {/* Author */}
              <div className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border bg-gradient-to-br ${t.avatarColor}`}
                >
                  <span className={`font-display text-xs font-bold ${t.initialsColor}`}>
                    {t.initials}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
