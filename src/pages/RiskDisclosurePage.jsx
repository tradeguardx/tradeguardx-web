import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

const SECTIONS = [
  {
    title: 'TradeGuardX is a tool, not investment advice',
    body:
      "TradeGuardX is a software tool that enforces risk rules YOU configure. We do not provide trading recommendations, signals, market commentary, or investment advice. Nothing on our website, in our extension, in our journal insights, or in any communication from us should be interpreted as a recommendation to buy, sell, or hold any financial instrument.",
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
      "Any trading performance shown on our website, in marketing materials, in user testimonials, or in your own historical journal is not a guarantee of future results. Each trading session, each market condition, and each trader's psychology is different. Discipline tools improve outcomes on average — they do not make any individual trader profitable.",
  },
  {
    title: 'TradeGuardX is not a registered investment advisor or broker',
    body:
      "We are not a registered investment advisor (RIA), broker-dealer, or financial planner under any jurisdiction's regulations. We are a software vendor. If you need investment advice tailored to your personal financial situation, please consult a qualified, licensed financial professional in your country.",
  },
  {
    title: 'No affiliation with brokers or prop firms',
    body:
      "TradeGuardX is independent. We are not affiliated with, sponsored by, or endorsed by any broker, prop firm, exchange, or trading platform — including those whose names appear in our supported broker list. Mentioning a broker by name (or supporting integration with their platform) is not an endorsement of that broker by us, nor an endorsement of TradeGuardX by them.",
  },
  {
    title: 'Software can fail',
    body:
      "TradeGuardX is software running in your browser. It can fail. The browser can crash. The extension can be disabled by you, by Chrome, by an update, or by a website blocking script execution. The internet can drop. Your broker can update their interface in a way that breaks our selectors. We work hard to keep these failures rare and to recover gracefully, but they will happen.",
    afterListNote:
      "Do not rely on TradeGuardX as your only line of defense against catastrophic loss. Keep broker-side stops, position-size limits, and your own discipline as primary protections. Treat TradeGuardX as one layer of safety, not the only layer.",
  },
  {
    title: 'Prop firm rules',
    body:
      "If you trade a funded or evaluation account with a prop firm, that firm has its own rules — daily loss limits, max drawdown, lot sizing, hedging restrictions, news trading restrictions, etc. TradeGuardX can help you enforce these rules, but you are ultimately responsible for understanding and complying with your firm's terms. Violating prop firm rules typically forfeits your account and any unpaid earnings, regardless of why the violation happened.",
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
          <p className="text-sm font-semibold text-white">Last updated: 2026</p>
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
