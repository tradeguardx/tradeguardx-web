import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const sections = [
  {
    title: '1. Overview',
    content: 'TradeGuardX offers subscription plans (Pro and Pro+). This Refund Policy explains when and how you may request a refund for paid subscriptions. Our goal is to be fair and transparent.',
  },
  {
    title: '2. Free Plan',
    content: 'The Free plan does not require payment. No refunds apply to the Free plan.',
  },
  {
    title: '3. Refund Eligibility',
    content: 'You may be eligible for a full refund if:',
    list: [
      'You request a refund within 14 days of your initial purchase or renewal.',
      'You have not previously received a refund for the same plan in the past 12 months.',
      'The request is made in good faith (e.g. service did not work as described, technical issues we could not resolve).',
    ],
    note: 'Refunds are issued at our discretion. We may ask for details about your experience to improve our service.',
  },
  {
    title: '4. Non-Refundable Situations',
    content: 'We generally do not offer refunds in the following cases:',
    list: [
      'Requests made more than 14 days after the charge',
      'Partial refunds for unused portions of a subscription period',
      'Change of mind after the 14-day window',
      'Violation of our Terms and Conditions resulting in account termination',
    ],
  },
  {
    title: '5. How to Request a Refund',
    content: 'Send an email to support@tradeguardx.com with the subject line "Refund Request" and include your account email and the date of the charge. We will respond within 5 business days. If approved, refunds are processed to the original payment method within 7-10 business days.',
    email: 'support@tradeguardx.com',
  },
  {
    title: '6. Cancellation',
    content: 'You may cancel your subscription at any time from your account or dashboard. Cancellation stops future charges but does not entitle you to a refund for the current billing period unless you meet the refund eligibility criteria above.',
  },
  {
    title: '7. Changes to This Policy',
    content: 'We may update this Refund Policy from time to time. The "Last updated" date at the top reflects the latest version. Continued use of paid services after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '8. Contact',
    content: 'For refund requests or questions:',
    email: 'support@tradeguardx.com',
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen pt-28 pb-24 px-6 relative">
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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">Refund Policy</h1>
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
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.note && (
                <p className="text-slate-500 text-sm mt-3 italic">{section.note}</p>
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
