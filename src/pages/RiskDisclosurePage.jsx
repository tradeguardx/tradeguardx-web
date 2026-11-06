import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

const SECTIONS = [
  {
    title: 'TradeGuardX is a tool, not investment advice',
    body:
      "TradeGuardX is a software tool that enforces risk rules YOU configure. We do not offer copy trading or analysis of future trades, and we do not provide trading recommendations, signals, market commentary, or investment advice. Nothing on our website, in our journal, AI trade analysis or reports, or in any communication from us should be interpreted as a recommendation to buy, sell, or hold any financial instrument.",
  },
  {
    title: 'What TradeGuardX does on your account',
    body:
      "TradeGuardX never opens a position, never adds to one, and never changes the size, price, stop-loss, take-profit or leverage of an order. When a rule you set is breached, or you start or schedule a lock yourself, it locks your trading account for the set period. Rules that apply to a single trade close that trade instead. How a lock works depends on what your exchange or broker offers. None of our supported venues currently offers a lock of its own, so today a lock cancels your open orders, including stop-loss and take-profit orders, closes your open positions at market, and closes any position opened while it runs. If a venue offers its own lock, it may use that instead.",
    list: [
      { text: "A lock can realise a loss, and a close can happen at a worse price than you expected." },
      { text: "Until a venue offers its own lock, an order can still reach the exchange during a lock, and we close the resulting position after it opens." },
      { text: "Journal entries, AI trade analysis and reports look at your past trades. They never recommend a new trade." },
    ],
  },
  {
    title: 'Trading involves substantial risk of loss',
    body:
      "Trading stocks, futures, forex, options, crypto, and other financial instruments involves substantial risk of loss. The leverage available in many of these markets can magnify losses just as it can magnify gains. You can lose more than your initial investment in some markets. Most retail traders lose money. Only trade with capital you can afford to lose entirely.",
  },
  {
    title: 'TradeGuardX does not guarantee profits or prevent losses',
    body:
      "TradeGuardX is designed to help you stick to a disciplined trading plan by enforcing rules you set. It does not predict market direction, guarantee any trading outcome, or prevent every possible loss. Even with TradeGuardX active, you can lose money — the tool only enforces the rules you've configured. If you set lax rules or disable rules during trading, you remove that protection.",
  },
  {
    title: 'Past performance does not guarantee future results',
    body:
      "Any trading performance shown on our website, in marketing materials, in user testimonials, or in your own historical journal is not a guarantee of future results. Each trading session, each market condition, and each trader's psychology is different. Discipline tools do not make any trader profitable.",
  },
  {
    title: 'TradeGuardX is not a registered investment advisor or broker',
    body:
      "We are not a registered investment advisor (RIA), broker-dealer, or financial planner under any jurisdiction's regulations. We are a software vendor. If you need investment advice tailored to your personal financial situation, please consult a qualified, licensed financial professional in your country.",
  },
  {
    title: 'No affiliation with exchanges or brokers',
    body:
      "TradeGuardX is independent. We are not affiliated with, sponsored by, or endorsed by any exchange, broker or trading platform — including those whose names appear in our supported list. Mentioning a broker by name (or supporting integration with their platform) is not an endorsement of that broker by us, nor an endorsement of TradeGuardX by them.",
  },
  {
    title: 'Software can fail',
    body:
      "TradeGuardX is software that depends on our servers, your API key and your exchange or broker. It can fail. An exchange can go down, limit our requests, change its API or reject a close. Markets can be closed, gap or run out of liquidity. If you delete or disable your key, we can no longer act on your account. We work hard to keep these failures rare and to recover gracefully, but they will happen.",
    afterListNote:
      "Do not rely on TradeGuardX as your only line of defense against catastrophic loss. Keep broker-side stops, position-size limits, and your own discipline as primary protections. Treat TradeGuardX as one layer of safety, not the only layer.",
  },
  {
    title: 'Your responsibility',
    body:
      "By using TradeGuardX, you acknowledge that:",
    list: [
      { text: "You are solely responsible for your trading decisions and outcomes." },
      { text: "You will configure your rules based on your own risk tolerance and trading plan." },
      { text: "You will not rely on TradeGuardX as a substitute for your own discipline, education, or professional advice." },
      { text: "You understand that the tool enforces only the rules you set, and that disabling rules removes protection." },
      { text: "You accept that trading is risky and that you can lose money even with TradeGuardX active." },
    ],
  },
  {
    title: 'Jurisdictional notice',
    body:
      "TradeGuardX is provided as-is to users worldwide. Some jurisdictions restrict or regulate the marketing of trading-related software. You are responsible for ensuring your use of TradeGuardX complies with the laws of your country, state, and locality. If trading is restricted where you live, do not use this tool to trade.",
  },
  {
    title: 'Get professional advice',
    body:
      "If you're unsure whether trading is right for you, or whether you can afford to take the risk, please speak with a licensed financial advisor before opening a trading account. Discipline tools like TradeGuardX exist to help serious traders stay disciplined — they cannot replace sound financial planning.",
  },
];

export default function RiskDisclosurePage() {
  useSEO({
    title: 'Risk Disclosure',
    description: 'Important risk disclosure regarding the use of TradeGuardX. Trading involves substantial risk of loss. TradeGuardX is not investment advice.',
    url: 'https://tradeguardx.com/risk-disclosure',
  });

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(244,63,94,0.04), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-24">
        <header className="mb-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#fb7185' }}>
            Risk disclosure
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Trading involves risk
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Read this before using TradeGuardX. Trading is risky. We help you stay disciplined — we don't predict markets and we don't guarantee profits.
          </p>
        </header>

        <div
          className="mb-10 rounded-2xl border p-5 text-sm leading-relaxed sm:p-6"
          style={{
            borderColor: 'rgba(244,63,94,0.25)',
            backgroundColor: 'rgba(244,63,94,0.05)',
            color: '#fbcaca',
          }}
        >
          <p>
            <strong className="text-white">Important:</strong> TradeGuardX is a discipline-enforcement tool. It is not investment advice. It does not guarantee profits or prevent all losses. Trading carries substantial risk — most retail traders lose money. Only trade with capital you can afford to lose. By using TradeGuardX, you accept full responsibility for your trading decisions and outcomes.
          </p>
        </div>

        <div className="space-y-10">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <h2 className="mb-3 font-display text-xl font-bold text-white sm:text-2xl">{section.title}</h2>
              {section.body && (
                <p className="text-sm leading-relaxed text-slate-300 sm:text-[15px]">{section.body}</p>
              )}
              {section.list && (
                <ul className="mt-3 space-y-2.5">
                  {section.list.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-slate-400">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400/60" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.afterListNote && (
                <p
                  className="mt-4 rounded-xl border px-4 py-3 text-xs leading-relaxed text-rose-200"
                  style={{ borderColor: 'rgba(244,63,94,0.25)', backgroundColor: 'rgba(244,63,94,0.06)' }}
                >
                  <strong>Important:</strong> {section.afterListNote}
                </p>
              )}
            </motion.section>
          ))}
        </div>

        <div
          className="mt-14 rounded-2xl border p-6 text-center"
          style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          <p className="text-sm font-semibold text-white">Last updated: November 6, 2026</p>
          <p className="mt-1.5 text-xs text-slate-500">
            Questions about this disclosure? Email{' '}
            <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">
              support@tradeguardx.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
