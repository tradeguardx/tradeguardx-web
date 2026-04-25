import { motion } from 'framer-motion';
import { StorySection } from './StorySection';

const RULES = [
  {
    id: 'dailyloss',
    accent: 'rgba(0, 212, 170, 0.85)',
    title: 'Daily loss protection',
    savesFrom: 'Bleeding past your daily loss limit in one session — the fastest way to fail a prop evaluation.',
    gradient: 'from-accent/15 to-emerald-500/10',
    border: 'border-white/[0.07]',
    iconColor: 'text-accent',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
  {
    id: 'hedging',
    accent: 'rgba(244, 63, 94, 0.85)',
    title: 'Hedging prevention',
    savesFrom: 'Opposite-side trades on the same symbol that break no-hedge or netting rules.',
    gradient: 'from-red-500/12 to-orange-500/8',
    border: 'border-white/[0.07]',
    iconColor: 'text-red-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
        />
      </svg>
    ),
  },
  {
    id: 'risk',
    accent: 'rgba(56, 189, 248, 0.85)',
    title: 'Risk per trade',
    savesFrom: 'A single huge position risking more of the account than your plan allows.',
    gradient: 'from-blue-500/12 to-cyan-500/8',
    border: 'border-white/[0.07]',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
        />
      </svg>
    ),
  },
  {
    id: 'drawdown',
    accent: 'rgba(167, 139, 250, 0.85)',
    title: 'Max drawdown lock',
    savesFrom: 'Total drawdown beyond your ceiling — the hard stop firms and personal plans use.',
    gradient: 'from-purple-500/12 to-pink-500/8',
    border: 'border-white/[0.07]',
    iconColor: 'text-purple-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
  },
  {
    id: 'stacking',
    accent: 'rgba(129, 140, 248, 0.85)',
    title: 'Stacking control',
    savesFrom: 'Too many open positions at once — stacked exposure on correlated instruments.',
    gradient: 'from-indigo-500/12 to-violet-500/8',
    border: 'border-white/[0.07]',
    iconColor: 'text-indigo-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142-4.5L12 12"
        />
      </svg>
    ),
  },
  {
    id: 'maxtrades',
    accent: 'rgba(251, 146, 60, 0.85)',
    title: 'Max trades per day',
    savesFrom: 'Revenge trading and overtrading after wins or losses when judgment is impaired.',
    gradient: 'from-orange-500/12 to-amber-500/8',
    border: 'border-white/[0.07]',
    iconColor: 'text-orange-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
    ),
  },
  {
    id: 'closeloss',
    accent: 'rgba(251, 113, 133, 0.85)',
    title: 'Close after N losses',
    savesFrom: 'Trading straight through a loss streak before you reset — tilt and revenge cycles.',
    gradient: 'from-rose-500/12 to-red-500/8',
    border: 'border-white/[0.07]',
    iconColor: 'text-rose-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    ),
  },
  {
    id: 'sl',
    accent: 'rgba(34, 211, 238, 0.85)',
    title: 'Stop loss protection',
    savesFrom: 'Running without a stop — undefined downside while the market moves against you.',
    gradient: 'from-cyan-500/12 to-teal-500/8',
    border: 'border-white/[0.07]',
    iconColor: 'text-cyan-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
  },
  {
    id: 'holdtime',
    accent: 'rgba(148, 163, 184, 0.85)',
    title: 'Minimum hold time',
    savesFrom: 'Impulsive early closes and scratch exits that churn fees and break your plan.',
    gradient: 'from-slate-500/15 to-slate-400/8',
    border: 'border-white/[0.07]',
    iconColor: 'text-slate-400',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function StoryRulesCatalog() {
  return (
    <StorySection id="features" className="relative scroll-mt-24 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
            What you can enforce
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Configure your protection rules.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Pick the rails that match your plan — TradeGuardX enforces them{' '}
            <span className="text-slate-300">inside the browser</span>, in real time, every trade.
          </p>
        </div>

        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.12 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {RULES.map((r) => {
            // Map the rule's icon color to a gradient-card variant so the
            // border tone reinforces the semantic role of each rule.
            const ic = r.iconColor;
            let variant = '';
            if (/red|rose|orange|amber/.test(ic)) variant = 'gradient-card-warm';
            else if (/blue|cyan|indigo|purple|violet/.test(ic)) variant = 'gradient-card-cool';
            return (
            <motion.li
              key={r.title}
              variants={item}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`gradient-card group overflow-hidden ${variant}`}
            >
              {/* Mockup pane — small product visualization, like Sentry's
                  feature cards. Tinted background uses the rule's accent. */}
              <div
                className="relative h-24 overflow-hidden border-b"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.04)',
                  background: `radial-gradient(120% 100% at 50% 0%, ${r.accent.replace('0.85', '0.10')}, transparent 70%)`,
                }}
              >
                <CatalogMockup id={r.id} accent={r.accent} />
              </div>

              {/* Body */}
              <div className="relative p-5">
                {/* Icon + title row */}
                <div className="mb-3 flex items-center gap-3">
                  <span className={`flex-shrink-0 ${r.iconColor} opacity-80`}>{r.icon}</span>
                  <p className="font-display text-sm font-bold text-white">{r.title}</p>
                </div>

                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Saves you from
                </p>
                <p className="text-sm leading-relaxed text-slate-400">{r.savesFrom}</p>
              </div>
            </motion.li>
            );
          })}
        </motion.ul>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mt-10 max-w-xl text-center text-xs text-slate-600"
        >
          Exact limits are yours to set per trading account. The rule engine grows — more rule types
          are added based on trader feedback.
        </motion.p>
      </div>
    </StorySection>
  );
}

/* ---------- CatalogMockup — small visualization shown in each rule card ---------- */
function CatalogMockup({ id, accent }) {
  switch (id) {
    case 'dailyloss': {
      // Horizontal progress bar — 68% consumed of daily cap
      return (
        <div className="absolute inset-0 flex flex-col justify-center px-5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] text-slate-400">−$340 today</span>
            <span className="font-mono text-[10px]" style={{ color: accent }}>$500 cap</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{
                width: '68%',
                background: `linear-gradient(90deg, ${accent.replace('0.85', '0.5')}, ${accent})`,
              }}
            />
          </div>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: accent }}>
            $160 remaining · 32%
          </p>
        </div>
      );
    }
    case 'hedging': {
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-2 font-mono text-[10px]">
          <span
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1"
            style={{ color: '#6ee7b7', borderColor: 'rgba(0, 212, 170, 0.45)' }}
          >
            BUY ↗
          </span>
          <span className="font-mono text-[10px] text-slate-600">on BTCUSD</span>
          <span className="relative inline-flex items-center gap-1 rounded-md border border-rose-500/45 px-2 py-1 text-rose-300">
            SELL ↘
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 60 24" preserveAspectRatio="none">
              <line x1="2" y1="22" x2="58" y2="2" stroke="rgba(244, 63, 94, 0.9)" strokeWidth="1.5" />
            </svg>
          </span>
        </div>
      );
    }
    case 'risk': {
      // 5 vertical bars; first bar maxed (0.8% used of 1% cap)
      const bars = [0.85, 0.55, 0.4, 0.3, 0.25];
      return (
        <div className="absolute inset-0 flex items-end justify-center gap-1.5 px-5 pb-3">
          {bars.map((h, idx) => (
            <span
              key={idx}
              className="w-2.5 rounded-sm"
              style={{
                height: `${h * 70}%`,
                backgroundColor: idx === 0 ? accent : 'rgba(255, 255, 255, 0.10)',
              }}
            />
          ))}
          <div className="ml-3 text-left">
            <p className="font-mono text-sm font-bold tabular-nums" style={{ color: accent }}>
              0.8%
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">of 1% max</p>
          </div>
        </div>
      );
    }
    case 'drawdown': {
      // Vertical drawdown gauge with a max-cap line at top
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-3">
          <div className="relative h-12 w-2.5 rounded-full bg-white/[0.06]">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full"
              style={{
                height: '50%',
                background: `linear-gradient(180deg, ${accent}, ${accent.replace('0.85', '0.4')})`,
              }}
            />
            <span
              className="absolute left-[-4px] right-[-4px] h-px"
              style={{ top: '0%', background: 'rgba(244, 63, 94, 0.7)' }}
            />
          </div>
          <div>
            <p className="font-mono text-sm font-bold tabular-nums" style={{ color: accent }}>
              5% / 10%
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
              total drawdown
            </p>
          </div>
        </div>
      );
    }
    case 'stacking': {
      // 3 stacked position blocks — last one over the line
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          <div className="flex flex-col items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-2 w-12 rounded-sm"
                style={{
                  background:
                    i === 2
                      ? 'rgba(244, 63, 94, 0.7)'
                      : `${accent.replace('0.85', '0.5')}`,
                  border: i === 2 ? '1px solid rgba(244, 63, 94, 0.9)' : 'none',
                }}
              />
            ))}
            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest" style={{ color: accent }}>
              3 positions
            </p>
          </div>
          <div className="ml-2">
            <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">cap</p>
            <p className="font-mono text-sm font-bold tabular-nums text-rose-300">2 max</p>
          </div>
        </div>
      );
    }
    case 'maxtrades': {
      // 6 dots, 4 filled colored, 2 empty
      const dots = [1, 1, 1, 1, 0, 0];
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          {dots.map((on, idx) => (
            <span
              key={idx}
              className="h-3 w-3 rounded-full border"
              style={{
                backgroundColor: on ? accent : 'transparent',
                borderColor: on ? accent : 'rgba(255, 255, 255, 0.18)',
              }}
            />
          ))}
          <span className="ml-3 font-mono text-sm font-bold tabular-nums" style={{ color: accent }}>
            4 / 6
          </span>
        </div>
      );
    }
    case 'closeloss': {
      // L L L sequence then a "session paused" pill
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          {['L', 'L', 'L'].map((l, i) => (
            <span
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-rose-500/40 bg-rose-500/10 font-mono text-[10px] font-bold text-rose-300"
            >
              {l}
            </span>
          ))}
          <svg className="h-3 w-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span
            className="rounded-md border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: accent, borderColor: accent.replace('0.85', '0.45'), background: accent.replace('0.85', '0.10') }}
          >
            Paused
          </span>
        </div>
      );
    }
    case 'sl': {
      // 3 candles + dashed SL line beneath
      return (
        <svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <rect x="14" y="14" width="6" height="20" fill={accent} opacity="0.45" />
          <line x1="17" y1="9" x2="17" y2="40" stroke={accent} strokeOpacity="0.55" strokeWidth="0.8" />
          <rect x="38" y="10" width="6" height="22" fill={accent} opacity="0.55" />
          <line x1="41" y1="6" x2="41" y2="38" stroke={accent} strokeOpacity="0.55" strokeWidth="0.8" />
          <rect x="62" y="20" width="6" height="14" fill="rgba(244, 63, 94, 0.7)" />
          <line x1="65" y1="14" x2="65" y2="42" stroke="rgba(244, 63, 94, 0.55)" strokeWidth="0.8" />
          <line
            x1="6"
            y1="44"
            x2="94"
            y2="44"
            stroke="rgba(244, 63, 94, 0.85)"
            strokeDasharray="3 2"
            strokeWidth="0.9"
          />
          <text x="92" y="42" textAnchor="end" fontSize="5" fill="rgba(244, 63, 94, 0.95)" fontFamily="monospace">
            SL
          </text>
        </svg>
      );
    }
    case 'holdtime': {
      // Clock with arc + min hold label
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-3">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke={accent} strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
            <path d="M12 5 A 7 7 0 0 1 18 12" strokeLinecap="round" />
            <line x1="12" y1="12" x2="12" y2="7" strokeLinecap="round" strokeOpacity="0.8" />
            <line x1="12" y1="12" x2="15.5" y2="12" strokeLinecap="round" strokeOpacity="0.8" />
          </svg>
          <div>
            <p className="font-mono text-sm font-bold tabular-nums" style={{ color: accent }}>
              ≥ 60s
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">min hold</p>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
