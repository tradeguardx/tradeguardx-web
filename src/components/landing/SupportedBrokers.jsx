import { motion } from 'framer-motion';

// Live now — actively integrated and enforced in production today.
const liveItems = [
  {
    name: 'Exness',
    kind: 'broker',
    logo: '/brokers/exness.svg',
    type: 'Forex · CFD',
    detail: 'Full rule enforcement on Exness WebTrader',
  },
  {
    name: 'The Funded Room',
    kind: 'funded',
    initials: 'TFR',
    accent: 'from-blue-500/20 to-indigo-500/10 border-blue-500/25',
    accentText: 'text-blue-300',
    type: 'Funded Prop Firm',
    detail: 'Daily loss, drawdown & hedging rules enforced',
  },
];

// Coming soon — integrations in active development, going live next.
const comingSoonItems = [
  {
    name: 'FundedPips',
    kind: 'funded',
    initials: 'FP',
    accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25',
    accentText: 'text-emerald-300',
    type: 'Funded Prop Firm',
    detail: 'Prop firm rules — integration in progress',
  },
  {
    name: 'The Goat Traders',
    kind: 'funded',
    initials: 'GT',
    accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/25',
    accentText: 'text-amber-300',
    type: 'Funded Prop Firm',
    detail: 'Prop firm rules — integration in progress',
  },
  {
    name: 'Bybit',
    kind: 'broker',
    initials: 'BY',
    accent: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/25',
    accentText: 'text-yellow-300',
    type: 'Crypto Derivatives',
    detail: 'Spot + perpetuals — coming soon',
  },
  {
    name: 'Delta Exchange',
    kind: 'broker',
    logo: '/brokers/delta-exchange.svg',
    type: 'Crypto Derivatives',
    detail: 'Crypto derivatives rule engine — coming soon',
  },
];

function ItemCard({ item, status, index }) {
  const isLive = status === 'live';
  const isFunded = item.kind === 'funded';

  // Cool gradient styling for funded firms; default warm for brokers (matches
  // the violet/teal split the page used previously).
  const cardClass = isFunded ? 'gradient-card gradient-card-cool' : 'gradient-card';
  const muted = !isLive ? 'opacity-80' : '';

  const badgeClass = isLive
    ? isFunded
      ? 'border-violet-500/25 bg-violet-500/10 text-violet-400'
      : 'border-accent/20 bg-accent/10 text-accent'
    : 'border-slate-500/25 bg-slate-500/10 text-slate-400';
  const badgeLabel = isLive ? (isFunded ? 'FUNDED' : 'LIVE') : 'SOON';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className={`${cardClass} ${muted} group flex items-center gap-5 p-5 backdrop-blur-sm`}
    >
      {item.logo ? (
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
          <img
            src={item.logo}
            alt={item.name}
            className="h-full w-full object-contain brightness-[0.85] group-hover:brightness-100 transition"
          />
        </div>
      ) : (
        <div
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br ${item.accent}`}
        >
          <span className={`font-display text-lg font-black ${item.accentText}`}>
            {item.initials}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-display text-base font-bold text-white">{item.name}</p>
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{item.type}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{item.detail}</p>
      </div>
    </motion.div>
  );
}

export default function SupportedBrokers() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-surface-900/20 to-transparent" />

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-accent">
            Compatibility
          </span>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Works where you trade
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            TradeGuardX runs directly inside the broker UI — no API keys, no special
            permissions from your broker.
          </p>
        </motion.div>

        {/* Live now */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Live now</p>
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {liveItems.map((item, i) => (
              <ItemCard key={item.name} item={item} status="live" index={i} />
            ))}
          </div>
        </motion.div>

        {/* Coming soon */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Coming soon
            </p>
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {comingSoonItems.map((item, i) => (
              <ItemCard key={item.name} item={item} status="soon" index={i} />
            ))}
          </div>
        </motion.div>

        {/* Universal note */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="gradient-card px-6 py-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">
                More brokers & funded programs coming
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                TradeGuardX is designed to work with any browser-based trading platform.
                If you trade on a platform not listed, reach out — we expand based on
                trader demand.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Trader type pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          {['Prop Firm Traders', 'Forex Traders', 'Crypto Traders', 'Futures Traders'].map(
            (style, i) => (
              <motion.div
                key={style}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                {style}
              </motion.div>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}
