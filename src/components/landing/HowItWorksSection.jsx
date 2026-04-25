import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Install the extension',
    description:
      'Add TradeGuardX to Chrome or Edge in one click from the Web Store. Takes under 30 seconds — no account needed to install.',
    gradient: 'from-accent/15 to-emerald-500/5',
    border: 'border-accent/20 hover:border-accent/35',
    numColor: 'text-accent',
    iconBg: 'bg-accent/10 border-accent/20',
    iconColor: 'text-accent',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3"
        />
      </svg>
    ),
    detail: 'Chrome · Edge · Any Chromium browser',
  },
  {
    number: '02',
    title: 'Pair & configure your rules',
    description:
      'Link the extension to your trading account using a pairing code from the dashboard. Set daily loss limits, risk per trade, hedging rules — individually per account.',
    gradient: 'from-blue-500/15 to-indigo-500/5',
    border: 'border-blue-500/20 hover:border-blue-500/35',
    numColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    detail: '9 rule types · Per-account configuration',
  },
  {
    number: '03',
    title: 'Trade protected, every session',
    description:
      'Open your broker as normal. TradeGuardX monitors every trade in real time — warning you, alerting you, and blocking when your rules are at risk.',
    gradient: 'from-emerald-500/15 to-teal-500/5',
    border: 'border-emerald-500/20 hover:border-emerald-500/35',
    numColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    detail: 'Warn → Alert → Block · Automatic escalation',
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section id="how-it-works" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-surface-900/25 to-transparent" />

      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
            Setup in minutes
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Up and running in 3 steps
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate-400">
            No broker API. No complicated integration. Install, pair, and you&apos;re protected.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, i) => {
            const variant = step.numColor.includes('blue') ? 'gradient-card-cool' : '';
            return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.13, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className={`gradient-card group overflow-hidden p-6 backdrop-blur-sm ${variant}`}
            >
              {/* Subtle corner glow */}
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/[0.03] blur-2xl transition group-hover:bg-white/[0.05]" />

              {/* Step number + icon row */}
              <div className="mb-5 flex items-center justify-between">
                <span className={`font-mono text-3xl font-black ${step.numColor} opacity-25`}>
                  {step.number}
                </span>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border ${step.iconBg} ${step.iconColor}`}
                >
                  {step.icon}
                </div>
              </div>

              <h3 className="font-display text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.description}</p>

              {/* Detail badge */}
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${step.numColor.replace('text-', 'bg-')}`} />
                <span className="text-[11px] font-medium text-slate-500">{step.detail}</span>
              </div>
            </motion.div>
            );
          })}
        </div>

        {/* Connector hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-700"
        >
          <span className="h-px w-8 bg-white/[0.06]" />
          Each step takes under a minute
          <span className="h-px w-8 bg-white/[0.06]" />
        </motion.div>
      </div>
    </section>
  );
}
