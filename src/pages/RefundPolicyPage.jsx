import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

/**
 * A real date, not new Date(). This rendered "Last updated: <today>" on every
 * page load, so the document claimed to have been revised daily and a reader
 * could never tell when the terms actually changed. Bump this by hand, only
 * when the text above it changes.
 */
const LAST_UPDATED = 'November 9, 2026';

const sections = [
  {
    title: '1. Overview',
    content: 'TradeGuardX offers a paid Pro subscription, billed monthly, quarterly or yearly, and a 3-day Tester pass: everything Pro has for 3 days, paid once, with nothing that renews. The Tester pass is how to try the whole product before you commit to a plan. Because of that, we do not offer refunds once a payment has been taken.',
  },
  {
    title: '2. No Refunds',
    content: 'All subscription payments are final and non-refundable. This includes:',
    list: [
      'A Tester pass, including one that is only partly used',
      'Your first Pro payment, which is taken in full on the day you start',
      'Renewals, on any billing interval',
      'Unused time left in a billing period',
      'A change of mind, or not using the service',
      'Trading results, including losses from a lock or a closed position',
      'Accounts terminated for breaking our Terms and Conditions',
    ],
  },
  {
    title: '3. Tester Pass and Cancellation',
    content: 'A Tester pass is a single payment. It has no AutoPay and never renews, so there is nothing to cancel: when its 3 days end, you choose a paid plan or your access stops. Pro is charged in full on the day you start, then renews by AutoPay. You can cancel Pro at any time from your account. Cancelling stops future charges, and you keep access until the end of the period you have paid for. If you started a free trial before November 9, 2026, it runs to its end date on the terms you signed up under.',
  },
  {
    title: '4. Billing Errors',
    content: 'We will correct a charge that was our mistake or a billing error, and we will refund any amount the law requires us to. This includes:',
    list: [
      'Being charged twice for the same period',
      'Being charged after your cancellation took effect',
    ],
    note: 'Payments made before November 6, 2026 stay under the 7-day refund terms that applied when you paid.',
  },
  {
    title: '5. How to Report a Billing Error',
    content: 'Email support@tradeguardx.com with the subject line "Billing Error" and include your account email and the date of the charge. We will respond within 5 business days. If a refund is due, it goes to the original payment method within 7-10 business days.',
    email: 'support@tradeguardx.com',
  },
  {
    title: '6. Changes to This Policy',
    content: 'We may update this Refund Policy from time to time. The "Last updated" date at the top reflects the latest version. Continued use of paid services after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '7. Contact',
    content: 'For questions about this policy:',
    email: 'support@tradeguardx.com',
  },
];

export default function RefundPolicyPage() {
  useSEO({
    title: 'Refund Policy',
    description: 'Try TradeGuardX with a 3-day Tester pass before you commit, so payments are non-refundable. How cancelling works, and what happens if there is a billing error.',
    url: 'https://tradeguardx.com/refund',
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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">Refund Policy</h1>
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
