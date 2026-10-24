import Figure from '../Figure';

/*
 * Four limits people confuse, drawn as how much of your trading life each one
 * covers. The widths are the argument: a stop loss guards a sliver, the
 * daily limit guards one day, drawdown the whole account — and liquidation
 * guards nothing of yours, it guards the exchange.
 */
const ROWS = [
  {
    name: 'Stop loss',
    scope: 'One trade',
    width: '9%',
    color: 'var(--bv-amber)',
    note: 'Says nothing about the next trade, or the eleven after it.',
  },
  {
    name: 'Daily loss limit',
    scope: 'One day',
    width: '34%',
    color: 'var(--bv-accent)',
    note: 'Caps the session. This is the one that stops a spiral.',
  },
  {
    name: 'Max drawdown',
    scope: 'The account’s life',
    width: '100%',
    color: '#818cf8',
    note: 'The floor under everything. Slow to fire, by design.',
  },
  {
    name: 'Liquidation',
    scope: 'The exchange’s margin',
    width: '100%',
    color: 'var(--bv-red)',
    dashed: true,
    note: 'Not a limit you set. It fires at the worst price, after your margin is already gone.',
  },
];

export default function ScopeLadder() {
  return (
    <Figure
      label="Diagram: what a stop loss, daily loss limit, max drawdown and liquidation each protect"
      caption="Each limit covers a different span of time. Only the daily loss limit is sized to the place where most accounts actually break: one bad session."
    >
      <p className="bv-eyebrow">What each limit actually covers</p>
      <div className="mt-4 space-y-4">
        {ROWS.map((r, i) => (
          <div key={r.name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] font-semibold text-white">{r.name}</p>
              <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: r.color }}>
                {r.scope}
              </p>
            </div>
            <div className="mt-1.5 h-3 w-full rounded-full" style={{ background: 'rgba(255,255,255,.05)' }}>
              <div
                className="bv-span h-3 rounded-full"
                style={{
                  width: r.width,
                  '--delay': `${0.15 + i * 0.25}s`,
                  background: r.dashed
                    ? `repeating-linear-gradient(90deg, ${r.color} 0 10px, transparent 10px 16px)`
                    : `linear-gradient(90deg, ${r.color}, color-mix(in srgb, ${r.color} 55%, transparent))`,
                  opacity: r.dashed ? 0.6 : 1,
                }}
              />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{r.note}</p>
          </div>
        ))}
      </div>
    </Figure>
  );
}
