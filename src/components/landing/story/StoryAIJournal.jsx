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
          <p className="mt-3 text-sm text-slate-500">
            Entries below are sample data, shown to illustrate the format.
          </p>
        </motion.div>

        {/* Journal entry + P&L calendar, side by side. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch">
          {/* === Journal entry === */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="gradient-card flex h-full flex-col p-6 md:p-7"
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
            <div className="mt-5 lg:mt-auto lg:pt-5">
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

          <PnlCalendar />
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
      className="gradient-card flex h-full flex-col p-6 md:p-7"
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

