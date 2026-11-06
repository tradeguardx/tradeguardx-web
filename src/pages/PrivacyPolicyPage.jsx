import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

/**
 * A real date, not new Date(). This rendered "Last updated: <today>" on every
 * page load, so the document claimed to have been revised daily and a reader
 * could never tell when the terms actually changed. Bump this by hand, only
 * when the text above it changes.
 */
const LAST_UPDATED = 'November 6, 2026';

const sections = [
  {
    title: '1. Introduction',
    content: 'TradeGuardX ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, web application and server-side risk engine. Please read this policy carefully.',
  },
  {
    title: '2. Information We Collect',
    content: 'We collect the following types of information:',
    list: [
      { bold: 'Account information:', text: 'Email address and authentication credentials when you create an account. Authentication is handled by Supabase; we do not store your password directly. If you sign in with Google, we receive your basic Google profile (name and email) via that sign-in.' },
      { bold: 'Trading account metadata:', text: 'Display name, exchange or broker identifier, equity mode, starting balance, current balance, account currency, and timezone for the trading accounts you add.' },
      { bold: 'Exchange API credentials:', text: 'For exchange and broker accounts, the API key and secret you provide so the kill switch can cancel orders and close positions on your behalf. We never use them to open a position, add to one, or change an order. They are encrypted at rest using AWS KMS and used only to operate the Service for your account. We never request withdrawal or transfer permission; we never receive your exchange login password or 2FA codes.' },
      { bold: 'Trade events:', text: 'Open, modify, and close events for your trades — symbol, side, quantity, entry/exit prices, stop loss, take profit, P&L, and timestamps. These are received server-side through your exchange or broker API connection.' },
      { bold: 'Risk rule configuration:', text: 'The risk rules you configure (daily loss limits, per-trade risk, max trades per day, cooldowns, etc.) and their parameters.' },
      { bold: 'Subscription and payment information:', text: 'Subscription tier and billing identifiers. Payment card details are processed by Dodo Payments and never stored on our servers.' },
      { bold: 'Notification preferences:', text: 'If you enable alerts, the email address or Telegram chat you connect so we can send trade and breach notifications.' },
      { bold: 'Technical and usage data:', text: 'Browser type, device type, and website usage analytics described in the next section.' },
    ],
  },
  {
    title: '3. Analytics, Cookies & Marketing Attribution',
    content: 'When you visit our website we collect usage analytics to understand traffic and improve the product. This includes:',
    list: [
      { text: 'The pages you view and the order you view them in, the website that referred you, your device type, and approximate country.' },
      { text: 'A first-party visitor identifier and marketing attribution (including UTM campaign tags such as utm_source and utm_campaign) stored in your browser\'s local storage. If you create an account, the marketing source that first brought you is saved to your profile so we can measure which channels bring users.' },
      { text: 'Your IP address is used only to derive an approximate country and a salted, one-way hash that lets us count distinct networks. We do not store your raw IP address.' },
      { text: 'For signed-in users, product events such as sign-up, login, adding an account, and starting checkout — so we can see where new users get stuck.' },
    ],
    afterList: 'We use Vercel Web Analytics (a privacy-focused, cookie-free provider) and our own first-party analytics service hosted on AWS. We use browser local storage rather than advertising cookies for these identifiers and for essential functions such as keeping you signed in and remembering dismissed banners. Raw analytics events are retained for up to 120 days; aggregated, non-identifying counts are kept longer. We do not use third-party advertising or cross-site tracking cookies.',
  },
  {
    title: '4. Error Reporting',
    content: 'To diagnose crashes and bugs, the web application sends error reports to Sentry (sentry.io). Reports are stored in Sentry\'s EU region (ingest.de.sentry.io). Each report can include:',
    list: [
      { text: 'A JavaScript stack trace of the error.' },
      { text: 'Your browser, device type and the page address where the error occurred.' },
      { text: 'Clicks, navigation and console messages leading up to the error.' },
      { text: 'Your account ID and email address, if you are signed in, so we can follow up on a problem affecting your account.' },
    ],
  },
  {
    title: '5. How We Use Your Information',
    content: 'We use collected information to:',
    list: [
      { text: 'Provide, maintain, and improve our services' },
      { text: 'Evaluate your risk rules against your trades and notify you of violations' },
      { text: 'Generate AI-written summaries of your past trades and behaviour tags for your journal (uses the Google Gemini API). These describe what happened and are not advice' },
      { text: 'Process subscription payments and send related communications' },
      { text: 'Send you updates, security alerts, and support messages' },
      { text: 'Respond to your requests and comply with legal obligations' },
      { text: 'Diagnose bugs and crashes via aggregated error reports' },
      { text: 'Understand website traffic and measure which marketing channels bring users, using the analytics described in section 3' },
    ],
  },
  {
    title: '6. Data Storage, Security & Retention',
    content: 'We implement appropriate technical and organizational measures to protect your data. Account and trade data is stored in our PostgreSQL database hosted on AWS. Exchange API credentials are encrypted at rest using AWS KMS. Website analytics events are stored in AWS DynamoDB and automatically deleted after 120 days; aggregated counts are retained longer. We do not sell your personal information to third parties.',
  },
  {
    title: '7. Third-Party Services',
    content: 'TradeGuardX integrates with the following third parties. Their handling of your information is governed by their respective privacy policies:',
    list: [
      { bold: 'Supabase:', text: 'Authentication and user identity.' },
      { bold: 'Google:', text: 'Optional "Sign in with Google" authentication — used only if you choose that sign-in method. Google Gemini also generates AI trade summaries and answers the in-app support chat. For a summary, it receives the details and timeline of the trade you open, with behaviour tags worked out from your recent trades. For the support chat, it receives your question, your account state and your recent enforcement events.' },
      { bold: 'AWS:', text: 'Application hosting, database, encrypted credential storage (KMS), and our first-party analytics.' },
      { bold: 'Vercel:', text: 'Website hosting and privacy-focused, cookie-free web analytics.' },
      { bold: 'Dodo Payments:', text: 'Subscription checkout and payment processing.' },
      { bold: 'Telegram:', text: 'Optional trade and breach notifications, if you connect a Telegram account for alerts.' },
      { bold: 'Sentry (EU region):', text: 'Crash and error reporting (see section 4).' },
    ],
  },
  {
    title: '8. Your Rights',
    content: 'Depending on your location, you may have the right to access, correct, delete, or port your personal data, and to object to or restrict certain processing. You can remove an exchange or broker API connection, which stops further data collection from that source, except while a lockout you started is still running. To delete your account or exercise other rights, contact us using the details below.',
  },
  {
    title: '9. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the "Last updated" date. Your continued use of the service after changes constitutes acceptance.',
  },
  {
    title: '10. Contact Us',
    content: 'For questions about this Privacy Policy or our data practices, contact us at:',
    email: 'privacy@tradeguardx.com',
  },
];

export default function PrivacyPolicyPage() {
  useSEO({
    title: 'Privacy Policy',
    description: 'What TradeGuardX collects, where it lives, who can see it, and how your exchange API keys are stored. Written to be read, not to be agreed to blindly.',
    url: 'https://tradeguardx.com/privacy',
  });

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 relative overflow-x-clip">
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
          <p className="text-slate-500 text-sm">Last updated: {LAST_UPDATED}</p>
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
