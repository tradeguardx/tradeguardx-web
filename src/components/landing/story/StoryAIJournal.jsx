import { motion } from 'framer-motion';
import { StorySection } from './StorySection';

/**
 * Post-mistake / AI journal section.
 *
 * Pivots the narrative after the hero: the hero showed "we block rule
 * violations." This section shows what happens *after* — the journal entry,
 * the AI commentary, and the behavior pattern that emerges across days.
 *
 * Two-column layout:
 *   LEFT  — a sample journal entry card (date, trade meta, rule outcome,
 *           AI insight paragraph)
 *   RIGHT — a behavior-pattern card (small bar chart by hour of day plus
 *           a "most common pattern" callout)
 *
 * Static (no cycling animation) — calm, post-mortem feel that contrasts
 * with the kinetic hero shield.
 */

const HOURLY_VIOLATIONS = [
  { hour: '09', n: 1 },
  { hour: '10', n: 4 }, // NY open spike
  { hour: '11', n: 3 },
  { hour: '12', n: 1 },
  { hour: '13', n: 0 },
  { hour: '14', n: 2 },
  { hour: '15', n: 5 }, // afternoon revenge
  { hour: '16', n: 3 },
  { hour: '17', n: 1 },
];

const MAX_N = Math.max(...HOURLY_VIOLATIONS.map((b) => b.n));

export default function StoryAIJournal() {
  return (
    <StorySection id="ai-journal" className="relative scroll-mt-24">
      <div className="section-shell">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-3xl"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-300">
            AI Journal
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            We catch the pattern.
            <br />
            <span className="gradient-text-accent">Not just the trade.</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg text-slate-400">
            Every blocked trade becomes a data point. The journal turns weeks
            of trading into a behavior map — so you can fix the habit, not just
            the next trade.
          </p>
        </motion.div>

        {/* Two-column content */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* === LEFT — Journal entry === */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="gradient-card p-6 md:p-7"
          >
            {/* Entry header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Journal entry
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">Tue · Mar 12 · 14:23</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-rose-300">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Blocked
              </span>
            </div>

            {/* Trade meta */}
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Symbol</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white">BTCUSD</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Side</p>
                <p className="mt-1 font-mono text-sm font-semibold text-emerald-300">BUY</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Size</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white">0.05 lots</p>
              </div>
            </div>

            {/* Rule violation */}
            <div className="mt-5 rounded-xl border border-rose-500/25 bg-rose-500/[0.05] px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300">
                  Rule violated
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-rose-300">
                  stop-loss-required
                </p>
              </div>
              <p className="mt-1.5 text-sm text-slate-200">
                Stop loss missing — entry attempted without protective level.
              </p>
            </div>

            {/* AI insight */}
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/[0.10] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-violet-300">
                  <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L9.91 8.26 3.27 9.27l4.91 4.78-1.16 6.78L12 17.77l5.98 3.06-1.16-6.78 4.91-4.78-6.64-1.01z" />
                  </svg>
                  AI insight
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                You&apos;ve attempted entries without a stop loss{' '}
                <span className="font-semibold text-violet-300">4 times this week</span> — each
                during the first 60 minutes after a loss. Pattern:{' '}
                <span className="text-white">chasing momentum after drawdown → impulse entries with no risk plan.</span>
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Suggested rule:{' '}
                <span className="text-slate-300">cool-down for 30 min after a losing close</span>{' '}
                — already used by traders with similar patterns.
              </p>
            </div>
          </motion.div>

          {/* === RIGHT — Behavior pattern === */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="gradient-card gradient-card-cool flex flex-col p-6 md:p-7"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Behavior pattern
                </p>
                <p className="mt-1 font-display text-lg font-bold text-white">
                  Rule violations by hour
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7m0 0l-7 7m7-7v18" />
                </svg>
                ↓ 38% w/w
              </span>
            </div>

            {/* Bar chart */}
            <div className="mt-6 grid grid-cols-9 items-end gap-2" style={{ height: 140 }}>
              {HOURLY_VIOLATIONS.map((b) => {
                const isPeak = b.n === MAX_N;
                const h = b.n === 0 ? 4 : (b.n / MAX_N) * 120;
                return (
                  <div key={b.hour} className="flex flex-col items-center gap-1.5">
                    <div className="flex w-full flex-col-reverse items-stretch">
                      <motion.span
                        initial={{ height: 0 }}
                        whileInView={{ height: h }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="rounded-md"
                        style={{
                          background: isPeak
                            ? 'linear-gradient(180deg, rgba(244, 63, 94, 0.85), rgba(244, 63, 94, 0.35))'
                            : 'linear-gradient(180deg, rgba(56, 189, 248, 0.65), rgba(56, 189, 248, 0.25))',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{b.hour}</span>
                  </div>
                );
              })}
            </div>

            {/* Pattern callout */}
            <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Most common pattern
              </p>
              <p className="mt-1.5 text-sm font-semibold text-white">
                Entries without SL during NY open
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Detected across 3 weeks of trades. Spikes between 10:00–11:00 ET, again at
                15:00 ET — the "frustration window" after lunch reversals.
              </p>
            </div>

            {/* Stat strip */}
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.05] pt-5">
              <div>
                <p className="font-mono text-lg font-bold text-white tabular-nums">19</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Caught</p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-emerald-300 tabular-nums">$2,140</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Saved</p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-violet-300 tabular-nums">3</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">New rules</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* === Second row: P&L calendar + recent trade replays (equal cols) === */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <PnlCalendar />
          <TradeReplays />
        </div>
      </div>
    </StorySection>
  );
}

/* ---------- P&L calendar (monthly heatmap) ---------- */

// March 2026, leading 0s = padding for the first day-of-week (Sun=0).
// pnl: profit/loss in dollars, null = no trades that day.
const CALENDAR_MONTH = 'March 2026';
const CALENDAR_CELLS = [
  null, null, null, null, null, null, // pad to first day (Sun=index 0); March 1 = Sun
  { d: 1,  pnl: 220 },
  { d: 2,  pnl: -85 },
  { d: 3,  pnl: 410 },
  { d: 4,  pnl: -160 },
  { d: 5,  pnl: 0 },
  { d: 6,  pnl: 90 },
  { d: 7,  pnl: null },
  { d: 8,  pnl: null },
  { d: 9,  pnl: 340 },
  { d: 10, pnl: -240 },
  { d: 11, pnl: 180 },
  { d: 12, pnl: -65 },
  { d: 13, pnl: 290 },
  { d: 14, pnl: null },
  { d: 15, pnl: null },
  { d: 16, pnl: 510 },
  { d: 17, pnl: 80 },
  { d: 18, pnl: -130 },
  { d: 19, pnl: 220 },
  { d: 20, pnl: -90 },
  { d: 21, pnl: null },
  { d: 22, pnl: null },
  { d: 23, pnl: 380 },
  { d: 24, pnl: -50 },
  { d: 25, pnl: 160, today: true },
  { d: 26, pnl: null },
  { d: 27, pnl: null },
  { d: 28, pnl: null },
];

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pnlIntensity(pnl, max) {
  if (pnl == null || pnl === 0 || max === 0) return 0;
  return Math.min(1, Math.abs(pnl) / max);
}

function PnlCalendar() {
  const tradedCells = CALENDAR_CELLS.filter((c) => c && c.pnl != null);
  const monthTotal = tradedCells.reduce((s, c) => s + c.pnl, 0);
  const maxAbs = Math.max(...tradedCells.map((c) => Math.abs(c.pnl)));
  const winCount = tradedCells.filter((c) => c.pnl > 0).length;
  const lossCount = tradedCells.filter((c) => c.pnl < 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="gradient-card flex flex-col p-6 md:p-7"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Daily P&amp;L
          </p>
          <p className="mt-1 font-display text-lg font-bold text-white">{CALENDAR_MONTH}</p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums"
          style={{
            borderColor: monthTotal >= 0 ? 'rgba(0,212,170,0.3)' : 'rgba(244,63,94,0.3)',
            background: monthTotal >= 0 ? 'rgba(0,212,170,0.08)' : 'rgba(244,63,94,0.08)',
            color: monthTotal >= 0 ? '#6ee7b7' : '#fda4af',
          }}
        >
          {monthTotal >= 0 ? '+' : '−'}${Math.abs(monthTotal).toLocaleString()} MTD
        </span>
      </div>

      {/* Day-of-week labels */}
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {DOW.map((d, i) => (
          <span
            key={i}
            className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-600"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {CALENDAR_CELLS.map((c, i) => {
          if (!c) return <span key={`pad-${i}`} className="aspect-square" />;
          const intensity = pnlIntensity(c.pnl, maxAbs);
          const isProfit = c.pnl > 0;
          const isLoss = c.pnl < 0;
          const noTrades = c.pnl == null;
          let bg = 'rgba(255,255,255,0.025)';
          let border = 'rgba(255,255,255,0.04)';
          let textColor = '#475569';
          if (isProfit) {
            bg = `rgba(0, 212, 170, ${0.15 + intensity * 0.45})`;
            border = `rgba(0, 212, 170, ${0.25 + intensity * 0.4})`;
            textColor = '#a7f3d0';
          } else if (isLoss) {
            bg = `rgba(244, 63, 94, ${0.15 + intensity * 0.4})`;
            border = `rgba(244, 63, 94, ${0.25 + intensity * 0.4})`;
            textColor = '#fda4af';
          } else if (!noTrades) {
            // 0 P&L (flat day)
            bg = 'rgba(255,255,255,0.04)';
            border = 'rgba(255,255,255,0.08)';
            textColor = '#94a3b8';
          }
          return (
            <motion.div
              key={c.d}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.012, duration: 0.3 }}
              className="aspect-square rounded-md border p-1 text-left"
              style={{
                background: bg,
                borderColor: c.today ? '#6ee7b7' : border,
                boxShadow: c.today ? '0 0 0 1px #6ee7b7, 0 0 14px -4px rgba(0,212,170,0.6)' : 'none',
              }}
            >
              <p className="font-mono text-[10px] font-semibold tabular-nums" style={{ color: textColor }}>
                {c.d}
              </p>
              {c.pnl != null && c.pnl !== 0 && (
                <p
                  className="mt-0.5 font-mono text-[8.5px] font-semibold leading-none tabular-nums"
                  style={{ color: textColor }}
                >
                  {c.pnl > 0 ? '+' : '−'}${Math.abs(c.pnl)}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.05] pt-5">
        <div>
          <p className="font-mono text-base font-bold text-emerald-300 tabular-nums">{winCount}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Win days</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold text-rose-300 tabular-nums">{lossCount}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Loss days</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold text-white tabular-nums">
            {Math.round((winCount / (winCount + lossCount)) * 100)}%
          </p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Win rate</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Trade replays ---------- */

const REPLAYS = [
  {
    symbol: 'BTCUSD',
    side: 'BUY',
    entry: 77620,
    exit: 77840,
    pnl: 220,
    duration: '14m',
    spark: [10, 12, 11, 14, 16, 15, 18, 22, 20, 24],
  },
  {
    symbol: 'EURUSD',
    side: 'SELL',
    entry: 1.0875,
    exit: 1.0860,
    pnl: 150,
    duration: '8m',
    spark: [22, 20, 21, 18, 16, 17, 14, 13, 12, 10],
  },
  {
    symbol: 'XAUUSD',
    side: 'BUY',
    entry: 2640.5,
    exit: 2638.2,
    pnl: -230,
    duration: '22m',
    spark: [14, 16, 15, 17, 14, 11, 12, 9, 10, 8],
  },
];

function Sparkline({ data, color }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, '')})`}
      />
    </svg>
  );
}

function TradeReplays() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="gradient-card flex flex-col p-6 md:p-7"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Trade replays
          </p>
          <p className="mt-1 font-display text-lg font-bold text-white">Recent — relive each one</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          3 of 47
        </span>
      </div>

      {/* Replay cards */}
      <div className="mt-5 flex flex-col gap-3">
        {REPLAYS.map((r, i) => {
          const isProfit = r.pnl >= 0;
          const color = isProfit ? '#34d399' : '#fb7185';
          return (
            <motion.div
              key={r.symbol + i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-white/[0.12]"
            >
              {/* Symbol + side */}
              <div className="min-w-[90px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white">{r.symbol}</span>
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[9px] font-bold"
                    style={{
                      color: r.side === 'BUY' ? '#6ee7b7' : '#fda4af',
                      background: r.side === 'BUY' ? 'rgba(0,212,170,0.10)' : 'rgba(244,63,94,0.10)',
                      border: `1px solid ${r.side === 'BUY' ? 'rgba(0,212,170,0.25)' : 'rgba(244,63,94,0.25)'}`,
                    }}
                  >
                    {r.side}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] tabular-nums text-slate-500">
                  {r.entry} → {r.exit}
                </p>
              </div>

              {/* Sparkline */}
              <div className="min-w-0 flex-1">
                <Sparkline data={r.spark} color={color} />
              </div>

              {/* P&L + duration + play button */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p
                    className="font-mono text-sm font-bold tabular-nums"
                    style={{ color }}
                  >
                    {isProfit ? '+' : '−'}${Math.abs(r.pnl)}
                  </p>
                  <p className="font-mono text-[10px] text-slate-500">{r.duration}</p>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                  aria-label="Replay trade"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer link */}
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4">
        <p className="text-[11px] text-slate-500">
          Every trade auto-recorded — entry, exit, broker context.
        </p>
        <a
          href="#features"
          className="text-[11px] font-semibold text-accent hover:underline"
        >
          See all replays →
        </a>
      </div>
    </motion.div>
  );
}
