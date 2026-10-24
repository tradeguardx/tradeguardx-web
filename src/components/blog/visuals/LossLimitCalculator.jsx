import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import Figure from '../Figure';
import { inr } from './format';
import { computeLimit, verdictFor } from './lossLimit';

/* The method from the article, as a tool. The maths lives in ./lossLimit.js. */
const PRESETS = [25000, 50000, 100000, 500000];
const GAUGE_MAX = 6; // % — anything past it pins the needle

export default function LossLimitCalculator() {
  const [capital, setCapital] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);
  const [losses, setLosses] = useState(2.5);
  const ids = useId();

  const { r, limit, pct, runway, warnAt } = computeLimit({ capital, riskPct, losses });
  const v = verdictFor(pct);

  const frac = Math.min(pct, GAUGE_MAX) / GAUGE_MAX;
  const ARC = Math.PI * 80;

  return (
    <Figure
      className="bv-glow"
      label="Daily loss limit calculator"
      caption="The runway assumes every day ends exactly at the limit and each day's limit is taken on that morning's balance. Real days are kinder; the point is to see the worst case before it happens."
    >
      <p className="bv-eyebrow">Daily loss limit calculator</p>

      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_15rem]">
        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <label htmlFor={`${ids}-cap`} className="text-[13px] font-semibold text-slate-300">
              Trading capital on the exchange
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 focus-within:border-accent/60">
              <span className="text-slate-500">₹</span>
              <input
                id={`${ids}-cap`}
                type="number"
                inputMode="numeric"
                min="1000"
                step="1000"
                value={capital}
                onChange={(e) => setCapital(Math.max(0, Number(e.target.value) || 0))}
                className="bv-num w-full bg-transparent px-2 py-2.5 text-[15px] font-semibold text-white outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCapital(p)}
                  className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                    capital === p ? 'border-accent/60 text-accent' : 'border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {inr(p)}
                </button>
              ))}
            </div>
          </div>

          <Slider
            id={`${ids}-risk`}
            label="Risk per trade"
            value={riskPct}
            min={0.25}
            max={3}
            step={0.25}
            onChange={setRiskPct}
            display={`${riskPct}% · ${inr(r)}`}
            hint="Most professional guidance sits between 0.5% and 1%."
          />
          <Slider
            id={`${ids}-loss`}
            label="Losing trades you allow in a day"
            value={losses}
            min={1.5}
            max={5}
            step={0.5}
            onChange={setLosses}
            display={`${losses} R`}
            hint="2 to 3 full-size losses is the usual range."
          />
        </div>

        {/* Output */}
        <div className="rounded-2xl border px-4 pb-4 pt-3 text-center" style={{ borderColor: 'rgba(255,255,255,.08)', background: 'rgba(7,9,15,.6)' }}>
          <svg viewBox="0 0 200 116" className="bv-svg mx-auto max-w-[220px]" aria-hidden>
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" strokeLinecap="round" />
            <path
              className="bv-gauge-arc"
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke={v.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={ARC}
              strokeDashoffset={ARC * (1 - frac)}
            />
            <g className="bv-needle" style={{ transform: `rotate(${-90 + frac * 180}deg)` }}>
              <line x1="100" y1="100" x2="100" y2="34" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            </g>
            <circle cx="100" cy="100" r="6" fill="#e2e8f0" />
          </svg>
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: v.color }}>
            {v.label}
          </p>
          <p className="bv-num mt-1 font-display text-3xl font-bold text-white" aria-live="polite">
            {inr(limit)}
          </p>
          <p className="bv-num text-[13px] text-slate-400">{pct.toFixed(2).replace(/\.?0+$/, '')}% of capital per day</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Warn at</p>
              <p className="bv-num text-[14px] font-bold text-slate-200">{inr(warnAt)}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Runway</p>
              <p className="bv-num text-[14px] font-bold text-slate-200">{runway} days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border px-4 py-3" style={{ borderColor: `${v.color}40`, background: `${v.color}0d` }}>
        <p className="text-[13px] leading-relaxed text-slate-300">
          <span className="font-semibold text-white">{runway} back-to-back max-loss days</span> before you are down 20%.{' '}
          {v.note}
        </p>
      </div>
      <p className="mt-4 text-[13px] text-slate-400">
        Want this enforced instead of remembered?{' '}
        <Link to="/signup" className="font-semibold text-accent hover:underline">
          Set it as your daily loss rule in TradeGuardX →
        </Link>
      </p>
    </Figure>
  );
}

function Slider({ id, label, value, min, max, step, onChange, display, hint }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-slate-300">
          {label}
        </label>
        <span className="bv-num text-[14px] font-bold text-white">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bv-range mt-2.5"
      />
      <p className="mt-1.5 text-[12px] text-slate-500">{hint}</p>
    </div>
  );
}
