import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const propFirms = [
  {
    name: 'The Funded Room',
    initials: 'TFR',
    status: 'live',
    accent: 'from-blue-500/20 to-indigo-500/10 border-blue-500/25',
    accentText: 'text-blue-300',
  },
  {
    name: 'FundedPips',
    initials: 'FP',
    status: 'soon',
    accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25',
    accentText: 'text-emerald-300',
  },
  {
    name: 'The Goat Traders',
    initials: 'GT',
    status: 'soon',
    accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/25',
    accentText: 'text-amber-300',
  },
];

export default function PropFirmBeat() {
  return (
    <section className="relative py-20 md:py-24">
      <div className="relative mx-auto max-w-5xl px-6">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-5 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            For prop firm traders
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center font-display text-3xl font-bold text-white md:text-4xl lg:text-5xl"
        >
          One bad day shouldn&apos;t end your funded account.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.06 }}
          className="mx-auto mt-5 max-w-2xl text-center text-base text-slate-400 md:text-lg"
        >
          TradeGuardX enforces your prop firm&apos;s rules in real time — daily loss,
          drawdown, hedging, lot size. We block the violation before it triggers a reset.
        </motion.p>

        {/* Prop firm logos row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12 }}
          className="mt-10 grid gap-3 sm:grid-cols-3"
        >
          {propFirms.map((firm, i) => (
            <motion.div
              key={firm.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className={`gradient-card gradient-card-cool flex items-center gap-3 p-4 ${
                firm.status === 'soon' ? 'opacity-80' : ''
              }`}
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br ${firm.accent}`}
              >
                <span className={`font-display text-sm font-black ${firm.accentText}`}>
                  {firm.initials}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold text-white">{firm.name}</p>
                  {firm.status === 'live' ? (
                    <span className="rounded-md border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                      LIVE
                    </span>
                  ) : (
                    <span className="rounded-md border border-slate-500/25 bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                      SOON
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  Funded Prop Firm
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Math callout — the reset-vs-Pro hook, surfaced from CostComparisonSection
            so prop traders see the value math right after the hero. */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.22 }}
          className="mt-10 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] via-transparent to-emerald-500/[0.04] p-7 sm:p-8"
        >
          <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                Failed 50K eval
              </p>
              <p className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">
                ~$300
              </p>
              <p className="mt-1 text-xs text-slate-500">Reset fee</p>
            </div>
            <div className="hidden text-2xl font-medium uppercase tracking-widest text-slate-600 sm:block">
              vs
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">
                1 month
              </p>
              <p className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">
                $25
              </p>
              <p className="mt-1 text-xs text-slate-500">TradeGuardX Pro</p>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-md text-center text-sm text-slate-400">
            $25 a month to prevent the $300 mistake. One blocked tilt-trade and the
            subscription has already paid for itself many times over.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-[#0a0c10] shadow-lg shadow-accent/25 transition hover:bg-accent/90 active:scale-95"
            >
              Protect your prop account — start free
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
