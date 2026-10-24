import { useState } from 'react';
import Figure from '../Figure';
import { inr } from './format';

/*
 * The forty-minute spiral, as a replay. Illustrative trades on a ₹1,00,000
 * account with a ₹2,500 limit. The "with limit" run closes trade 3 at −₹600,
 * past the line, consistent with the hero chart — a close fills at market.
 */
const LIMIT = 2500;
const SCALE = 7500;

const TRADES = [
  { t: '10:02', what: 'BTC long', why: 'Planned setup', size: '1×', pnl: -950 },
  { t: '10:09', what: 'BTC long', why: 'Re-entry, same idea', size: '1×', pnl: -1050 },
  { t: '10:16', what: 'BTC long', why: 'Double size to win it back', size: '2×', pnl: -1900 },
  { t: '10:31', what: 'ETH short', why: 'Flip direction', size: '2×', pnl: -1400 },
  { t: '10:44', what: 'BTC long', why: 'Bigger again', size: '3×', pnl: 900 },
  { t: '11:05', what: 'BTC long', why: 'The win made it feel right', size: '3×', pnl: -2600 },
];

function runFor(mode) {
  if (mode === 'off') return { rows: TRADES, locked: false };
  return {
    rows: [TRADES[0], TRADES[1], { ...TRADES[2], pnl: -600, closed: true }],
    locked: true,
  };
}

export default function RevengeSpiral() {
  const [mode, setMode] = useState('off');
  const { rows, locked } = runFor(mode);
  const withCum = rows.reduce((acc, r) => [...acc, { ...r, cum: (acc.at(-1)?.cum ?? 0) + r.pnl }], []);
  const total = withCum.at(-1).cum;
  const step = 0.45;

  return (
    <Figure
      label="Interactive replay: a revenge-trading spiral with and without a daily loss limit"
      caption="Illustrative session. Nobody plans the no-limit sequence; it builds itself one ‘just this one’ at a time. The limit does not make the first two trades better. It removes trades four to six."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="bv-eyebrow">Replay the morning</p>
        <div className="flex rounded-xl border border-white/10 p-1" role="group" aria-label="Daily loss limit">
          {[
            ['off', 'No limit'],
            ['on', 'Limit enforced'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={mode === k}
              onClick={() => setMode(k)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors ${
                mode === k
                  ? k === 'on'
                    ? 'bg-accent text-surface-950'
                    : 'bg-rose-500/90 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div key={mode} className="mt-4">
        <ol className="space-y-2">
          {withCum.map((r, i) => (
            <li
              key={r.t}
              className="bv-row grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{
                '--delay': `${i * step}s`,
                borderColor: r.closed ? 'rgba(0,212,170,.35)' : 'rgba(255,255,255,.06)',
                background: r.closed ? 'rgba(0,212,170,.05)' : 'rgba(255,255,255,.02)',
              }}
            >
              <span className="bv-num text-[12px] font-semibold text-slate-500">{r.t}</span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-white">
                  {r.what} <span className="text-slate-500">· {r.size}</span>
                </span>
                <span className="block text-[12px] leading-snug text-slate-400">
                  {r.closed ? 'Force-closed when the day hit the limit' : r.why}
                </span>
              </span>
              <span className="text-right">
                <span className={`bv-num block text-[14px] font-bold ${r.pnl < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {r.pnl < 0 ? '−' : '+'}
                  {inr(Math.abs(r.pnl))}
                </span>
                <span className="bv-num block text-[11px] text-slate-500">day {r.cum < 0 ? '−' : '+'}{inr(Math.abs(r.cum))}</span>
              </span>
            </li>
          ))}
        </ol>

        {locked && (
          <div className="bv-lockcard mt-3 flex items-center gap-3 rounded-xl px-4 py-3" style={{ '--delay': `${rows.length * step + 0.1}s` }}>
            <svg className="bv-shake h-7 w-7 shrink-0" style={{ '--delay': `${rows.length * step + 0.3}s` }} viewBox="0 0 24 24" aria-hidden>
              <rect x="4" y="10.5" width="16" height="11" rx="2.5" fill="#00d4aa" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="#00d4aa" strokeWidth="2.2" />
              <circle cx="12" cy="16" r="1.6" fill="#07090f" />
            </svg>
            <p className="text-[13px] leading-relaxed text-slate-300">
              <span className="font-semibold text-white">Orders cancelled, position closed, account locked</span> until the
              next daily reset. Trades four to six never happen.
            </p>
          </div>
        )}

        {/* Running total against the limit */}
        <div className="bv-fade mt-5" style={{ '--delay': `${rows.length * step + 0.2}s` }}>
          <div className="flex items-baseline justify-between text-[12px]">
            <span className="text-slate-500">Day result</span>
            <span className={`bv-num font-display text-xl font-bold ${locked ? 'text-accent' : 'text-rose-400'}`}>
              −{inr(Math.abs(total))}
            </span>
          </div>
          <div className="relative mt-2 h-3 rounded-full" style={{ background: 'rgba(255,255,255,.05)' }}>
            <div
              className="bv-bar h-3 rounded-full"
              style={{
                width: `${(Math.abs(total) / SCALE) * 100}%`,
                '--delay': `${rows.length * step + 0.3}s`,
                background: locked ? 'linear-gradient(90deg,#00d4aa,#00d4aa)' : 'linear-gradient(90deg,#f59e0b,#f43f5e)',
              }}
            />
            <div className="absolute -top-1.5 h-6 w-0.5 bg-rose-400" style={{ left: `${(LIMIT / SCALE) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-rose-400" style={{ paddingLeft: `calc(${(LIMIT / SCALE) * 100}% - 1.5rem)` }}>
            limit −₹2,500
          </p>
        </div>
      </div>
    </Figure>
  );
}
