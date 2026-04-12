import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LandingScreenshotFrame, LandingScreenshotImage } from './LandingScreenshotFrame';

const features = [
  {
    id: 'replay',
    tab: 'Replay',
    title: 'Replay every trade tick by tick',
    description:
      'Watch the candlestick chart rebuild from entry to exit. See exactly what the market did while you were in the trade.',
    image: '/replay.png',
    alt: 'Trade replay chart with entry and exit markers',
    gradient: 'from-accent/20 to-emerald-500/10',
    border: 'border-accent/25',
    iconColor: 'text-accent',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'result',
    tab: 'Analysis',
    title: 'Discipline score & violation breakdown',
    description:
      '3-pillar discipline score — Risk, Execution, Emotional — plus violation severity and details.',
    image: '/result.png',
    alt: 'Discipline score and violation breakdown',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    border: 'border-blue-500/25',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'narrative',
    tab: 'AI Coach',
    title: 'AI reads your trade like a prop firm coach',
    description:
      'Verdict, mistakes, cost, and what to fix — from your real rules and trade data.',
    image: '/narrative.png',
    alt: 'AI trade coach narrative',
    gradient: 'from-violet-500/20 to-fuchsia-500/10',
    border: 'border-violet-500/25',
    iconColor: 'text-violet-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'story',
    tab: 'Story',
    title: 'Your trade narrated as a story',
    description:
      'Plain-language narrative — listen with the voice reader or read at your own pace.',
    image: '/story.png',
    alt: 'Trade story narrative',
    gradient: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/25',
    iconColor: 'text-amber-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    tab: 'Timeline',
    title: 'Complete event timeline',
    description:
      'Every SL move, TP change, and rule event — timestamped in order.',
    image: '/timeline.png',
    alt: 'Trade event timeline',
    gradient: 'from-cyan-500/20 to-teal-500/10',
    border: 'border-cyan-500/25',
    iconColor: 'text-cyan-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function JournalReplaySection() {
  const [active, setActive] = useState('replay');
  const current = features.find((f) => f.id === active) || features[0];

  return (
    <section id="journaling" className="section-padding relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center sm:mb-12"
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-accent">
            Trade journal & AI coach
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Every trade gets a full breakdown
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Replay what happened, see where discipline broke, and get a clear read on what to fix next.
          </p>
        </motion.div>

        {/* Tabs — pill strip, scroll on small screens */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 flex justify-center sm:mb-10"
        >
          <div className="scrollbar-hide max-w-full overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0a0c10]/80 p-1.5 backdrop-blur-sm">
            <div className="flex min-w-min gap-1 px-0.5">
              {features.map((f) => {
                const isOn = f.id === active;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActive(f.id)}
                    className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      isOn ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {isOn && (
                      <motion.div
                        layoutId="journalTabPill"
                        className="absolute inset-0 rounded-xl bg-accent/15 ring-1 ring-accent/25"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{f.icon}</span>
                    <span className="relative z-10">{f.tab}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-6xl"
          >
            {/* 1) Screenshot first — largest visual impact */}
            <LandingScreenshotFrame
              chromeTitle={`tradeguardx.com · ${current.tab}`}
              chromeBadge="Live"
              className="mb-5 sm:mb-6"
            >
              <LandingScreenshotImage
                src={current.image}
                alt={current.alt}
                className="max-h-[min(78vh,760px)] w-full object-contain object-top"
              />
            </LandingScreenshotFrame>

            {/* 2) Copy + CTA under the image */}
            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${current.gradient} ${current.iconColor}`}
                >
                  {current.icon}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white sm:text-xl">{current.title}</h3>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">{current.description}</p>
                </div>
              </div>
              <Link
                to="/signup"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-[#0a0c10] shadow-lg shadow-accent/20 transition hover:bg-accent/90"
              >
                Try it free
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Quick pick — compact chips */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-10 flex flex-wrap justify-center gap-2 sm:mt-12"
        >
          {features.map((f) => {
            const isActive = f.id === active;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActive(f.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? `${f.border} bg-surface-900/80 text-white ring-1 ring-accent/20`
                    : 'border-white/[0.06] bg-transparent text-slate-500 hover:border-white/[0.12] hover:text-slate-300'
                }`}
              >
                {f.tab}
              </button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
