import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const sections = [
  {
    title: '1. Introduction',
    content: 'TradeGuardX ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our browser extension, web application, and related services. Please read this policy carefully.',
  },
  {
    title: '2. Information We Collect',
    content: 'We collect the following types of information:',
    list: [
      { bold: 'Account information:', text: 'Email address and authentication credentials when you create an account. Authentication is handled by Supabase; we do not store your password directly.' },
      { bold: 'Trading account metadata:', text: 'Display name, prop firm or broker identifier, equity mode (live or funded), starting balance, current balance, account currency, and timezone for the trading accounts you add.' },
      { bold: 'Trade events:', text: 'Open, modify, and close events captured by the browser extension on supported broker tabs — symbol, side, quantity, entry/exit prices, stop loss, take profit, P&L, and timestamps.' },
      { bold: 'Risk rule configuration:', text: 'The risk rules you configure (daily loss limits, per-trade risk, hedging prevention, max trades per day, etc.) and their parameters.' },
      { bold: 'Pairing and session tokens:', text: 'When you pair the browser extension with your account, we issue a session token that the extension stores in your browser\'s local storage and sends to our API as proof of authorization.' },
      { bold: 'Broker host:', text: 'The hostname of the broker your trading account is paired to (e.g., my.exness.com). Used by the extension to determine which page to monitor and by our backend to scope rule evaluation.' },
      { bold: 'Subscription and payment information:', text: 'Subscription tier and billing identifiers. Payment card details are processed by Dodo Payments and never stored on our servers.' },
      { bold: 'Technical data:', text: 'Browser type, extension version, and device information necessary for the service to function.' },
    ],
  },
  {
    title: '3. Browser Extension — Data Practices',
    content: 'The TradeGuardX Chrome extension is scoped to a defined list of supported broker domains declared in its manifest. On other websites it does not load its monitoring scripts. On supported broker tabs:',
    list: [
      { text: 'It reads the page DOM to detect Buy/Sell buttons, open positions, and order parameters needed to evaluate your configured risk rules.' },
      { text: 'It does not read or transmit page content unrelated to trading (account numbers, personal messages on the broker site, etc.).' },
      { text: 'It only activates on the broker hostname your trading account is currently paired to. On other supported brokers, the extension stays dormant until you pair an account on that broker.' },
      { text: 'It stores configuration, the pairing session token, broker selectors, and a small ring-buffer of recent trades in chrome.storage.local. This data lives only in your browser unless you sync it to our backend by trading.' },
      { text: 'When you trade, it sends trade events and account snapshots to our API so they appear in your journal and so server-side rules can be evaluated across devices.' },
    ],
  },
  {
    title: '4. What the Extension Does and Does Not Do',
    content: 'To set clear expectations about the scope of the browser extension:',
    list: [
      { text: 'The extension does not execute trades, modify orders, or interact with broker APIs. It only observes trading activity and enforces user-defined rules within the browser interface.' },
      { text: 'All executable code used by the extension is bundled within the extension package. No external scripts are dynamically loaded or executed at runtime.' },
      { text: 'The extension only runs on explicitly supported broker domains listed in the extension manifest. It does not access all websites or any site outside that list.' },
    ],
  },
  {
    title: '5. Error Reporting',
    content: 'To diagnose crashes and bugs, the extension and web application send error reports to Sentry (sentry.io). Reports are stored in Sentry\'s EU region (ingest.de.sentry.io). Each report includes:',
    list: [
      { text: 'A JavaScript stack trace of the error.' },
      { text: 'The extension version and surface (popup or content script).' },
      { text: 'The broker hostname the error occurred on (e.g., my.exness.com), so we can isolate broker-specific regressions.' },
      { text: 'Click and navigation breadcrumbs leading up to the error.' },
    ],
    afterList: 'We do not send console log breadcrumbs (which can include account IDs, P&L, or session tokens that brokers log to console), and we strip query strings from any URLs in the report. Error reporting only initializes on broker tabs the user has paired; the SDK is loaded but stays inactive on unpaired sites.',
  },
  {
    title: '6. How We Use Your Information',
    content: 'We use collected information to:',
    list: [
      { text: 'Provide, maintain, and improve our services' },
      { text: 'Evaluate your risk rules against your trades and notify you of violations' },
      { text: 'Generate AI insights, narratives, and behavior tags for trades you save to your journal (uses the Anthropic API)' },
      { text: 'Process subscription payments and send related communications' },
      { text: 'Send you updates, security alerts, and support messages' },
      { text: 'Respond to your requests and comply with legal obligations' },
      { text: 'Diagnose bugs and crashes via aggregated error reports' },
    ],
  },
  {
    title: '7. Data Storage and Security',
    content: 'We implement appropriate technical and organizational measures to protect your personal data. Account data is stored in our PostgreSQL database hosted on AWS. Extension-only data (session token, selector cache, ring-buffer of recent trades) is stored locally in your browser via chrome.storage.local. We do not sell your personal information to third parties.',
  },
  {
    title: '8. Third-Party Services',
    content: 'TradeGuardX integrates with the following third parties. Their handling of your information is governed by their respective privacy policies:',
    list: [
      { bold: 'Supabase:', text: 'Authentication and user identity.' },
      { bold: 'AWS:', text: 'Application hosting and database storage.' },
      { bold: 'Dodo Payments:', text: 'Subscription checkout and payment processing.' },
      { bold: 'Sentry (EU region):', text: 'Crash and error reporting (see section 4).' },
      { bold: 'Anthropic:', text: 'AI generation for trade narratives, behavior tags, and journal insights. Only the trade context you choose to analyze is sent.' },
    ],
  },
  {
    title: '9. Your Rights',
    content: 'Depending on your location, you may have the right to access, correct, delete, or port your personal data, and to object to or restrict certain processing. You can disconnect the browser extension from your account at any time from the extension popup, which revokes its session token. To delete your account or exercise other rights, contact us using the details below.',
  },
  {
    title: '10. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the "Last updated" date. Your continued use of the service after changes constitutes acceptance.',
  },
  {
    title: '11. Contact Us',
    content: 'For questions about this Privacy Policy or our data practices, contact us at:',
    email: 'privacy@tradeguardx.com',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pt-28 pb-24 px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto relative">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-12">
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">Legal</span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.03 }}
              className="rounded-2xl glass p-6 md:p-8"
            >
              <h2 className="font-display text-lg font-semibold text-white mb-3">{section.title}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{section.content}</p>
              {section.list && (
                <ul className="mt-4 space-y-2.5">
                  {section.list.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-slate-400 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent/50 mt-2 flex-shrink-0" />
                      <span>{item.bold && <strong className="text-slate-300">{item.bold} </strong>}{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.afterList && (
                <p className="text-slate-400 text-sm leading-relaxed mt-4">{section.afterList}</p>
              )}
              {section.email && (
                <a href={`mailto:${section.email}`} className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors text-sm font-medium mt-3">
                  {section.email}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
