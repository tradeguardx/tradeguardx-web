import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

/**
 * Sentry-inspired centerpiece animation for the landing.
 *
 * Three-column composition:
 *   LEFT   — six rule cards (SL, hedging, max trades, daily loss,
 *            risk/trade, drawdown) that pulse in sequence
 *   CENTER — a stylized rule-engine shield. Beams emanate outward to
 *            the rule cards on the left and to the trade card on the right
 *            in time with the active rule.
 *   RIGHT  — a small "user takes a trade" mockup. Status alternates between
 *            "All checks passed" and a rule-violation message that matches
 *            whichever rule is currently active.
 *
 * No content from existing sections is changed — this is a new standalone
 * section dropped into StoryLanding between the hero and the rule catalog.
 */

const RULES = [
  {
    id: 'sl',
    label: 'Stop loss required',
    desc: 'Block if no SL set',
    accent: 'rgba(0, 212, 170, 0.85)',
    violation: 'Stop loss missing',
  },
  {
    id: 'hedging',
    label: 'No hedging',
    desc: 'Same-symbol opposite blocked',
    accent: 'rgba(244, 114, 182, 0.85)',
    violation: 'Opposite side already open',
  },
  {
    id: 'maxtrades',
    label: 'Max trades / day',
    desc: '6 / day cap',
    accent: 'rgba(251, 191, 36, 0.85)',
    violation: 'Daily trade cap reached',
  },
  {
    id: 'dailyloss',
    label: 'Daily loss limit',
    desc: '5% account cap',
    accent: 'rgba(239, 68, 68, 0.85)',
    violation: 'Daily loss limit hit',
  },
  {
    id: 'risk',
    label: 'Risk per trade',
    desc: '1% of balance',
    accent: 'rgba(56, 189, 248, 0.85)',
    violation: 'Position size > 1% risk',
  },
  {
    id: 'drawdown',
    label: 'Drawdown lock',
    desc: '10% total drawdown',
    accent: 'rgba(167, 139, 250, 0.85)',
    violation: 'Drawdown ceiling near',
  },
];

export default function StoryRuleShield() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, amount: 0.35 });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % RULES.length), 2200);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const activeRule = RULES[active];

  return (
    // Embedded directly in the hero now — no <section> / heading wrapper.
    // The hero supplies the headline copy; this component renders only the
    // 3-column rules → shield → trade animation.
    <div ref={ref} className="relative mx-auto w-full max-w-7xl">
        {/* Animation grid */}
        <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)] lg:gap-6">
          {/* === LEFT: Rule cards stack with mini mockups === */}
          <div className="grid grid-cols-2 gap-3">
            {RULES.map((r, i) => {
              const isActive = i === active;
              return (
                <motion.div
                  key={r.id}
                  className="relative overflow-hidden rounded-xl border backdrop-blur-sm"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(13, 18, 30, 0.85), rgba(7, 10, 18, 0.85))',
                  }}
                  animate={{
                    borderColor: isActive ? r.accent : 'rgba(255, 255, 255, 0.07)',
                    boxShadow: isActive
                      ? `0 0 32px -6px ${r.accent}, inset 0 0 0 1px ${r.accent}`
                      : '0 0 0 0 rgba(0,0,0,0)',
                  }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Mockup pane */}
                  <div
                    className="relative h-16 overflow-hidden border-b"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.04)',
                      background: `radial-gradient(120% 100% at 50% 0%, ${r.accent.replace('0.85', '0.10')}, transparent 70%)`,
                    }}
                  >
                    <RuleMockup id={r.id} accent={r.accent} active={isActive} />
                  </div>
                  {/* Label / desc */}
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <motion.span
                        animate={{ opacity: isActive ? 1 : 0.5 }}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: r.accent }}
                      />
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white">
                        {r.label}
                      </p>
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-slate-500">{r.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* === CENTER: Shield + beams === */}
          <div className="relative flex items-center justify-center py-6">
            {/* Beam SVGs (left + right) */}
            <Beams active={active} accent={activeRule.accent} reduce={reduce} />

            {/* Shield core */}
            <div className="relative">
              {/* Outer pulsing rings */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={
                  reduce
                    ? {}
                    : {
                        boxShadow: [
                          `0 0 0 0 ${activeRule.accent.replace('0.85', '0.35')}`,
                          `0 0 0 30px ${activeRule.accent.replace('0.85', '0')}`,
                        ],
                      }
                }
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              {/* Shield container */}
              <motion.div
                animate={{
                  borderColor: activeRule.accent,
                  boxShadow: `0 0 60px -10px ${activeRule.accent}, inset 0 0 30px -10px ${activeRule.accent.replace('0.85', '0.4')}`,
                }}
                transition={{ duration: 0.5 }}
                className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 bg-gradient-to-br from-[#0a1018] to-[#06090f] sm:h-36 sm:w-36"
              >
                {/* Inner shield icon */}
                <motion.svg
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-14 w-14"
                  fill="none"
                  stroke={activeRule.accent}
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </motion.svg>
                {/* Tick counter on the rim */}
                <motion.span
                  key={activeRule.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: activeRule.accent }}
                >
                  Checking · {activeRule.label}
                </motion.span>
              </motion.div>
            </div>
          </div>

          {/* === RIGHT: Trade mockup === */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="data-pane relative p-5"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-300">
                    Live broker · BTCUSD
                  </p>
                </div>
                <p className="font-mono text-[11px] text-slate-500 tabular-nums">77,548.21</p>
              </div>

              {/* Side picker */}
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">Buy</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-emerald-300 tabular-nums">77,548.50</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center opacity-50">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Sell</p>
                  <p className="mt-1 font-mono text-sm text-slate-500 tabular-nums">77,547.92</p>
                </div>
              </div>

              {/* Volume / risk row */}
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Volume</p>
                  <p className="mt-0.5 font-mono text-sm text-slate-200">0.01</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Risk</p>
                  <p className="mt-0.5 font-mono text-sm text-slate-200">$24.10</p>
                </div>
              </div>

              {/* Verdict — alternates between PASS and the active rule's violation */}
              <motion.div
                key={activeRule.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-lg border px-3 py-2.5"
                style={{
                  borderColor: activeRule.accent,
                  backgroundColor: activeRule.accent.replace('0.85', '0.08'),
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: activeRule.accent }} />
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: activeRule.accent }}>
                      Rule check
                    </p>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: activeRule.accent }}>
                    {activeRule.id === 'sl' || activeRule.id === 'dailyloss' ? 'Block' : 'Warn'}
                  </p>
                </div>
                <p className="mt-1.5 text-xs text-slate-200">{activeRule.violation}</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
    </div>
  );
}

/* ---------- RuleMockup — tiny visualization shown inside each rule card ---------- */
function RuleMockup({ id, accent, active }) {
  const dim = active ? 1 : 0.55;

  switch (id) {
    case 'sl': {
      // 3 candles, last one dropping, with a horizontal SL line beneath it.
      return (
        <svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full" style={{ opacity: dim }}>
          {/* candles */}
          <rect x="14" y="14" width="6" height="20" fill={accent} opacity="0.45" />
          <line x1="17" y1="9" x2="17" y2="40" stroke={accent} strokeOpacity="0.55" strokeWidth="0.8" />
          <rect x="38" y="10" width="6" height="22" fill={accent} opacity="0.55" />
          <line x1="41" y1="6" x2="41" y2="38" stroke={accent} strokeOpacity="0.55" strokeWidth="0.8" />
          <rect x="62" y="20" width="6" height="14" fill="rgba(244, 63, 94, 0.7)" />
          <line x1="65" y1="14" x2="65" y2="42" stroke="rgba(244, 63, 94, 0.55)" strokeWidth="0.8" />
          {/* SL dashed line */}
          <line x1="6" y1="44" x2="94" y2="44" stroke="rgba(244, 63, 94, 0.85)" strokeDasharray="3 2" strokeWidth="0.9" />
          <text x="92" y="42" textAnchor="end" fontSize="5" fill="rgba(244, 63, 94, 0.95)" fontFamily="monospace">SL</text>
        </svg>
      );
    }
    case 'hedging': {
      // BUY ↗ + SELL ↘ side-by-side, the SELL one crossed out
      return (
        <div className="flex h-full items-center justify-center gap-2 text-[10px] font-mono" style={{ opacity: dim }}>
          <span
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1"
            style={{ color: accent, borderColor: accent.replace('0.85', '0.45') }}
          >
            BUY ↗
          </span>
          <span className="relative inline-flex items-center gap-1 rounded-md border border-rose-500/40 px-2 py-1 text-rose-300">
            SELL ↘
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 60 24" preserveAspectRatio="none">
              <line x1="2" y1="22" x2="58" y2="2" stroke="rgba(244, 63, 94, 0.9)" strokeWidth="1.4" />
            </svg>
          </span>
        </div>
      );
    }
    case 'maxtrades': {
      // 6 dots, 4 filled colored, 2 empty
      const dots = [1, 1, 1, 1, 0, 0];
      return (
        <div className="flex h-full items-center justify-center gap-1.5" style={{ opacity: dim }}>
          {dots.map((on, idx) => (
            <span
              key={idx}
              className="h-2.5 w-2.5 rounded-full border"
              style={{
                backgroundColor: on ? accent : 'transparent',
                borderColor: on ? accent : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
          <span className="ml-2 font-mono text-[10px]" style={{ color: accent }}>
            4 / 6
          </span>
        </div>
      );
    }
    case 'dailyloss': {
      // Horizontal progress bar, ~70% filled
      return (
        <div className="flex h-full flex-col justify-center px-3" style={{ opacity: dim }}>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] text-slate-400">−$340</span>
            <span className="font-mono text-[10px]" style={{ color: accent }}>
              $500 max
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{
                width: '68%',
                background: `linear-gradient(90deg, ${accent.replace('0.85', '0.5')}, ${accent})`,
              }}
            />
          </div>
        </div>
      );
    }
    case 'risk': {
      // 4 vertical bars with first one highlighted (representing 0.8% within 1% cap)
      const bars = [0.8, 0.5, 0.4, 0.3];
      return (
        <div className="flex h-full items-end justify-center gap-1.5 pb-2" style={{ opacity: dim }}>
          {bars.map((h, idx) => (
            <span
              key={idx}
              className="w-2 rounded-sm"
              style={{
                height: `${h * 70}%`,
                backgroundColor: idx === 0 ? accent : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
          <span className="ml-2 font-mono text-[10px]" style={{ color: accent }}>
            0.8%
          </span>
        </div>
      );
    }
    case 'drawdown': {
      // Vertical gauge with a max-cap line
      return (
        <div className="flex h-full items-center justify-center gap-2" style={{ opacity: dim }}>
          <div className="relative h-9 w-2 rounded-full bg-white/[0.06]">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full"
              style={{
                height: '50%',
                background: `linear-gradient(180deg, ${accent}, ${accent.replace('0.85', '0.4')})`,
              }}
            />
            <span
              className="absolute left-[-3px] right-[-3px] h-px"
              style={{ top: '0%', background: 'rgba(244, 63, 94, 0.7)' }}
            />
          </div>
          <span className="font-mono text-[10px]" style={{ color: accent }}>
            5% / 10%
          </span>
        </div>
      );
    }
    default:
      return null;
  }
}

/* ---------- Beams (animated SVG lines from rules → shield → trade) ---------- */
function Beams({ active, accent, reduce }) {
  // 6 origin Y positions on the left (matches the 3x2 grid roughly)
  const leftYs = [22, 22, 50, 50, 78, 78]; // 3 rows × 2 cols
  const leftXs = [10, 38, 10, 38, 10, 38]; // 2 cols inside the left grid

  return (
    <>
      {/* Left beams */}
      <svg
        className="pointer-events-none absolute inset-y-0 -left-2 hidden w-32 lg:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {leftYs.map((y, i) => {
          const isActive = i === active;
          return (
            <motion.path
              key={`L${i}`}
              d={`M ${leftXs[i]} ${y} Q 70 50 100 50`}
              fill="none"
              stroke={accent}
              strokeWidth={isActive ? 1.4 : 0.6}
              strokeLinecap="round"
              animate={{
                opacity: isActive ? 0.95 : 0.18,
                strokeDasharray: isActive ? '4 6' : '1 0',
                strokeDashoffset: reduce ? 0 : (isActive ? [-30, 0] : 0),
              }}
              transition={{
                opacity: { duration: 0.4 },
                strokeDashoffset: { duration: 1.4, repeat: Infinity, ease: 'linear' },
              }}
            />
          );
        })}
      </svg>

      {/* Right beam (single, shield → trade) */}
      <svg
        className="pointer-events-none absolute inset-y-0 -right-2 hidden w-32 lg:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <motion.path
          d="M 0 50 Q 30 50 100 50"
          fill="none"
          stroke={accent}
          strokeWidth={1.4}
          strokeLinecap="round"
          animate={{
            opacity: 0.85,
            strokeDasharray: '5 7',
            strokeDashoffset: reduce ? 0 : [0, -36],
          }}
          transition={{
            strokeDashoffset: { duration: 1.4, repeat: Infinity, ease: 'linear' },
          }}
        />
      </svg>
    </>
  );
}
