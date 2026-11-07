import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

/** A real date, not new Date(). Bump by hand, only when the text below changes. */
const LAST_UPDATED = 'November 7, 2026';

const EMAIL = 'support@tradeguardx.com';
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent('Data deletion request')}`;

const sections = [
  {
    title: '1. How to Request Deletion',
    content: 'Email us from the address you use to sign in to TradeGuardX, with the subject line "Data deletion request". Sending it from that address is how we confirm the account is yours. If you no longer have access to it, tell us in the email and we will ask you for another way to verify.',
    email: true,
  },
  {
    title: '2. What Happens Next',
    content: 'We confirm your request by email, then:',
    list: [
      'Delete your exchange API keys and stop watching your trading accounts',
      'Cancel any active subscription, so you are not charged again',
      'Keep your trade history and tax records for 30 days so you can export them, then delete them',
    ],
    note: 'If a lock is running on your account, we start your deletion when the lock ends.',
  },
  {
    title: '3. What We Delete',
    content: 'Once the 30 days are over, we delete the personal data tied to your account:',
    list: [
      'Your profile and sign-in details',
      'Your trading accounts, rules and lock history',
      'Your trades, journal notes and AI analysis of your trades',
      'Your tax records and alert settings, including a connected Telegram account',
    ],
  },
  {
    title: '4. What We May Keep',
    content: 'We keep payment and invoice records for as long as the law requires. Website analytics events delete themselves within 120 days.',
  },
  {
    title: '5. Your Exchange Key',
    content: 'We can only delete our copy of your API key. To cancel the key itself, delete it in your exchange account as well.',
  },
];

export default function DataDeletionPage() {
  useSEO({
    title: 'Data Deletion',
    description: 'How to ask TradeGuardX to delete your account and personal data: who to email, what happens next, and what we delete.',
    url: 'https://tradeguardx.com/data-deletion',
  });

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 relative overflow-x-clip">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">Data Deletion</h1>
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
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.note && (
                <p className="text-slate-500 text-sm mt-3 italic">{section.note}</p>
              )}
              {section.email && (
                <a href={MAILTO} className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors text-sm font-medium mt-3">
                  {EMAIL}
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
