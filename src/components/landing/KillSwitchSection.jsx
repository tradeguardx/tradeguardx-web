import { motion } from 'framer-motion';

const BellIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const XIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M15 9l-6 6M9 9l6 6" />
  </svg>
);
const LockIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="5" y="11" width="14" height="9" rx="2" strokeWidth={1.8} /><path strokeWidth={1.8} d="M8 11V8a4 4 0 118 0v3" />
  </svg>
);

const Channels = () => (
  <div className="flex items-center justify-between">
    <span className="text-amber-400"><BellIcon /></span>
    <div className="flex gap-1.5">
      {[{ l: 'W', c: '#25D366' }, { l: 'T', c: '#229ED9' }, { l: 'E', c: '#475569' }].map((ch) => (
        <span key={ch.l} className="grid h-6 w-6 place-items-center rounded text-[10px] font-bold text-white" style={{ background: ch.c }}>
          {ch.l}
        </span>
      ))}
    </div>
  </div>
);

const ClosedStamp = () => (
  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
    <span>BTCUSD · LONG</span>
    <span className="rounded border border-amber-400/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400" style={{ transform: 'rotate(-6deg)' }}>
      Closed
    </span>
    <span className="ml-auto text-accent">+0.05 BTC</span>
  </div>
);

const FundsLocked = () => (
  <div className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-wider text-rose-400">
    <LockIcon />
    Account locked
  </div>
);

const MODES = [
  {
    level: 'Level 01 · Soft', name: 'Alert', accent: 'amber', icon: <BellIcon />,
    trigger: <>Triggers when you&apos;re <b>approaching a limit</b></>,
    body: <>We ping you instantly on <b>WhatsApp, Telegram, and email</b>. No spam — only when you&apos;re about to cross a line. You decide whether to slow down.</>,
    footer: <Channels />,
  },
  {
    level: 'Level 02 · Hard', name: 'Auto-close', accent: 'amber', icon: <XIcon />,
    trigger: <>Triggers when you <b>cross a hard limit</b></>,
    body: <>We <b>cancel pending orders</b> and <b>close open positions</b> at market. The damage stops at the line you set — not five trades past it.</>,
    footer: <ClosedStamp />,
  },
  {
    level: 'Level 03 · Full kill', name: 'Lock', accent: 'rose', icon: <LockIcon />,
    trigger: <>Triggers when <b>daily cap or cooldown</b> engages</>,
    body: <>We <b>close every position</b> and lock the account. No new trades, no overrides, no exceptions — anything you open is closed on sight until the period ends or you sleep on it.</>,
    footer: <FundsLocked />,
  },
];

const iconWrap = { amber: 'bg-amber-400/10 text-amber-400', rose: 'bg-rose-500/10 text-rose-400' };
const levelColor = { amber: 'text-amber-400', rose: 'text-rose-400' };
const borderColor = { amber: 'bg-amber-400/70', rose: 'bg-rose-500/80' };

// reference timings — .reveal (0.8s) and .stagger child (0.6s), cubic-bezier(0.16,1,0.3,1)
const EASE = [0.16, 1, 0.3, 1];

export default function KillSwitchSection() {
  return (
    <section className="section-gap relative border-t border-white/[0.05]">
      <div className="section-padding mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow mb-4">The core mechanism</span>
          <h2 className="display-lg mt-4">
            The Kill Switch.
            <br />
            <span className="bg-gradient-to-b from-rose-400 to-rose-500 bg-clip-text text-transparent">
              Three modes. One unbreakable rail.
            </span>
          </h2>
          <p className="body-lg mx-auto mt-5 max-w-xl">
            The kill switch isn&apos;t one button — it&apos;s a graduated response that knows when to warn,
            when to close, and when to lock. All <span className="text-slate-200">server-side</span>, so you
            can&apos;t override it on tilt.
          </p>
        </motion.div>

        {/* .stagger — cards fade up 16px, 0.6s, 80ms apart */}
        <motion.div
          className="mt-14 grid items-stretch gap-5 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {MODES.map((m, i) => (
            <div key={m.name} className="relative flex">
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
                }}
                whileHover={{ y: -4 }}
                className={`relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-900/60 p-7`}
              >
                <span className={`absolute inset-x-0 top-0 h-[2px] ${borderColor[m.accent]}`} />
                <div className={`font-mono text-[11px] uppercase tracking-widest ${levelColor[m.accent]}`}>{m.level}</div>
                <div className={`mt-5 grid h-12 w-12 place-items-center rounded-xl ${iconWrap[m.accent]}`}>{m.icon}</div>
                <h4 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-100">{m.name}</h4>
                <p className="mt-2 font-mono text-[12px] text-slate-500 [&_b]:font-medium [&_b]:text-slate-300">{m.trigger}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-400 [&_b]:font-medium [&_b]:text-slate-200">{m.body}</p>
                <div className="mt-auto pt-6">
                  <div className="rounded-xl border border-white/[0.06] bg-surface-950/60 p-3.5">{m.footer}</div>
                </div>
              </motion.div>

              {i < MODES.length - 1 && (
                <span className="absolute -right-[18px] top-1/2 z-10 hidden -translate-y-1/2 text-rose-400/60 md:block">→</span>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
