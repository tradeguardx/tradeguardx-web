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
    { title: 'Real-time risk rule engine', body: "Block trades at the click in your broker tab — daily loss limit, max drawdown, risk per trade, hedging prevention, and more." },
    { title: 'AI trade journal', body: "Anthropic-powered narratives, behavior tags, and pattern detection on your trade history." },
    { title: 'Multi-broker support', body: "Pair the extension with a curated list of prop firms and brokers via simple selectors." },
    { title: 'Pro & Pro+ subscriptions', body: "Free tier with core protection; paid plans for extended history, more accounts, and advanced rule templates." },
    { title: 'Partner program', body: "Trading creators and educators can apply to refer customers and earn commission." },
    { title: 'Self-serve cancellation & billing portal', body: "Manage your subscription, update payment method, and view invoices via Dodo's customer portal — accessible directly from the dashboard." },
  ],
  inProgress: [
    { title: 'More broker integrations', body: "Adding selectors for additional prop firms based on user demand. Email us with your broker if it's not yet supported." },
    { title: 'Multi-account analytics on Pro+', body: "Cross-account performance views and aggregated risk reporting." },
    { title: 'Improved pairing flow', body: "Faster onboarding with guided pairing checks and clearer error states." },
  ],
  planned: [
    { title: 'Mobile companion app', body: "Read-only view of your account state, recent trades, and rule status from your phone." },
    { title: 'Automated trade replay', body: "Step through your day's trades with synced rule context — what fired, what almost fired, what passed." },
    { title: 'Custom rule builder', body: "Compose your own rules from primitive conditions without waiting for us to add a template." },
    { title: 'Team / firm accounts', body: "Prop firms and trading desks can manage rules across multiple traders from one console." },
    { title: 'Public API', body: "Programmatic access to your trades and rules for power users and integrations." },
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
