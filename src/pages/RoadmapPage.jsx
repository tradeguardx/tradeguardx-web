import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

/**
 * Public roadmap. Update by editing this file — no CMS, no backend.
 *
 * Three lanes:
 *   - shipped: published features users can use today
 *   - inProgress: actively being worked on, ship date soft
 *   - planned: on the list, no commitment date
 *
 * Keep ~5-8 items per lane. If a lane gets longer, prune the oldest.
 */
const ROADMAP = {
  shipped: [
    { title: 'Server-side kill switch', body: "Breach a rule and we cancel your orders, close your positions at market, and lock the account — from our servers, typically inside 120ms, whether you traded from the web, the exchange app or a third-party client." },
    { title: 'Delta Exchange and CoinDCX', body: "Both live, both futures, one subscription covering both. Delta India or Global; CoinDCX futures across INR and USDT margin from a single key." },
    { title: 'Seven risk rules', body: "Daily loss, daily profit target, max trades per day, close after N losses with escalating cooldowns, risk per trade, max drawdown and stop-loss protection. Every rule on every plan." },
    { title: 'Manual lockout', body: "Shut yourself out for 3, 6 or 12 hours when you can feel the tilt coming. No cancel button — you can extend it, never shorten it." },
    { title: 'Rule lock and cooling-off', body: "Tightening a limit applies instantly; loosening waits 24 hours. Your API key is frozen while a lock runs, so pulling the key is not an exit either." },
    { title: 'Tax centre for Indian traders', body: "Your financial-year result rebuilt from raw exchange fills with FIFO lot matching, F&O and VDA kept separate, reconciled against your wallet and exported for your CA." },
    { title: 'Journal, behaviour ledger and alerts', body: "Every trade recorded with the rules that fired on it, AI-written narratives and pattern detection, breach alerts on Telegram and email within seconds." },
  ],
  inProgress: [
    { title: 'Bybit and Bitget', body: "Both integrations are built and being tested against live accounts before release. Same engine, same rules, same subscription — no regional pricing and nothing to re-learn." },
    { title: 'Combined CA report', body: "Tax figures are reported per account today, because two accounts under one login are not always the same taxpayer. The CA report will let you pick which accounts are yours and produce one combined summary." },
    { title: 'Max drawdown enforcement', body: "Max Drawdown Lock alerts today but does not close or lock, which the name oversells. We are working out what a lifetime-drawdown lock should release on before wiring it to the kill switch." },
  ],
  planned: [
    { title: 'Calendar auto-lock', body: "Lock the account automatically around high-impact macro releases — CPI, FOMC, NFP — for a window you choose either side of the print." },
    { title: 'WhatsApp and SMS alerts', body: "Breach alerts on the channels people actually read. Telegram and email work today." },
    { title: 'Custom rule builder', body: "Compose your own rule from primitive conditions instead of waiting for us to add a template." },
    { title: 'Mobile companion app', body: "Read-only view of account state, live rule status and recent trades from your phone. Enforcement already runs without it." },
    { title: 'Spot and options coverage', body: "We enforce futures only. Options follow once the exchanges expose them properly; spot is a harder question under VDA rules and we will not pretend otherwise." },
    { title: 'Public API', body: "Programmatic access to your trades, rules and breach history." },
  ],
};

const LANE_STYLES = {
  shipped: {
    label: 'Shipped',
    color: '#00d4aa',
    border: 'rgba(0,212,170,0.30)',
    background: 'rgba(0,212,170,0.06)',
    badgeBg: 'rgba(0,212,170,0.15)',
    badgeBorder: 'rgba(0,212,170,0.30)',
  },
  inProgress: {
    label: 'In progress',
    color: '#fbbf24',
    border: 'rgba(251,191,36,0.28)',
    background: 'rgba(251,191,36,0.05)',
    badgeBg: 'rgba(251,191,36,0.13)',
    badgeBorder: 'rgba(251,191,36,0.28)',
  },
  planned: {
    label: 'Planned',
    color: '#a78bfa',
    border: 'rgba(167,139,250,0.28)',
    background: 'rgba(167,139,250,0.05)',
    badgeBg: 'rgba(167,139,250,0.13)',
    badgeBorder: 'rgba(167,139,250,0.30)',
  },
};

function Lane({ lane, items }) {
  const style = LANE_STYLES[lane];
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{
            borderColor: style.badgeBorder,
            backgroundColor: style.badgeBg,
            color: style.color,
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />
          {style.label}
        </span>
        <span className="text-xs text-slate-500">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>
      <div className="grid gap-3">
        {items.map((item, i) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="rounded-xl border p-4 sm:p-5"
            style={{ borderColor: style.border, backgroundColor: style.background }}
          >
            <h3 className="font-display text-base font-bold text-white sm:text-lg">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{item.body}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  useSEO({
    title: 'Roadmap',
    description: "What we've shipped, what we're working on, and what's planned for TradeGuardX.",
    url: 'https://tradeguardx.com/roadmap',
  });

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.05), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24">
        <header className="mb-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Roadmap</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            What we're building next
          </h1>
          <p className="mt-4 mx-auto max-w-xl text-base leading-relaxed text-slate-400">
            We update this page when we ship something or start something new. No vapor, no fake promises — only what we're actually working on.
          </p>
        </header>

        <div className="space-y-12">
          <Lane lane="shipped" items={ROADMAP.shipped} />
          <Lane lane="inProgress" items={ROADMAP.inProgress} />
          <Lane lane="planned" items={ROADMAP.planned} />
        </div>

        <div
          className="mt-14 rounded-2xl border p-6 text-center"
          style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          <p className="text-sm font-semibold text-white">Got a request?</p>
          <p className="mt-1.5 text-sm text-slate-400">
            Tell us what's missing — email{' '}
            <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">
              support@tradeguardx.com
            </a>{' '}
            with your use case. The roadmap is shaped by what users actually ask for.
          </p>
        </div>
      </div>
    </div>
  );
}
