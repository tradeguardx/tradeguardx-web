const STATS = [
  { num: '₹4,71,000', label: 'Saved from rule breaks', accent: true },
  { num: '2,847', label: 'Trades auto-blocked' },
  { num: '<120ms', label: 'Enforcement latency' },
];

export default function CryptoTrustStrip() {
  return (
    <section className="border-y border-white/[0.06] bg-gradient-to-b from-transparent to-accent/[0.02]">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-9 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-surface-900/60 px-3 py-2 font-mono text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Delta Exchange
            <span className="ml-1 text-[9px] uppercase tracking-widest text-accent">Live</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-surface-900/60 px-3 py-2 font-mono text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span><span className="text-slate-300">Coin</span><span className="text-orange-500">DCX</span></span>
            <span className="ml-1 text-[9px] uppercase tracking-widest text-slate-500">Soon</span>
          </span>
        </div>

        {STATS.map((s) => (
          <div key={s.label}>
            <div className={`font-display text-3xl font-bold tracking-tight ${s.accent ? 'text-accent' : 'text-slate-100'}`}>
              {s.num}
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
