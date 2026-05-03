import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

const SECTIONS = [
  {
    title: 'We never have your broker login',
    body:
      "TradeGuardX runs entirely in your browser as a Chrome extension. We don't ask for, store, or transmit your broker username, password, API keys, or session cookies. The extension reads what's already visible on the broker page (your open positions, the Buy/Sell buttons, your P&L) and enforces rules at the click. No backdoor into your broker.",
  },
  {
    title: 'Authentication',
    body: "Sign-in is handled by Supabase, an industry-standard auth provider. We never see your password. Sessions use signed JWT tokens with a 1-hour expiry; the extension uses a separate, scoped pairing token that only authorizes the trading account it's paired to.",
  },
  {
    title: 'What we collect',
    list: [
      { bold: 'Account info:', text: 'email, display name (you set), and authentication identifier from Supabase.' },
      { bold: 'Trading account metadata:', text: 'the prop firm/broker, account name, starting balance, and currency you enter when adding an account.' },
      { bold: 'Trade events:', text: 'symbol, side, quantity, entry/exit price, P&L, and timestamps for trades you take in your paired broker tab.' },
      { bold: 'Risk rules:', text: "your configured rules and parameters (e.g., 'daily loss limit: 2%')." },
      { bold: 'Subscription state:', text: 'your plan tier and billing reference (the actual card is at Dodo, never on our servers).' },
    ],
  },
  {
    title: 'What we do NOT collect',
    list: [
      { text: "Broker passwords, API keys, 2FA codes, or session cookies." },
      { text: "Page content unrelated to trading (account numbers in non-trading pages, broker chat, support tickets, etc.)." },
      { text: "Browsing activity outside your paired broker domain. The extension stays dormant on every other website." },
      { text: "Personal financial information beyond what you enter (we don't pull credit scores, bank info, etc.)." },
    ],
  },
  {
    title: 'Where your data lives',
    body:
      "Your account, rules, and trade history are stored in a PostgreSQL database hosted on AWS in the ap-south-1 (Mumbai) region. Local extension state (pairing token, recent trades cache, your selectors) lives only in your browser via chrome.storage.local — it never leaves until you sync it by trading.",
  },
  {
    title: 'Encryption',
    list: [
      { bold: 'In transit:', text: 'TLS 1.2+ on every API call and webhook. No HTTP, ever.' },
      { bold: 'At rest:', text: 'AWS RDS encrypts the database disk; backups are encrypted snapshots.' },
      { bold: 'Tokens:', text: 'Auth tokens are signed JWTs (HS256) with short expiries. Pairing tokens are scoped to a single trading account and revocable.' },
    ],
  },
  {
    title: 'Third-party services we use',
    list: [
      { bold: 'Supabase:', text: 'authentication only. We never see your password.' },
      { bold: 'AWS:', text: 'application hosting, database, and Lambda compute. Mumbai region.' },
      { bold: 'Dodo Payments:', text: 'subscription checkout and recurring billing. Card details are stored at Dodo, not on our servers.' },
      { bold: 'Anthropic (Claude):', text: 'AI-generated journal insights. Only the trade context you choose to analyze is sent — never bulk-export of your data.' },
      { bold: 'Sentry (EU region):', text: 'crash and error reporting. We strip query strings and skip console breadcrumbs to avoid leaking session tokens or P&L.' },
    ],
  },
  {
    title: 'We don\'t sell your data',
    body:
      "TradeGuardX makes money from subscriptions, not from selling user data. Your trade history, rules, and behavior patterns are not aggregated, anonymized, or sold to anyone. They are yours.",
  },
  {
    title: 'Account deletion',
    body:
      "Email support@tradeguardx.com from your account email and we'll permanently delete your profile, trading accounts, rules, trade history, and authentication record within 30 days. Backups containing your data are purged within 90 days of deletion. The deletion is irreversible — export your data first if you want a copy.",
  },
  {
    title: 'Vulnerability disclosure',
    body:
      "If you discover a security issue, please email security@tradeguardx.com with the details. We'll acknowledge within 48 hours, work with you privately to confirm the issue, fix it, and credit you (if you'd like) once a patch is deployed. We don't currently run a paid bug bounty but we genuinely appreciate responsible disclosure.",
  },
  {
    title: 'Open questions',
    body:
      "If something here is unclear or you have a specific concern about how your data is handled, email support@tradeguardx.com — we'll answer honestly.",
  },
];

export default function SecurityPage() {
  useSEO({
    title: 'Security & Data Handling',
    description: 'How TradeGuardX handles your data — what we collect, where it lives, who can see it, and how to delete it.',
    url: 'https://tradeguardx.com/security',
  });

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.05), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-24">
        <header className="mb-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Security</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Security & data handling
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Plain-language answers to the question every trader asks before installing a Chrome extension that watches their broker tab: <em>what does it actually do with my data?</em>
          </p>
        </header>

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
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent/60" />
                      <span>
                        {item.bold && <strong className="text-slate-200">{item.bold} </strong>}
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          ))}
        </div>

        <div
          className="mt-14 rounded-2xl border p-6 text-center"
          style={{
            borderColor: 'rgba(0,212,170,0.20)',
            backgroundColor: 'rgba(0,212,170,0.04)',
          }}
        >
          <p className="text-sm font-semibold text-white">Security questions?</p>
          <p className="mt-1.5 text-sm text-slate-400">
            Reach us at{' '}
            <a href="mailto:security@tradeguardx.com" className="text-accent hover:underline">
              security@tradeguardx.com
            </a>{' '}
            or for general support,{' '}
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
