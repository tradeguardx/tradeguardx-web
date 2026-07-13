import { motion } from 'framer-motion';

const STEPS = [
  {
    num: '01',
    kicker: 'Connect',
    title: 'Generate a Delta API key',
    body: 'Whitelist our IP and paste the key once. Enable the Trading permission so the kill switch can close positions — Delta keys never include withdrawal access, so we can never touch your funds.',
    meta: <>Takes <b>~60 seconds</b></>,
  },
  {
    num: '02',
    kicker: 'Configure',
    title: 'Set your limits',
    body: "Daily loss cap, risk per trade, max trades, cooldown after losses, leverage cap, liquidation distance. Configure once while you're calm — they apply when you aren't.",
    meta: <><b>7 rule types</b> · per-account configuration</>,
  },
  {
    num: '03',
    kicker: 'Trade',
    title: 'Protected, 24/7',
    body: 'Trade on Delta as normal. Our servers watch your account in real time. The moment you cross a line, we cancel your orders, close your positions, and lock the account — any new trade you open during the cooldown is closed on sight.',
    meta: <>Alert → Auto-close → <b>Lock</b></>,
  },
];

export default function CryptoHowItWorks() {
  return (
    <section id="how-it-works" className="section-gap relative border-t border-white/[0.05]">
      <div className="section-padding mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow mb-4">Setup in minutes</span>
          <h2 className="display-lg mt-4">Up and running in 3 steps.</h2>
          <p className="body-lg mx-auto mt-5 max-w-xl">
            Connect your Delta account once. We watch every position around the clock and step in
            the moment you cross a line — no software to keep open.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-white/[0.06] bg-surface-900/60 p-8"
            >
              <div className="font-mono text-xs tracking-widest text-accent">
                {s.num} · <span className="uppercase">{s.kicker}</span>
              </div>
              <h4 className="mt-7 text-xl font-semibold tracking-tight text-slate-100">{s.title}</h4>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{s.body}</p>
              <div className="mt-6 border-t border-white/[0.06] pt-4 font-mono text-[11px] tracking-wide text-slate-500 [&_b]:font-medium [&_b]:text-accent">
                ↳ {s.meta}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
