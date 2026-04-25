import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const features = [
  {
    label: 'Blocks trades in real time',
    tgx: { value: true, note: 'Warn → alert → hard block' },
    broker: { value: 'partial', note: 'Margin / basic limits only' },
    journal: { value: false, note: 'Records after the fact' },
    manual: { value: false, note: 'Fails under pressure' },
  },
  {
    label: 'AI behavior pattern analysis',
    tgx: { value: true, note: 'Identifies repeat mistakes' },
    broker: { value: false, note: 'No analytics' },
    journal: { value: 'partial', note: 'Aggregate stats only' },
    manual: { value: false, note: 'Blind spots persist' },
  },
  {
    label: 'Works on any broker',
    tgx: { value: true, note: 'Universal — reads the UI' },
    broker: { value: false, note: 'Tied to one platform' },
    journal: { value: true, note: 'Post-trade import' },
    manual: { value: true, note: "You're on your own" },
  },
  {
    label: 'No API key or integration',
    tgx: { value: true, note: 'Zero broker setup' },
    broker: { value: 'na', note: 'Built into platform' },
    journal: { value: 'partial', note: 'Some require API' },
    manual: { value: true, note: 'Nothing to connect' },
  },
  {
    label: 'Prop firm rule enforcement',
    tgx: { value: true, note: 'Daily loss, drawdown, hedging…' },
    broker: { value: 'partial', note: 'Margin protection only' },
    journal: { value: false, note: 'Review only, no blocking' },
    manual: { value: false, note: 'Too many rules to track' },
  },
  {
    label: 'Prevents emotional trading',
    tgx: { value: true, note: 'Hard blocks in moments of tilt' },
    broker: { value: false, note: "Doesn't know your intent" },
    journal: { value: false, note: "Analyses it, can't stop it" },
    manual: { value: false, note: "That's the whole problem" },
  },
  {
    label: 'Trade journal with AI insights',
    tgx: { value: true, note: 'Built in — same platform' },
    broker: { value: false, note: 'No journaling' },
    journal: { value: true, note: 'Core feature' },
    manual: { value: false, note: 'You write it yourself' },
  },
];

const cols = [
  {
    key: 'tgx',
    label: 'TradeGuardX',
    highlight: true,
    tagline: 'You are here',
    iconBg: 'bg-accent/15 border-accent/40',
    iconColor: 'text-accent',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    key: 'broker',
    label: 'Broker tools',
    highlight: false,
    tagline: 'Margin alerts',
    iconBg: 'bg-white/[0.04] border-white/[0.10]',
    iconColor: 'text-slate-400',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    key: 'journal',
    label: 'Trade journals',
    highlight: false,
    tagline: 'After-the-fact',
    iconBg: 'bg-white/[0.04] border-white/[0.10]',
    iconColor: 'text-slate-400',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    key: 'manual',
    label: 'Mental rules',
    highlight: false,
    tagline: 'Self-discipline',
    iconBg: 'bg-white/[0.04] border-white/[0.10]',
    iconColor: 'text-slate-400',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
];

function Cell({ cell, highlight }) {
  // TGX (highlight) cells get a glowing accent treatment so the "winning"
  // column reads as the answer at a glance. Other columns are dimmer.
  if (cell.value === true) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full border ${
            highlight
              ? 'border-accent/50 bg-accent/20 shadow-[0_0_18px_-4px_rgba(0,212,170,0.6)]'
              : 'border-emerald-500/25 bg-emerald-500/10'
          }`}
        >
          <svg
            className={`h-4 w-4 ${highlight ? 'text-accent' : 'text-emerald-300'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className={`hidden max-w-[110px] text-[10px] leading-snug sm:block ${highlight ? 'text-slate-300' : 'text-slate-500'}`}>
          {cell.note}
        </span>
      </div>
    );
  }
  if (cell.value === false) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.025]">
          <svg className="h-3.5 w-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <span className="hidden max-w-[110px] text-[10px] leading-snug text-slate-600 sm:block">
          {cell.note}
        </span>
      </div>
    );
  }
  if (cell.value === 'partial') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span className="hidden max-w-[110px] text-[10px] leading-snug text-slate-500 sm:block">
          {cell.note}
        </span>
      </div>
    );
  }
  // 'na'
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.04]">
        <span className="text-base text-slate-700">—</span>
      </span>
      <span className="hidden max-w-[110px] text-[10px] leading-snug text-slate-700 sm:block">
        {cell.note}
      </span>
    </div>
  );
}

export default function CompetitorComparisonSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });

  return (
    <section className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent" />

      <div ref={ref} className="relative mx-auto max-w-5xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
            Why TradeGuardX
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Other tools track.
            <br />
            <span className="gradient-text-accent">TradeGuardX enforces.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Every other approach is reactive — they tell you what went wrong after the damage is done.
            TradeGuardX intervenes before the mistake happens.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="gradient-card relative overflow-hidden"
        >
          {/* Vertical spotlight running through the TGX column. Strong at the
              top, fades out at the bottom — gives the "winning" column an
              instant visual identity without breaking the grid alignment. */}
          <div
            className="pointer-events-none absolute inset-y-0 hidden lg:block"
            style={{
              left: '20%',
              width: '20%',
              background:
                'linear-gradient(180deg, rgba(0, 212, 170, 0.16) 0%, rgba(0, 212, 170, 0.06) 50%, rgba(0, 212, 170, 0.02) 100%)',
              borderLeft: '1px solid rgba(0, 212, 170, 0.18)',
              borderRight: '1px solid rgba(0, 212, 170, 0.18)',
            }}
            aria-hidden
          />

          {/* Column headers */}
          <div className="relative grid grid-cols-5 border-b border-white/[0.08]">
            <div className="px-4 py-6" />
            {cols.map((col) => (
              <div
                key={col.key}
                className="flex flex-col items-center justify-end gap-2 px-3 pb-5 pt-6 text-center"
              >
                {/* "You are here" pill — only on the highlighted column,
                     placed inline (no negative positioning that would clip). */}
                {col.highlight ? (
                  <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-accent">
                    {col.tagline}
                  </span>
                ) : (
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                    {col.tagline}
                  </span>
                )}
                {/* Icon */}
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${col.iconBg} ${col.iconColor}`}
                >
                  {col.icon}
                </span>
                {/* Label */}
                <span
                  className={`font-display text-sm font-bold ${
                    col.highlight ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {col.label}
                </span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {features.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="relative grid grid-cols-5 border-b border-white/[0.05] last:border-0 transition hover:bg-white/[0.015]"
            >
              {/* Feature label */}
              <div className="flex items-center px-5 py-6">
                <span className="text-sm font-semibold leading-snug text-slate-200">
                  {feature.label}
                </span>
              </div>

              {/* Cells */}
              {cols.map((col) => (
                <div
                  key={col.key}
                  className="flex items-start justify-center px-3 py-6"
                >
                  <Cell cell={feature[col.key]} highlight={col.highlight} />
                </div>
              ))}
            </motion.div>
          ))}
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[11px] text-slate-600"
        >
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-accent/25 bg-accent/10">
              <svg className="h-2.5 w-2.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            Fully supported
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
            </span>
            Partial / limited
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/[0.06] bg-slate-800">
              <svg className="h-2.5 w-2.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            Not available
          </span>
        </motion.div>

        {/* Key differentiator callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="mt-10 rounded-2xl border border-accent/15 bg-accent/5 px-6 py-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
              <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white">
                The key difference: preventive, not reactive
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Trade journals, alerts, and mental rules all tell you what went wrong after the fact.
                TradeGuardX is the only tool that runs inside the browser and stops the trade
                before it executes — no matter how you feel in the moment.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
