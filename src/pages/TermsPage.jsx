import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const sections = [
  {
    title: '1. Agreement to Terms',
    content: 'By accessing or using TradeGuardX ("Service"), including our browser extension, website, and dashboard, you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Service.',
  },
  {
    title: '2. Description of Service',
    content: 'TradeGuardX is a browser extension and related web services that help traders monitor and enforce risk rules on supported trading platforms. We do not provide trading, investment, or financial advice. The Service is provided "as is" for informational and risk-management assistance only.',
  },
  {
    title: '3. Eligibility',
    content: 'You must be at least 18 years old and capable of forming a binding contract to use the Service. By using the Service, you represent that you meet these requirements and that you will use the Service in compliance with all applicable laws and regulations.',
  },
  {
    title: '4. Account and Security',
    content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must notify us promptly of any unauthorized use. We are not liable for losses arising from unauthorized access due to your failure to secure your account.',
  },
  {
    title: '5. Acceptable Use',
    content: 'You agree not to:',
    list: [
      'Use the Service for any illegal purpose or in violation of any laws',
      'Reverse engineer, decompile, or attempt to extract source code of the extension or our systems',
      'Resell, sublicense, or commercially exploit the Service without our written permission',
      'Interfere with or disrupt the Service or servers/networks connected to the Service',
      'Use the Service in any way that could harm us, other users, or third parties',
    ],
  },
  {
    title: '6. Subscription and Payment',
    content: 'Paid plans are billed in accordance with the pricing displayed at the time of purchase. Fees are non-refundable except as stated in our Refund Policy. We may change pricing with reasonable notice; continued use after a price change constitutes acceptance.',
  },
  {
    title: '7. Disclaimer of Warranties',
    content: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT IT WILL CORRECTLY DETECT OR ENFORCE ALL TRADING RULES. YOU USE THE SERVICE AT YOUR OWN RISK.',
    highlight: true,
  },
  {
    title: '8. Limitation of Liability',
    content: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRADEGUARDX AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR TRADING LOSSES, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.',
    highlight: true,
  },
  {
    title: '9. Termination',
    content: 'We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason. You may stop using the Service at any time. Upon termination, your right to use the Service ceases immediately.',
  },
  {
    title: '10. Changes',
    content: 'We may modify these Terms from time to time. We will post the updated Terms on this page and update the "Last updated" date. Material changes may be communicated via email or in-product notice. Your continued use of the Service after changes constitutes acceptance of the revised Terms.',
  },
  {
    title: '11. Contact',
    content: 'For questions about these Terms, contact us at:',
    email: 'legal@tradeguardx.com',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-28 pb-24 px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">Terms and Conditions</h1>
          <p className="text-slate-500 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.03 }}
              className={`rounded-2xl p-6 md:p-8 ${section.highlight ? 'glass border-amber-500/10' : 'glass'}`}
            >
              <h2 className="font-display text-lg font-semibold text-white mb-3">{section.title}</h2>
              <p className={`text-sm leading-relaxed ${section.highlight ? 'text-slate-300' : 'text-slate-400'}`}>{section.content}</p>
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
