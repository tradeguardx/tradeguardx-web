import { motion } from 'framer-motion';

const CHANNELS = [
  { k: 'wa', label: 'WhatsApp', bg: 'bg-[#25D366]' },
  { k: 'tg', label: 'Telegram', bg: 'bg-[#229ED9]' },
  { k: 'em', label: 'Email', bg: 'bg-slate-500' },
];

export default function MobileAlertsSection() {
  return (
    <section className="section-gap relative overflow-hidden border-t border-white/[0.05]">
      <div className="section-padding mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* left: copy */}
        <div>
          <span className="eyebrow mb-4">Screen off. Still covered.</span>
          <h2 className="display-lg mt-4">
            We watch the trade,
            <br />
            <span className="gradient-text-accent">even when you don&apos;t.</span>
          </h2>
          <p className="body-lg mt-5 max-w-md">
            Enforcement runs <strong className="font-medium text-slate-200">server-side over Delta&apos;s API</strong> —
            not a browser tab. Trade from the Delta app, web, or anything else; if a fill breaks a rule, we act in
            ~120ms and ping you everywhere.
          </p>

          <div className="mt-7 inline-flex items-center gap-4 rounded-xl border border-white/[0.1] bg-surface-900/60 px-5 py-3.5">
            <span className="font-mono text-2xl font-medium tracking-tight text-accent">~120ms</span>
            <span className="font-mono text-[12px] uppercase leading-tight tracking-wider text-slate-500">
              fill → <b className="font-medium text-slate-300">decision</b>
              <br />detection latency
            </span>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <span
                key={c.k}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-surface-900/60 px-3 py-2 text-[13px] text-slate-300"
              >
                <span className={`grid h-[18px] w-[18px] place-items-center rounded text-white ${c.bg}`}>
                  <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                </span>
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* right: phone */}
        <div className="relative flex h-[560px] items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex-shrink-0"
          >
            <motion.div
              animate={{ rotate: -3, y: [0, -10, 0] }}
              transition={{ rotate: { duration: 0 }, y: { repeat: Infinity, duration: 6, ease: 'easeInOut' } }}
              className="relative h-[540px] w-[280px] rounded-[38px] border-[8px] border-[#1A1F2E] bg-gradient-to-b from-[#0A0D17] to-surface-950 p-[18px_14px] shadow-2xl shadow-black/70"
            >
            <div className="absolute left-1/2 top-3.5 h-[18px] w-20 -translate-x-1/2 rounded-[10px] border border-[#1A1F2E] bg-surface-950" />
            <div className="flex h-full flex-col gap-2.5 overflow-hidden rounded-3xl bg-surface-900 px-3.5 pb-3.5 pt-9">
              {/* app bar */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 font-mono text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold text-slate-100">
                  <span className="h-3.5 w-3.5 rounded bg-gradient-to-br from-[#F49C2C] to-[#E07B0A]" />
                  Delta
                </span>
                <span className="text-slate-500">₹48,210</span>
              </div>
              {/* pair */}
              <div className="flex items-center justify-between py-1.5">
                <div className="font-mono text-[13px] font-medium">
                  BTCUSD <span className="ml-1 text-[11px] text-slate-500">25×</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[15px] font-medium text-accent">64,180</div>
                  <div className="font-mono text-[10px] text-accent">+0.4%</div>
                </div>
              </div>
              {/* mini chart */}
              <div className="h-20 overflow-hidden rounded-lg bg-surface-950 p-2">
                <svg viewBox="0 0 200 60" className="h-full w-full" preserveAspectRatio="none">
                  <polyline
                    points="0,40 20,38 40,42 60,30 80,34 100,22 120,28 140,18 160,24 180,12 200,16"
                    fill="none" stroke="#2DEAA8" strokeWidth="2" opacity="0.7"
                  />
                </svg>
              </div>
              {/* position card */}
              <div className="mt-auto rounded-lg border border-white/[0.06] bg-surface-950 p-2.5">
                <div className="mb-1 flex justify-between font-mono text-[10px]">
                  <span className="uppercase tracking-wider text-slate-500">Position</span>
                  <span className="text-rose-400">-₹1,840</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] text-slate-400">
                  <span>Long 0.5 BTC</span>
                  <span>3rd today</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-md bg-accent/15 py-2 text-center font-mono text-[11px] font-semibold text-accent">Buy</div>
                <div className="rounded-md bg-rose-500/12 py-2 text-center font-mono text-[11px] font-semibold text-rose-400">Sell</div>
              </div>
            </div>

            {/* blocked overlay */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="absolute inset-x-3.5 top-1/2 -translate-y-1/2 rounded-xl border border-rose-500/40 bg-gradient-to-b from-rose-500/95 to-rose-600/90 p-3.5 text-white shadow-2xl shadow-rose-500/30 backdrop-blur"
            >
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" /></svg>
                Trade blocked
              </div>
              <div className="text-[13px] font-medium leading-snug">Daily loss limit hit. Positions closed, account locked.</div>
              <div className="mt-1.5 font-mono text-[11px] opacity-85">Cooldown · 2h remaining</div>
            </motion.div>
            </motion.div>
          </motion.div>

          {/* floating alert card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="absolute right-0 top-10 hidden w-56 items-start gap-3 rounded-2xl border border-white/[0.1] bg-surface-900 p-3.5 shadow-2xl shadow-black/50 lg:flex"
          >
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[#229ED9] text-white">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            </span>
            <div className="text-[12px] leading-snug">
              <div className="font-semibold text-slate-100">TradeGuardX</div>
              <div className="mt-0.5 text-slate-400">Kill switch fired — daily loss ₹2,000. You&apos;re in cooldown for 3h.</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
