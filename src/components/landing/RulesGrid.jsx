import { motion } from 'framer-motion';

const LossBar = () => (
  <div className="w-full">
    <div className="mb-2 flex justify-between font-mono text-[11px]">
      <span className="text-rose-400">-₹3,240</span>
      <span className="text-slate-500">₹5,000 cap</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-800">
      <div className="h-full rounded-full bg-gradient-to-r from-accent to-rose-500" style={{ width: '65%' }} />
    </div>
  </div>
);

const Dots = () => (
  <div className="flex gap-2">
    {['on', 'on', 'on', 'on', 'warn', 'off'].map((s, i) => (
      <span
        key={i}
        className={`h-[18px] w-[18px] rounded-full border ${
          s === 'on' ? 'border-accent bg-accent' : s === 'warn' ? 'border-amber-400 bg-amber-400' : 'border-white/15 bg-surface-800'
        }`}
      />
    ))}
  </div>
);

const RiskBar = () => (
  <div className="w-full">
    <div className="mb-2 flex justify-between font-mono text-[11px]">
      <span className="text-slate-300">0.8%</span>
      <span className="text-slate-500">1.0% max</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-800">
      <div className="h-full rounded-full bg-accent" style={{ width: '80%' }} />
    </div>
  </div>
);

const LevBars = () => (
  <div className="flex items-end gap-1.5" style={{ height: 50 }}>
    {[
      { h: 16, c: 'bg-emerald-500/40' },
      { h: 22, c: 'bg-emerald-500/40' },
      { h: 28, c: 'bg-emerald-500/40' },
      { h: 34, c: 'bg-amber-400/50' },
      { h: 40, c: 'bg-amber-400/50' },
      { h: 50, c: 'bg-rose-500/60' },
    ].map((b, i) => (
      <span key={i} className={`w-3.5 rounded-t ${b.c}`} style={{ height: b.h }} />
    ))}
  </div>
);

const CooldownText = () => (
  <div className="font-mono text-[12px] leading-relaxed">
    <div className="text-slate-400">After <b className="font-medium text-rose-400">3 reds</b> in a row →</div>
    <div className="text-accent">2-hour cooldown</div>
  </div>
);

const LiqText = () => (
  <div className="font-mono text-[12px] leading-relaxed">
    <div className="text-slate-400">Liquidation @ <b className="font-medium text-slate-200">76,400</b></div>
    <div className="text-amber-400">Distance: 1.4%</div>
    <div className="text-accent">↳ Auto-close at 2%</div>
  </div>
);

const RULES = [
  { preview: <LossBar />, title: 'Daily loss cap', body: 'Bleeding past your daily limit in one session — the fastest way to blow up an account.' },
  { preview: <Dots />, title: 'Max trades per session', body: 'Overtrading after a losing morning. Cap your entries and the system stops accepting new ones.' },
  { preview: <RiskBar />, title: 'Risk per trade', body: 'Oversized impulsive entries. A single huge position risking more of the account than your plan allows.' },
  { preview: <LevBars />, title: 'Leverage cap', body: 'The 50× revenge entry after a loss. Hard cap on leverage per symbol, enforced before the order goes through.' },
  { preview: <CooldownText />, title: 'Cooldown after losses', body: "The emotional spiral. Hit your loss streak threshold and the system locks new entries until you've cooled off." },
  { preview: <LiqText />, title: 'Liquidation distance alert', body: 'The slow walk to zero. We close positions before they reach your liquidation buffer — no more "I\'ll add margin in a sec".' },
];

export default function RulesGrid() {
  return (
    <section className="section-gap relative border-t border-white/[0.05]">
      <div className="section-padding mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow mb-4">Configure your protection</span>
          <h2 className="display-lg mt-4">The rails that match your plan.</h2>
          <p className="body-lg mx-auto mt-5 max-w-xl">
            Pick the rules that match how you actually want to trade. TradeGuardX enforces every one of
            them server-side, in real time, on every entry.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RULES.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="group rounded-2xl border border-white/[0.06] bg-surface-900/60 p-7 transition hover:-translate-y-0.5 hover:border-white/[0.12]"
            >
              <div className="flex h-20 items-center border-b border-white/[0.06] pb-5">{r.preview}</div>
              <h4 className="mt-6 text-[17px] font-semibold tracking-tight text-slate-100">{r.title}</h4>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-600">Saves you from</div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{r.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
