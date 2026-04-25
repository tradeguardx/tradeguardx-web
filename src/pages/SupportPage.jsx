import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { motion } from 'framer-motion';
import { useToast } from '../components/common/ToastProvider';

const contactMethods = [
  {
    title: 'Email Support',
    description: 'Get a response within 24 hours for any question about billing, technical issues, or your account.',
    action: 'support@tradeguardx.com',
    href: 'mailto:support@tradeguardx.com',
    copyValue: 'support@tradeguardx.com',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    gradient: 'from-accent/20 to-emerald-500/10',
  },
  {
    title: 'Feature Requests',
    description: 'Have an idea that would make TradeGuardX better? We love hearing from traders.',
    action: 'Send a request',
    href: 'mailto:support@tradeguardx.com?subject=Feature%20Request',
    copyValue: 'support@tradeguardx.com?subject=Feature Request',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    gradient: 'from-amber-500/15 to-orange-500/10',
  },
];

const helpItems = [
  'General questions about how TradeGuardX works',
  'Billing or subscription issues',
  'Technical bugs or error reports',
  'Platform compatibility questions',
  'Feature requests and feedback',
];

const includeItems = [
  'Your TradeGuardX account email',
  'Browser name and version',
  'Steps to reproduce the issue',
  'Screenshots or recordings (if helpful)',
];

export default function SupportPage() {
  useSEO({
    title: 'Support',
    description: 'Get help with TradeGuardX — setup guides, FAQs, billing questions, and direct email support.',
    url: 'https://tradeguardx.com/support',
  });
  const toast = useToast();

  const copySupportValue = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied', 'Support contact copied to clipboard.');
    } catch {
      toast.error('Copy failed', 'Clipboard access is unavailable on this browser.');
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-16"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">Support</span>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">How can we help?</h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Got a question, bug report, or feature idea? We&apos;re here to help you get the most out of TradeGuardX.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-16 rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.08] to-emerald-500/[0.04] p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="min-w-0">
              <span className="inline-block text-accent text-xs font-semibold tracking-wider uppercase mb-2">
                Beta program
              </span>
              <h2 className="font-display text-xl md:text-2xl font-semibold text-white mb-2">
                Help us test and shape the product
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                Sign up for feedback sessions and optional video calls. Participants who help us test receive{' '}
                <span className="text-slate-300">one month free</span> on TradeGuardX as a thank-you.
              </p>
            </div>
            <Link
              to="/beta-traders"
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm font-semibold text-surface-950 shadow-lg shadow-accent/20 transition hover:bg-accent-hover"
            >
              Open beta registration
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* Contact cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {contactMethods.map((method, i) => (
            <motion.div
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              className="group rounded-3xl glass p-7 glass-card-hover"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${method.gradient} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300`}>
                {method.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">{method.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{method.description}</p>
              <div className="flex items-center gap-3">
                <a
                  href={method.href}
                  className="text-accent font-medium text-sm inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all"
                >
                  {method.action}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => copySupportValue(method.copyValue)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-white/[0.1] text-slate-300 hover:text-white hover:border-accent/30 transition-colors"
                >
                  Copy
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Help sections */}
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-3xl glass p-7"
          >
            <h3 className="font-display text-lg font-semibold text-white mb-5">We can help with</h3>
            <ul className="space-y-3">
              {helpItems.map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-400 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                    <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl glass p-7"
          >
            <h3 className="font-display text-lg font-semibold text-white mb-5">What to include</h3>
            <p className="text-slate-500 text-sm mb-4">To help us respond faster, please include:</p>
            <ul className="space-y-3">
              {includeItems.map((item, i) => (
                <li key={item} className="flex items-center gap-3 text-slate-400 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
