import { motion } from 'framer-motion';
import { LandingScreenshotFrame, LandingScreenshotImage } from './LandingScreenshotFrame';

function StepArrow() {
  return (
    <div
      className="hidden shrink-0 items-center justify-center md:flex"
      aria-hidden
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.07] text-accent shadow-[0_0_24px_-4px_rgba(0,212,170,0.35)]">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    </div>
  );
}

export default function ExtensionRulesShowcase() {
  return (
    <section id="extension-setup" className="section-padding relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-blue-500/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-accent/[0.04] blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center sm:mb-16"
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-accent">
            Dashboard & extension
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Pair once, then set your rules
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Link the extension to your TradeGuardX account—your rules and journal stay in sync. No API keys or broker passwords.
          </p>
        </motion.div>

        {/* Pairing */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 sm:mb-24"
        >
          <div className="mb-8 text-center">
            <p className="font-display text-lg font-semibold text-white sm:text-xl">Connect the extension</p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
              Generate a code in the dashboard, confirm in the extension—then you&apos;re linked.
            </p>
          </div>

          <div className="flex flex-col gap-5 md:grid md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-6 lg:gap-10">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 sm:mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-xs font-bold text-accent">
                  1
                </span>
                <span className="text-sm font-medium text-slate-300">Pairing</span>
              </div>
              <LandingScreenshotFrame chromeTitle="tradeguardx.com · Pairing" chromeBadge="Step 1">
                <LandingScreenshotImage src="/pair.png" alt="TradeGuardX pairing screen in the dashboard" />
              </LandingScreenshotFrame>
              <p className="mt-3 text-xs text-slate-500">Show or enter the code to link this browser</p>
            </div>

            <div className="hidden justify-center pt-12 md:flex lg:pt-14" aria-hidden>
              <StepArrow />
            </div>

            <div className="flex justify-center py-1 md:hidden" aria-hidden>
              <div className="flex flex-col items-center text-accent/45">
                <div className="h-5 w-px bg-gradient-to-b from-transparent via-accent/45 to-accent/60" />
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 sm:mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-xs font-bold text-emerald-400">
                  2
                </span>
                <span className="text-sm font-medium text-slate-300">Connected</span>
              </div>
              <LandingScreenshotFrame chromeTitle="tradeguardx.com · Connected" chromeBadge="Step 2">
                <LandingScreenshotImage src="/paired.png" alt="TradeGuardX dashboard showing extension connected" />
              </LandingScreenshotFrame>
              <p className="mt-3 text-xs text-slate-500">Extension paired—sync is on</p>
            </div>
          </div>
        </motion.div>

        {/* Rules */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border-t border-white/[0.06] pt-16 sm:pt-20"
        >
          <div className="mb-8 text-center">
            <p className="font-display text-lg font-semibold text-white sm:text-xl">Configure your rules</p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
              Daily loss, drawdown, hedging, risk per trade, and more—per trading account.
            </p>
          </div>

          <div className="mx-auto max-w-5xl">
            <LandingScreenshotFrame chromeTitle="tradeguardx.com · Rules & protection" chromeBadge="Dashboard">
              <LandingScreenshotImage
                src="/rule.png"
                alt="TradeGuardX rules and protection settings"
                className="max-h-[min(75vh,720px)] object-top object-contain"
              />
            </LandingScreenshotFrame>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">
            The extension enforces these settings live on your trading platform.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
