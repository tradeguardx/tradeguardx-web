import { useState } from 'react';
import Figure from '../Figure';
import { inr } from './format';

/*
 * What leverage does to a fixed amount of margin. Fees are ILLUSTRATIVE and
 * labelled as such: 0.05% per side is a typical taker rate on Indian futures
 * venues, and GST at 18% is charged on top of exchange fees. Real rates vary
 * by venue and tier, which is why the copy tells the reader to check theirs.
 */
const STOPS = [1, 2, 3, 5, 10, 15, 20, 25, 50, 75, 100];
const MARGIN = 20000;
const TAKER = 0.0005;
const GST = 0.18;

export default function LeverageMeter() {
  const [idx, setIdx] = useState(4); // 10x
  const lev = STOPS[idx];
  const notional = MARGIN * lev;
  const perOnePct = lev; // a 1% move = lev% of margin
  const wipeMove = 100 / lev;
  const roundTrip = notional * TAKER * 2 * (1 + GST);
  const feePctOfMargin = (roundTrip / MARGIN) * 100;
  const hot = lev >= 25;

  return (
    <Figure
      label="Interactive: what leverage does to ₹20,000 of margin"
      caption="Illustrative: ₹20,000 margin, 0.05% taker fee per side plus 18% GST. Liquidation comes before the full move shown, because exchanges close you at the maintenance margin. Check your own venue’s fee schedule."
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="bv-eyebrow">Drag the leverage</p>
        <p className="bv-num font-display text-3xl font-bold" style={{ color: hot ? '#f43f5e' : '#00d4aa' }}>
          {lev}×
        </p>
      </div>
      <input
        type="range"
        min="0"
        max={STOPS.length - 1}
        step="1"
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        className="bv-range mt-3"
        aria-label="Leverage"
        aria-valuetext={`${lev} times`}
      />
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>1×</span>
        <span>100×</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Position size" value={inr(notional)} sub={`on ${inr(MARGIN)} of margin`} />
        <Stat
          label="A 1% move against you"
          value={`−${perOnePct}%`}
          sub="of your margin"
          tone={perOnePct >= 20 ? 'red' : perOnePct >= 10 ? 'amber' : 'ok'}
        />
        <Stat
          label="One round trip in fees"
          value={inr(roundTrip)}
          sub={`${feePctOfMargin.toFixed(1)}% of margin, before price moves`}
          tone={feePctOfMargin >= 2 ? 'red' : feePctOfMargin >= 1 ? 'amber' : 'ok'}
        />
      </div>

      {/* The price move that erases the whole margin, on a ±10% price track */}
      <div className="mt-6">
        <p className="text-[13px] text-slate-400">
          Price move that erases the whole ₹20,000:{' '}
          <span className="bv-num font-bold text-white">{wipeMove < 1 ? wipeMove.toFixed(2) : wipeMove.toFixed(1)}%</span>
        </p>
        <div className="relative mt-3 h-8 rounded-lg" style={{ background: 'rgba(255,255,255,.04)' }}>
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
          <div
            className="bv-tween absolute inset-y-1 right-1/2 rounded-l-md"
            style={{
              width: `${Math.min(wipeMove, 10) * 5}%`,
              background: 'linear-gradient(270deg, rgba(244,63,94,.85), rgba(244,63,94,.2))',
            }}
          />
          <span className="absolute -bottom-5 left-0 text-[11px] text-slate-500">−10%</span>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-slate-500">entry</span>
          <span className="absolute -bottom-5 right-0 text-[11px] text-slate-500">+10%</span>
        </div>
        <p className="mt-7 text-[13px] leading-relaxed text-slate-400">
          {wipeMove > 10
            ? 'At this leverage a 10% move against you still leaves margin on the table. Slow enough for a daily limit to act.'
            : wipeMove > 5
              ? 'A sharp day for BTC moves this far, and smaller coins do it routinely.'
              : wipeMove >= 2
                ? 'That is an ordinary day’s range for BTC. A daily limit is what stops the second and third attempt.'
                :'This is inside the noise of a single candle. At this leverage a daily limit isn’t a safety net — it is the only thing between you and the liquidation engine.'}
        </p>
      </div>
    </Figure>
  );
}

function Stat({ label, value, sub, tone = 'ok' }) {
  const color = tone === 'red' ? '#f43f5e' : tone === 'amber' ? '#f59e0b' : '#e2e8f0';
  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="bv-num mt-1 font-display text-xl font-bold transition-colors" style={{ color }}>
        {value}
      </p>
      <p className="text-[12px] leading-snug text-slate-500">{sub}</p>
    </div>
  );
}
