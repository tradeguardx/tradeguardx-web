import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { StorySection } from './StorySection';

/* ─── Mock UIs for each step ─────────────────────────────────────── */

function MockPairing() {
  const [copied, setCopied] = useState(false);
  const [secs, setSecs] = useState(298);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 298)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-accent">
            <span className="h-2 w-2 animate-ping rounded-full bg-accent/60 absolute" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Extension linked</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
          <span className="font-mono text-2xl font-black tracking-[0.2em] text-white">TGX-4829</span>
          <button
            onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 transition hover:text-white"
          >
            {copied ? (
              <><svg className="h-3.5 w-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="text-accent">Copied</span></>
            ) : (
              <><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-600">Expires in {mm}:{ss} · Paste in the extension popup</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {['Generate', 'Copy', 'Paste in extension'].map((label, i) => (
          <div key={label} className={`rounded-lg border p-3 ${i === 1 ? 'border-accent/20 bg-accent/5' : 'border-white/[0.05] bg-white/[0.02]'}`}>
            <p className={`text-[10px] font-bold ${i === 1 ? 'text-accent' : 'text-slate-500'}`}>{i + 1}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-300">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockRules() {
  const rules = [
    { label: 'Daily loss limit', value: '$500', active: true, color: 'text-accent border-accent/20 bg-accent/5' },
    { label: 'Max trades/day', value: '5 trades', active: true, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
    { label: 'Risk per trade', value: '2% max', active: true, color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
    { label: 'No-stop-loss block', value: 'Enforced', active: false, color: 'text-slate-500 border-white/[0.06] bg-white/[0.02]' },
  ];
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Exness · Account rules</p>
        <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">3 active</span>
      </div>
      {rules.map((r) => (
        <div key={r.label} className={`flex items-center justify-between rounded-xl border p-3.5 ${r.color}`}>
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${r.active ? 'bg-current' : 'bg-slate-700'}`} />
            <p className="text-sm font-medium text-white">{r.label}</p>
          </div>
          <span className={`font-mono text-xs font-bold ${r.active ? '' : 'text-slate-600'}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function MockBlock() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timings = [1200, 1400, 1600];
    const timeouts = timings.map((ms, i) => setTimeout(() => setPhase(i + 1), ms));
    const reset = setTimeout(() => setPhase(0), 5400);
    return () => { timeouts.forEach(clearTimeout); clearTimeout(reset); };
  }, []);

  return (
    <div className="relative flex flex-col gap-3 p-5">
      {/* Simulated broker row */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span>EURUSD · Market Buy · 5.0 lots</span>
          <span className="font-mono text-red-400">Risk: $1,250</span>
        </div>
        <div className={`relative overflow-hidden rounded-lg border transition-all duration-500 ${phase >= 1 ? 'border-red-500/40 bg-red-950/20' : 'border-white/[0.06] bg-white/[0.02]'}`}>
          <div className="flex items-center justify-between px-4 py-3">
            <span className={`text-sm font-semibold transition-colors ${phase >= 1 ? 'text-red-300' : 'text-slate-300'}`}>Place Order</span>
            {phase === 0 && <span className="rounded bg-accent/20 px-2 py-1 text-xs font-bold text-accent">BUY</span>}
            {phase >= 1 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded bg-red-500/20 px-2 py-1 text-xs font-bold text-red-400"
              >
                BLOCKED
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Alert messages */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3.5"
          >
            <div className="flex items-start gap-2.5">
              <svg className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-amber-300">Daily loss limit reached</p>
                <p className="mt-0.5 text-[11px] text-amber-400/70">You have $500 in losses today. This trade would exceed your limit by $750.</p>
              </div>
            </div>
          </motion.div>
        )}
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-red-500/25 bg-red-950/20 p-3.5"
          >
            <p className="text-xs font-bold text-red-300">Trade execution blocked</p>
            <p className="mt-0.5 text-[11px] text-red-400/70">TradeGuardX prevented this order from being placed.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MockJournal() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.42 2.674L5.16 18.245c-1.45-.124-2.107-1.867-1.107-2.867l1.407-1.407" />
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">AI behavior insight</p>
      </div>
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
        <p className="text-sm leading-relaxed text-slate-300">
          You placed <span className="font-bold text-white">4 trades between 2:30–3:15 PM</span> after a losing position. Win rate in this window: <span className="font-bold text-red-400">12%</span>. This is your highest-frequency revenge trading window.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Avg hold time', value: '4m 12s', sub: '↓ 68% vs plan' },
          { label: 'Win rate', value: '12%', sub: 'Tilt window' },
          { label: 'Loss streak', value: '5 in a row', sub: 'Max allowed: 3' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 text-center">
            <p className="font-mono text-sm font-bold text-red-400">{stat.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{stat.label}</p>
            <p className="text-[10px] text-slate-600">{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Steps config ────────────────────────────────────────────────── */

const STEPS = [
  {
    id: 'pair',
    num: '01',
    title: 'Install & pair in 30 seconds',
    description: 'Add the extension from the Chrome Web Store, generate a one-time code in your dashboard, and paste it in the popup. Done.',
    badge: 'Zero broker setup',
    badgeColor: 'text-accent border-accent/20 bg-accent/5',
    mock: <MockPairing />,
    url: 'tradeguardx.com · Pair the extension',
  },
  {
    id: 'rules',
    num: '02',
    title: 'Configure your protection rules',
    description: 'Set daily loss limits, max trades, risk per trade, drawdown ceiling — individually per trading account. Rules apply instantly.',
    badge: 'Per-account rules',
    badgeColor: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
    mock: <MockRules />,
    url: 'tradeguardx.com · Rules · Exness',
  },
  {
    id: 'block',
    num: '03',
    title: 'Trades get blocked before they fire',
    description: 'The extension monitors every order in real time. Warn → Alert → Hard block — it escalates, then stops the trade. No override.',
    badge: 'Real-time enforcement',
    badgeColor: 'text-red-400 border-red-500/20 bg-red-950/10',
    mock: <MockBlock />,
    url: 'tradeguardx.com · Live protection active',
  },
  {
    id: 'journal',
    num: '04',
    title: 'AI surfaces the patterns you repeat',
    description: "Every trade is logged. The AI identifies the exact windows, conditions, and behavior patterns costing you money — so you don't repeat them.",
    badge: 'Behavior analysis',
    badgeColor: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
    mock: <MockJournal />,
    url: 'tradeguardx.com · AI Journal',
  },
];

/* ─── Main component ──────────────────────────────────────────────── */

export default function StoryProductWalkthrough() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setActive((i) => (i + 1) % STEPS.length), 5000);
    return () => clearInterval(id);
  }, [inView]);

  const step = STEPS[active];

  return (
    <StorySection id="story-walkthrough" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.015] to-transparent" />

      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
            Product walkthrough
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Setup to enforcement
            <br />
            <span className="gradient-text-accent">in four steps.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate-400">
            Under two minutes from install to your first protected trade.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-10 lg:items-start">
          {/* Left — vertical stepper */}
          <div className="flex flex-col gap-2">
            {STEPS.map((s, i) => {
              const isActive = active === i;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(i)}
                  className={`group relative w-full rounded-2xl border p-4 text-left transition-all duration-300 ${
                    isActive
                      ? 'border-accent/20 bg-accent/5 shadow-lg shadow-accent/5'
                      : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09] hover:bg-white/[0.035]'
                  }`}
                >
                  {/* Progress bar */}
                  {isActive && inView && (
                    <motion.div
                      key={`${s.id}-bar`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 5, ease: 'linear' }}
                      className="absolute bottom-0 left-0 h-0.5 w-full origin-left rounded-full bg-accent/40"
                    />
                  )}

                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex-shrink-0 font-mono text-sm font-bold tabular-nums transition-colors ${
                        isActive ? 'text-accent' : 'text-slate-700'
                      }`}
                    >
                      {s.num}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                        {s.title}
                      </p>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 text-xs leading-relaxed text-slate-500"
                        >
                          {s.description}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right — browser mockup with live UI */}
          <div className="gradient-card overflow-hidden shadow-2xl shadow-black/50">
            {/* Browser chrome */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={step.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 truncate text-center font-mono text-[11px] text-slate-600"
                >
                  {step.url}
                </motion.p>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.span
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${step.badgeColor}`}
                >
                  {step.badge}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Mock UI */}
            <div className="min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step.mock}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 border-t border-white/[0.05] py-3">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActive(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === active ? 'w-6 h-2 bg-accent' : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  aria-label={s.title}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </StorySection>
  );
}
