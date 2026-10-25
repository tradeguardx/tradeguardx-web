import { useState } from 'react';
import Figure from '../Figure';

/*
 * The whole risk-tool argument as a day at a fair, so it lands for someone who
 * has never traded. ₹500 of pocket money in ten ₹50 coins; every game costs
 * one coin. Three ways the day can go:
 *   stop   — a ₹50 cap per game (a stop loss) and nothing else
 *   sign   — a "go home at ₹150" sign you are trusted to obey
 *   parent — someone who takes you home at ₹150 whatever you say
 * The first two end in the same place on purpose. That is the point.
 */
const COINS = 10;
const GAMES = ['Ring toss', 'Darts', 'Hook-a-duck', 'Ring toss again', 'Darts, double or nothing', 'Hoopla', 'One last go', 'Really the last one'];
const STOP_AT = 3; // ₹150

const MODES = {
  stop: {
    label: 'Only a ₹50 cap per game',
    played: GAMES.length,
    end: 'Every game was small. You still spent ₹400 of your ₹500.',
    tone: 'red',
  },
  sign: {
    label: 'A sign: “go home at ₹150”',
    played: GAMES.length,
    end: 'You read the sign. Then you said “just one more” five times. Same ₹400 gone.',
    tone: 'red',
  },
  parent: {
    label: 'A parent who takes you home',
    played: STOP_AT,
    end: 'Home after ₹150. ₹350 is still in your pocket for next weekend.',
    tone: 'ok',
  },
};

const STEP = 0.55;

export default function FairWallet() {
  const [mode, setMode] = useState('stop');
  const m = MODES[mode];
  const left = COINS - m.played;

  return (
    <Figure
      label="Interactive story: pocket money at a fair, with three ways to stop spending"
      caption="Swap “pocket money” for “trading account” and “game” for “trade” and this is every risk tool in this article. The ₹50 cap is a stop loss. The sign is a daily loss limit you enforce yourself. The parent is a kill switch."
    >
      <p className="bv-eyebrow">A day at the fair · ₹500 pocket money</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="How the day is controlled">
        {Object.entries(MODES).map(([k, v]) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            onClick={() => setMode(k)}
            className={`rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
              mode === k ? 'border-accent/60 bg-accent/10 text-white' : 'border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div key={mode} className="mt-5">
        {/* The wallet */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-4" style={{ borderColor: 'rgba(255,255,255,.07)', background: 'rgba(7,9,15,.5)' }}>
          {Array.from({ length: COINS }, (_, i) => {
            // Coins leave from the right, one per game played.
            const spentAt = COINS - 1 - i;
            const spent = spentAt < m.played;
            return (
              <span
                key={i}
                className={`bv-coin ${spent ? 'bv-coin-out' : ''}`}
                style={{ '--delay': `${(spent ? spentAt : 0) * STEP + 0.3}s` }}
                aria-hidden
              >
                ₹50
              </span>
            );
          })}
          <span className="ml-auto pl-2 text-right">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Left</span>
            <span className={`bv-num bv-fade block font-display text-2xl font-bold ${m.tone === 'ok' ? 'text-accent' : 'text-rose-400'}`} style={{ '--delay': `${m.played * STEP + 0.4}s` }}>
              ₹{left * 50}
            </span>
          </span>
        </div>

        {/* The games, one by one */}
        <ol className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {GAMES.map((g, i) => {
            const played = i < m.played;
            const pastSign = mode === 'sign' && i >= STOP_AT;
            const skipped = mode === 'parent' && i >= STOP_AT;
            return (
              <li
                key={g}
                className="bv-row flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px]"
                style={{
                  '--delay': `${(played ? i : m.played) * STEP + 0.3}s`,
                  background: skipped ? 'transparent' : 'rgba(255,255,255,.025)',
                  opacity: skipped ? 0.35 : 1,
                  textDecoration: skipped ? 'line-through' : 'none',
                }}
              >
                <span className="text-slate-300">
                  {i + 1}. {g}
                  {pastSign && <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300">“just one more”</span>}
                </span>
                <span className={played ? 'font-semibold text-rose-400' : 'text-slate-600'}>{played ? '−₹50' : 'not played'}</span>
              </li>
            );
          })}
        </ol>

        {mode === 'parent' && (
          <div className="bv-lockcard mt-3 rounded-xl px-4 py-3 text-[13px] text-slate-300" style={{ '--delay': `${STOP_AT * STEP + 0.3}s` }}>
            <span className="font-semibold text-white">₹150 spent. Time to go home.</span> You can argue. It doesn’t matter. That’s
            the whole idea.
          </div>
        )}

        <p className="bv-fade mt-4 text-[14px] font-medium leading-relaxed text-slate-200" style={{ '--delay': `${m.played * STEP + 0.5}s` }}>
          {m.end}
        </p>
      </div>
    </Figure>
  );
}
