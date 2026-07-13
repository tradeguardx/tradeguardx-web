import { motion } from 'framer-motion';

const STAGES = [
  {
    time: '09:15',
    stage: 'Stage 1 · Soft alert',
    accent: 'amber',
    title: 'You forgot the stop loss.',
    body: "Market's moving. You hit BUY on BTCUSD with no stop. Two minutes later your phone buzzes — TradeGuardX caught it.",
    youDid: <>Entered <b>BTCUSD long</b> · no SL</>,
    weDid: <>Alert sent on <b>all your channels</b></>,
    panel: {
      head: '● BTCUSD · LONG · 10×',
      headTime: '09:13 IST',
      rows: [
        { lbl: 'Entry', val: '77,540' },
        { lbl: 'Size', val: '+0.05 BTC' },
        { lbl: '⚠ Stop loss', val: 'NOT SET', warn: true },
      ],
    },
  },
  {
    time: '11:42',
    stage: 'Stage 2 · Trade rejected',
    accent: 'amber',
    title: 'You sized up to win it back.',
    body: 'Two reds deep, you fired a 3× bigger entry to recover fast. It never reached the order book — your risk-per-trade cap stopped it cold.',
    youDid: <>Risk/trade <b>2.8%</b> (cap 1.0%)</>,
    weDid: <>Order <b>cancelled before fill</b></>,
    panel: {
      head: '● BTCUSD · LONG · 30×',
      headTime: '11:42 IST',
      rows: [
        { lbl: 'Risk / trade', val: '2.8%', warn: true },
        { lbl: 'Your cap', val: '1.0%' },
        { lbl: 'Order', val: 'REJECTED', danger: true },
      ],
    },
  },
  {
    time: '14:23',
    stage: 'Stage 3 · Auto-close',
    accent: 'rose',
    title: 'You hit your daily loss cap.',
    body: 'The third red took you to -₹5,000 — the exact line you set this morning. We closed the open position and pulled your working orders, at market.',
    youDid: <>Daily loss <b>-₹5,000 / -₹5,000</b></>,
    weDid: <>Closed 1 position · <b>cancelled 2 orders</b></>,
    panel: {
      head: '● Account · enforcement',
      headTime: '14:23 IST',
      rows: [
        { lbl: 'Daily loss', val: '-₹5,000', danger: true },
        { lbl: 'Open positions', val: 'CLOSED' },
        { lbl: 'Working orders', val: 'CANCELLED' },
      ],
    },
  },
  {
    time: '14:23',
    stage: 'Stage 4 · Locked',
    accent: 'rose',
    title: 'Locked out. Day over.',
    body: 'Positions closed, account locked. You tried to re-enter five minutes later — the trade was closed on sight. No override. No tilt.',
    youDid: <>Tried to <b>re-enter</b></>,
    weDid: <>Locked · <b>cooldown 2h</b></>,
    panel: {
      head: '● Cooldown · locked',
      headTime: '14:28 IST',
      rows: [
        { lbl: 'New trades', val: 'BLOCKED' },
        { lbl: 'New trades', val: 'BLOCKED', danger: true },
        { lbl: '🔒 Cooldown', val: '2h left' },
      ],
    },
  },
];

const dotColor = { amber: 'bg-amber-400', rose: 'bg-rose-500' };
const stageColor = { amber: 'text-amber-400', rose: 'text-rose-400' };
const borderColor = { amber: 'border-l-amber-400/70', rose: 'border-l-rose-500/70' };

function Panel({ panel }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-white/[0.07] bg-surface-950/70 p-5 font-mono"
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3 text-[12px]">
        <span className="flex items-center gap-2 text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {panel.head.replace('● ', '')}
        </span>
        <span className="text-slate-600">{panel.headTime}</span>
      </div>
      <div className="space-y-3">
        {panel.rows.map((r) => (
          <div key={r.lbl} className="flex items-center justify-between text-[12px]">
            <span className="uppercase tracking-wider text-slate-500">{r.lbl}</span>
            <span className={r.danger ? 'font-medium text-rose-400' : r.warn ? 'font-medium text-amber-400' : 'text-slate-200'}>
              {r.val}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function DayInLife() {
  return (
    <section className="section-gap relative border-t border-white/[0.05] bg-gradient-to-b from-transparent to-surface-900/30">
      <div className="section-padding mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="eyebrow mb-4">A day in the life</span>
          <h2 className="display-lg mt-4">This is what protection actually looks like.</h2>
          <p className="body-lg mx-auto mt-5 max-w-xl">
            Four moments every trader knows. Four times TradeGuardX has your back — automatically,
            in real time, before damage compounds.
          </p>
        </motion.div>

        <div className="mt-14 space-y-5">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.stage}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`overflow-hidden rounded-2xl border border-white/[0.06] border-l-[3px] ${borderColor[s.accent]} bg-surface-900/50 p-6 md:p-8`}
            >
              <div className="grid items-start gap-6 lg:grid-cols-[auto_1.1fr_0.9fr] lg:gap-10">
                {/* timestamp */}
                <div className="flex flex-row items-baseline gap-2 lg:flex-col lg:items-start lg:gap-0">
                  <span className="font-mono text-4xl font-medium tracking-tight text-slate-300">{s.time}</span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-slate-600">IST</span>
                </div>

                {/* content */}
                <div>
                  <div className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest ${stageColor[s.accent]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dotColor[s.accent]}`} />
                    {s.stage}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">{s.title}</h3>
                  <p className="mt-2.5 max-w-md text-sm leading-relaxed text-slate-400">{s.body}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.06] bg-surface-950/50 p-3.5">
                      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">You did</div>
                      <div className="text-[13px] text-slate-300 [&_b]:font-medium [&_b]:text-slate-100">{s.youDid}</div>
                    </div>
                    <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-3.5">
                      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-accent">We did</div>
                      <div className="text-[13px] text-slate-200 [&_b]:font-medium [&_b]:text-white">{s.weDid}</div>
                    </div>
                  </div>
                </div>

                {/* trade panel */}
                <Panel panel={s.panel} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
