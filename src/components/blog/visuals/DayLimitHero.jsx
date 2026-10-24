import Figure from '../Figure';

/*
 * One illustrative trading day on a ₹1,00,000 account with a ₹2,500 limit.
 *
 * Coordinates are precomputed rather than scaled at runtime so the path data
 * is static markup the prerenderer snapshots as-is.
 *   x = 60 + minutesSince9am * 1.75          (09:00 → 15:00 spans 60..690)
 *   y = 30 + (2000 - pnl) * 300 / 11000      (+₹2,000 → 30, −₹9,000 → 330)
 *
 * The close lands at −₹2,600, past the −₹2,500 line, on purpose: a market
 * close fills where the market is, and pretending the limit is a hard floor
 * would be the kind of claim this blog does not make.
 */
const BEFORE = 'M60 84.5 L95 68.2 L138.75 90 L182.5 114.5 L226.25 109.1 L270 133.6 L322.5 155.5';
const AFTER_FLAT = 'M322.5 155.5 H690';
const WITHOUT = 'M322.5 155.5 L366.25 141.8 L410 190.9 L462.5 177.3 L515 237.3 L567.5 226.4 L620 286.4 L672.5 308.2 L690 302.7';

const Y_LABELS = [
  { y: 84.5, t: '₹0' },
  { y: 220.9, t: '−₹5k' },
  { y: 302.7, t: '−₹8k' },
];
const X_LABELS = [
  { x: 60, t: '09:00' },
  { x: 270, t: '11:00' },
  { x: 480, t: '13:00' },
  { x: 690, t: '15:00' },
];

export default function DayLimitHero() {
  return (
    <Figure
      replayable
      label="Chart: one trading day with and without an enforced daily loss limit"
      caption="Illustrative day on a ₹1,00,000 account with a ₹2,500 daily loss limit. The close fills at −₹2,600, not exactly at the line — a market order fills where the market is. Without the limit the same session keeps going."
    >
      <p className="bv-eyebrow">Same morning, two endings</p>
      <svg viewBox="0 44 720 318" role="img" aria-labelledby="dlh-title" className="bv-svg mt-3">
        <title id="dlh-title">
          P&amp;L line drops through the −₹2,500 daily loss limit at 11:30. With the limit enforced the day ends at
          −₹2,600. Without it, the same session reaches −₹8,000 by 15:00.
        </title>
        <defs>
          <linearGradient id="dlh-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f43f5e" stopOpacity="0.16" />
            <stop offset="1" stopColor="#f43f5e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {Y_LABELS.map((l) => (
          <g key={l.t}>
            <line x1="60" x2="690" y1={l.y} y2={l.y} stroke="var(--bv-grid)" strokeWidth="1" />
            <text x="50" y={l.y + 6} textAnchor="end" fontSize="17" fill="var(--bv-muted)">{l.t}</text>
          </g>
        ))}
        {X_LABELS.map((l) => (
          <text key={l.t} x={l.x} y="356" textAnchor="middle" fontSize="17" fill="var(--bv-muted)">{l.t}</text>
        ))}

        {/* The zone below the limit */}
        <rect x="60" y="152.7" width="630" height="180" fill="url(#dlh-fill)" />
        <line className="bv-limit-line" x1="60" x2="690" y1="152.7" y2="152.7" stroke="var(--bv-red)" strokeWidth="2" />
        <text x="686" y="144" textAnchor="end" fontSize="17" fontWeight="700" fill="var(--bv-red)">Daily limit −₹2,500</text>

        {/* Without a limit — drawn second, as a ghost */}
        <path
          className="bv-draw"
          style={{ '--d': '2.2s', '--delay': '2.5s' }}
          pathLength="1"
          d={WITHOUT}
          fill="none"
          stroke="var(--bv-red)"
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <g className="bv-fade" style={{ '--delay': '4.6s' }}>
          <circle cx="690" cy="302.7" r="5" fill="var(--bv-red)" />
          <text x="676" y="333" textAnchor="end" fontSize="18" fontWeight="700" fill="var(--bv-red)">−₹8,000 without</text>
        </g>

        {/* With the limit */}
        <path
          className="bv-draw"
          style={{ '--d': '1.8s' }}
          pathLength="1"
          d={BEFORE}
          fill="none"
          stroke="var(--bv-accent)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          className="bv-draw"
          style={{ '--d': '1.2s', '--delay': '2.1s' }}
          pathLength="1"
          d={AFTER_FLAT}
          fill="none"
          stroke="var(--bv-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <g className="bv-fade" style={{ '--delay': '3.3s' }}>
          <text x="686" y="182" textAnchor="end" fontSize="18" fontWeight="700" fill="var(--bv-accent)">−₹2,600 with the limit</text>
        </g>

        {/* The moment it fires */}
        <circle className="bv-pulse" style={{ '--delay': '1.8s' }} cx="322.5" cy="155.5" r="9" fill="var(--bv-accent)" />
        <g className="bv-pop" style={{ '--delay': '1.8s' }}>
          <circle cx="322.5" cy="155.5" r="15" fill="#07090f" stroke="var(--bv-accent)" strokeWidth="2.5" />
          {/* padlock */}
          <rect x="315.5" y="153" width="14" height="10" rx="2" fill="var(--bv-accent)" />
          <path d="M318 153 v-3.5 a4.5 4.5 0 0 1 9 0 V153" fill="none" stroke="var(--bv-accent)" strokeWidth="2.2" />
        </g>
        <g className="bv-fade" style={{ '--delay': '2.1s' }}>
          <text x="322.5" y="118" textAnchor="middle" fontSize="17" fontWeight="700" fill="#e2e8f0">11:30 · locked</text>
        </g>
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(0,212,170,.25)', background: 'rgba(0,212,170,.05)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Limit enforced</p>
          <p className="bv-num mt-1 font-display text-2xl font-bold text-white">−₹2,600</p>
          <p className="text-[12px] text-slate-400">2.6% of the account. Back tomorrow.</p>
        </div>
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(244,63,94,.25)', background: 'rgba(244,63,94,.05)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">No limit</p>
          <p className="bv-num mt-1 font-display text-2xl font-bold text-white">−₹8,000</p>
          <p className="text-[12px] text-slate-400">8% gone. Needs +8.7% to recover.</p>
        </div>
      </div>
    </Figure>
  );
}
