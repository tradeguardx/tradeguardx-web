import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { staggerContainer, staggerItem } from '../components/dashboard/dashboardMotion';
import { CHROME_STORE_URL } from '../lib/extension';

const STEPS = [
  {
    number: 1,
    title: 'Add TradeGuardX to Chrome',
    description: 'Open the TradeGuardX listing on the Chrome Web Store and click "Add to Chrome".',
    detail: 'Confirm by clicking "Add extension" when Chrome asks. Works with Chrome, Brave, Edge, and other Chromium browsers.',
    gradient: 'from-accent/20 to-emerald-500/10',
    iconColor: 'text-accent',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    number: 2,
    title: 'Pin it to your toolbar',
    description: 'Click the puzzle icon in Chrome and pin TradeGuardX so the popup is one click away.',
    detail: 'Without pinning, the popup hides under the puzzle menu — easy to miss when you need it most.',
    gradient: 'from-purple-500/20 to-pink-500/10',
    iconColor: 'text-purple-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Pair the extension with your account',
    description: 'Open Dashboard → Pairing, generate a code, then paste it into the TradeGuardX popup.',
    detail: 'This links the extension to your trading account so your rules sync across devices.',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    number: 4,
    title: 'Open your broker — rules enforce automatically',
    description: 'Visit your supported broker (Exness, Delta Exchange, The Funded Room). The extension activates instantly.',
    detail: 'Rule violations get blocked at the click — before the trade goes through. No willpower required.',
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconColor: 'text-amber-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const BROWSERS = [
  { name: 'Chrome', abbr: 'Cr', color: 'from-blue-500/30 to-blue-600/10' },
  { name: 'Brave', abbr: 'B', color: 'from-orange-500/30 to-rose-500/10' },
  { name: 'Edge', abbr: 'E', color: 'from-cyan-500/30 to-blue-500/10' },
  { name: 'Opera', abbr: 'O', color: 'from-red-500/30 to-pink-500/10' },
];

const BENEFITS = [
  {
    title: 'Live rule checks',
    body: 'Warnings and blocks happen before bad habits cost you the evaluation.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Prop-firm ready',
    body: 'Daily loss, hedging, and drawdown guardrails aligned with common firm rules.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Pairs with dashboard',
    body: 'Configure rules here; the extension applies them on the platform you trade on.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
];

const CAPABILITIES = [
  'Surface rule status and limits while you trade',
  'Align behavior with the rules you set in Rules Terminal',
  'Reduce accidental breaches during fast markets',
];

export default function InstallExtensionPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full flex-col items-center"
    >
      <div className="w-full max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto">
        {/* Hero — centered */}
        <div className="relative mb-12 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-4 rounded-full bg-accent/[0.07] blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute left-1/2 top-12 h-32 w-64 -translate-x-1/2 rounded-full bg-violet-500/[0.05] blur-3xl" aria-hidden />

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/25 via-emerald-500/15 to-transparent shadow-lg shadow-accent/10 ring-1 ring-accent/20"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center justify-center"
            >
              <svg className="h-11 w-11 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/10 px-4 py-2 text-sm font-medium text-accent"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Browser extension
          </motion.div>

          <h1
            className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: 'var(--dash-text-primary)' }}
          >
            Install TradeGuardX
          </h1>
          <p
            className="mx-auto mt-3 max-w-lg text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--dash-text-muted)' }}
          >
            Add the extension once, pin it, and trade with your rules enforced where it matters—on the platform.
            Most traders finish setup in under two minutes.
          </p>

          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {[
              { label: 'Live on Chrome Web Store', icon: '✓' },
              { label: '~2 min setup', icon: '⏱' },
              { label: 'Free to install', icon: '◆' },
            ].map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)', backgroundColor: 'var(--dash-bg-card)' }}
              >
                <span className="opacity-70" aria-hidden>{pill.icon}</span>
                {pill.label}
              </span>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mb-14 grid gap-3 sm:grid-cols-3"
        >
          {BENEFITS.map((b) => (
            <motion.div
              key={b.title}
              variants={staggerItem}
              whileHover={{ y: -5, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
              className="rounded-2xl border p-4 text-center transition-shadow duration-300 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 sm:text-left"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-emerald-500/10 text-accent shadow-sm sm:mx-0">
                {b.icon}
              </div>
              <h3 className="font-display text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                {b.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
                {b.body}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* What you get */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-12 rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
        >
          <h2
            className="mb-4 text-center font-display text-xs font-bold uppercase tracking-[0.2em] sm:text-left"
            style={{ color: 'var(--dash-text-faint)' }}
          >
            What the extension does
          </h2>
          <ul className="mx-auto max-w-md space-y-3 sm:mx-0">
            {CAPABILITIES.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {line}
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-5 max-w-md border-t pt-4 text-center text-xs leading-relaxed sm:mx-0 sm:text-left" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-faint)' }}>
            Permissions you approve in the browser are only used to run TradeGuardX on supported trading sites.
            We never sell your data.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mb-4 text-center">
          <h2
            className="font-display text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--dash-text-faint)' }}
          >
            Installation steps
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
            Follow in order—the extension and dashboard work together.
          </p>
        </div>

        <div className="relative mb-10">
          <div className="absolute left-[31px] top-6 bottom-6 hidden w-px bg-gradient-to-b from-accent/30 via-[var(--dash-border)] to-transparent sm:block" />

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="group relative rounded-2xl border p-5 transition-colors duration-300 hover:[background-color:var(--dash-bg-card-hover)] hover:[border-color:var(--dash-border-hover)] sm:p-6"
                style={{
                  borderColor: 'var(--dash-border)',
                  backgroundColor: 'var(--dash-bg-card)',
                }}
              >
                <div className="flex gap-4 sm:gap-5">
                  <div
                    className={`relative z-10 flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} border transition-transform duration-300 group-hover:scale-105 ${step.iconColor}`}
                    style={{ borderColor: 'var(--dash-border)' }}
                  >
                    {step.icon}
                  </div>
                  <div className="min-w-0 text-left">
                    <span
                      className="mb-1 inline-block text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--dash-text-faint)' }}
                    >
                      Step {step.number}
                    </span>
                    <h3
                      className="font-display text-base font-semibold sm:text-lg"
                      style={{ color: 'var(--dash-text-primary)' }}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                      {step.description}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--dash-text-faint)' }}>
                      {step.detail}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {/* Browsers */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-10 rounded-2xl border p-5 transition-colors duration-300"
          style={{
            borderColor: 'var(--dash-border)',
            backgroundColor: 'var(--dash-bg-card)',
          }}
        >
          <p
            className="mb-4 text-center text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--dash-text-faint)' }}
          >
            Compatible browsers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {BROWSERS.map((b) => (
              <div key={b.name} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${b.color} text-xs font-bold text-white shadow-sm ring-1 ring-white/10`}
                >
                  {b.abbr}
                </div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--dash-text-muted)' }}>
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.07] via-transparent to-violet-500/[0.05] p-8 text-center"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/15 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10">
              <svg className="h-7 w-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--dash-text-primary)' }}>
              Install it now — it's free
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--dash-text-muted)' }}>
              TradeGuardX is live on the Chrome Web Store. Click below, add to Chrome,
              then come back to pair and configure your rules.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <motion.a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-emerald-400 px-7 py-3.5 text-sm font-bold text-surface-950 shadow-lg shadow-accent/25 transition-all hover:brightness-110"
              >
                Add to Chrome
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </motion.a>
              <Link
                to="/dashboard/pairing"
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                Get a pairing code →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Footer links — centered */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t pt-8 text-center text-sm" style={{ borderColor: 'var(--dash-border)' }}>
          <p style={{ color: 'var(--dash-text-muted)' }}>Questions or something not working?</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/support" className="font-medium text-accent hover:underline">
              Support
            </Link>
            <span style={{ color: 'var(--dash-border)' }} aria-hidden>|</span>
            <Link to="/dashboard/overview" className="font-medium" style={{ color: 'var(--dash-text-secondary)' }}>
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
