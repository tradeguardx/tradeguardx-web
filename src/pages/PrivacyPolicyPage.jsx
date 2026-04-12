import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const sections = [
  {
    title: '1. Introduction',
    content: 'TradeGuardX ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our browser extension and related services. Please read this policy carefully.',
  },
  {
    title: '2. Information We Collect',
    content: 'We may collect the following types of information:',
    list: [
      { bold: 'Account information:', text: 'Email address, name, and password when you create an account.' },
      { bold: 'Usage data:', text: 'How you use the extension, including rule settings and trade-related data that you choose to sync.' },
      { bold: 'Technical data:', text: 'Browser type, extension version, and device information necessary for the service to function.' },
      { bold: 'Payment information:', text: 'Processed by third-party payment providers; we do not store full payment details.' },
    ],
  },
  {
    title: '3. How We Use Your Information',
    content: 'We use collected information to:',
    list: [
      { text: 'Provide, maintain, and improve our services' },
      { text: 'Process transactions and send related communications' },
      { text: 'Send you updates, security alerts, and support messages' },
      { text: 'Respond to your requests and comply with legal obligations' },
      { text: 'Analyze usage to improve our product (in aggregate or anonymized form where possible)' },
    ],
  },
  {
    title: '4. Data Storage and Security',
    content: 'We implement appropriate technical and organizational measures to protect your personal data. Data may be stored on secure servers and, for extension functionality, locally in your browser. We do not sell your personal information to third parties.',
  },
  {
    title: '5. Third-Party Services',
    content: 'Our service may integrate with or link to third-party services (e.g. payment processors, analytics). Their use of your information is governed by their respective privacy policies. We encourage you to review those policies.',
  },
  {
    title: '6. Your Rights',
    content: 'Depending on your location, you may have the right to access, correct, delete, or port your personal data, and to object to or restrict certain processing. To exercise these rights, contact us using the details below.',
  },
  {
    title: '7. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the "Last updated" date. Your continued use of the service after changes constitutes acceptance.',
  },
  {
    title: '8. Contact Us',
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
