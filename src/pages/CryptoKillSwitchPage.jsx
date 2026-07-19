import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

/**
 * Head-term landing page: "crypto kill switch", "crypto killswitch app",
 * "best crypto kill switch India".
 *
 * Written to actually answer the query rather than to repeat the phrase — a thin
 * page built around a keyword is a doorway page, and Google demotes those. The
 * job here is to be the page that genuinely explains what a crypto kill switch
 * is, including the parts that don't flatter us (what it can't do, when you
 * don't need one). Both spellings appear because people search both.
 */

const FAQ = [
  {
    q: 'What is a crypto kill switch?',
    a: "A crypto kill switch is an automated rule that stops you trading once you cross a limit you set in advance — a daily loss cap, a maximum number of trades, a position size. When the limit is hit, it cancels your open orders, closes your positions, and blocks new entries until a cooldown expires. The point is that the decision is made while you're calm and enforced when you aren't.",
  },
  {
    q: 'Is a killswitch different from a stop loss?',
    a: "Yes, and the difference matters. A stop loss protects a single trade; a kill switch protects the account. A stop loss also does nothing about the behaviour that actually blows accounts — re-entering immediately after a loss, doubling size to win it back, trading twelve times on a day you planned to trade three. A kill switch caps the day, not the trade.",
  },
  {
    q: 'Which exchanges does a crypto kill switch work with in India?',
    a: 'TradeGuardX enforces server-side through the exchange API, so it works with Delta Exchange today and CoinDCX next. Because enforcement is server-side rather than in the browser, it applies whether you trade from web, the mobile app, or a third-party client.',
  },
  {
    q: 'Does a kill switch need access to my funds?',
    a: 'No, and you should refuse any that asks. TradeGuardX uses a Delta Exchange API key scoped to read and trade only — that scope can cancel orders and close positions, but it can never withdraw or transfer. Your funds never leave your own exchange wallet.',
  },
  {
    q: 'Can I turn the kill switch off when I want to keep trading?',
    a: "You can change any rule, but loosening one goes through a cooling-off window — you can't raise your loss limit in the middle of a bad session. Tightening applies instantly. A kill switch you can disable in the moment you most want to disable it isn't a kill switch.",
  },
  {
    q: 'Do I need a kill switch if I already have discipline?',
    a: "Probably not, and that's an honest answer. If you consistently stop at your daily limit without help, this is a tool you don't need. It's built for the specific gap between what traders plan on a calm morning and what they do at 2pm after three red trades.",
  },
];

const SECTIONS = [
  {
    h: 'What a crypto kill switch actually does',
    p: [
      "Most account blowups aren't one catastrophic trade. They're a normal loss, followed by a fast re-entry to make it back, followed by a bigger position because the first re-entry failed. By the time the day ends the account is down far more than any single trade risked.",
      'A crypto kill switch breaks that chain mechanically. You set the limits once — daily loss cap, maximum trades per session, risk per trade, cooldown after consecutive losses, leverage cap, liquidation distance. When you cross one, enforcement is automatic: open orders cancelled, positions closed, new entries blocked until the cooldown lifts.',
    ],
  },
  {
    h: 'Why server-side enforcement matters',
    p: [
      "Browser extensions can only act on what's in the tab, and only while the tab is open. Close the laptop, switch to the exchange app on your phone, or place an order through a third-party client, and a browser-based tool sees nothing.",
      'TradeGuardX runs server-side against the Delta Exchange API. It watches your account continuously — screen off, phone in your pocket, laptop shut — and typically detects and acts on a rule breach within about 120 milliseconds. That is the difference between a kill switch and a reminder.',
    ],
  },
  {
    h: 'What to look for in a crypto killswitch app',
    p: [
      'Four things separate a real enforcement tool from a dashboard with alerts. First, does it act, or only notify? An alert that you can ignore is not protection. Second, is enforcement server-side, so it covers mobile and third-party clients? Third, is the API scope trade-only, never withdrawal? Fourth — the one people skip — can you loosen your own limits instantly? If you can, the tool fails exactly when it matters.',
    ],
  },
  {
    h: 'Built for Indian crypto traders',
    p: [
      "TradeGuardX is built for traders on Indian crypto exchanges, starting with Delta Exchange perpetuals and CoinDCX next. Pricing is in rupees, support runs on Telegram in your timezone, and the rules are shaped around the leverage and volatility profile of INR-margined perps rather than transplanted from an equities tool.",
    ],
  },
];

export default function CryptoKillSwitchPage() {
  useSEO({
    title: 'Crypto Kill Switch for Indian Traders',
    description:
      'What a crypto kill switch is, how server-side enforcement differs from alerts, and what to look for in a killswitch app. Built for Delta Exchange and CoinDCX traders in India.',
    url: 'https://tradeguardx.com/crypto-kill-switch',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.06), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-24">
        <header className="mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Crypto kill switch</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            The crypto kill switch for Indian traders
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            A kill switch caps the day, not the trade. Set your daily loss limit once — TradeGuardX
            cancels your orders, closes your positions, and locks new entries the moment you cross it,
            enforced server-side on Delta Exchange whether your screen is on or not.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-surface-950 transition-transform hover:scale-[1.02]"
            >
              Try free for 7 days
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:border-white/20"
            >
              See pricing
            </Link>
          </div>
        </header>

        <div className="space-y-12">
          {SECTIONS.map((s, i) => (
            <motion.section
              key={s.h}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <h2 className="mb-3 font-display text-2xl font-bold text-white">{s.h}</h2>
              {s.p.map((para) => (
                <p key={para.slice(0, 24)} className="mb-3 text-[15px] leading-relaxed text-slate-300">
                  {para}
                </p>
              ))}
            </motion.section>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-bold text-white">Common questions</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border px-5 py-4"
                style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-100 marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Internal links — these pages already rank for long-tail queries and
            passing authority between them beats leaving each one isolated. */}
        <section className="mt-16 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="mb-4 font-display text-lg font-bold text-white">Read next</h2>
          <ul className="space-y-2.5 text-[15px]">
            <li>
              <Link to="/help/kill-switch" className="text-accent hover:underline">
                How the kill switch works, step by step
              </Link>
            </li>
            <li>
              <Link to="/help/rules" className="text-accent hover:underline">
                Every rule you can set, and what each one prevents
              </Link>
            </li>
            <li>
              <Link to="/security" className="text-accent hover:underline">
                Security: how your Delta API key is stored and scoped
              </Link>
            </li>
            <li>
              <Link to="/help/cooldowns" className="text-accent hover:underline">
                Cooldowns and why you can’t loosen a rule mid-session
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
