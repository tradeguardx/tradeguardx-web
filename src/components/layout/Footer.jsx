import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const links = {
  product: [
    { label: 'Features', to: { pathname: '/', hash: 'features' } },
    { label: 'How it Works', to: { pathname: '/', hash: 'how-it-works' } },
    { label: 'Web & extension', to: { pathname: '/', hash: 'ecosystem' } },
    { label: "Who it's for", to: { pathname: '/', hash: 'who-its-for' } },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Preview', to: { pathname: '/', hash: 'preview' } },
  ],
  resources: [
    { label: 'Support', to: '/support' },
    { label: 'Beta program', to: '/beta-traders' },
    { label: 'Email Us', to: 'mailto:support@tradeguardx.com' },
    { label: 'FAQ', to: { pathname: '/', hash: 'faq' } },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms & Conditions', to: '/terms' },
    { label: 'Refund Policy', to: '/refund' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-surface-950">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand column */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="col-span-2 md:col-span-1"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-display font-bold text-white">TradeGuardX</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Automated trade protection for serious traders. Browser extension that enforces your risk rules in real-time.
            </p>
          </motion.div>

          {/* Link columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {title}
              </h4>
              <ul className="space-y-3">
                {items.map((link) => (
                  <li key={link.label}>
                    {typeof link.to === 'string' && link.to.startsWith('mailto:') ? (
                      <a
                        href={link.to}
                        className="text-slate-500 hover:text-slate-200 transition-colors text-sm"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className="text-slate-500 hover:text-slate-200 transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            &copy; {new Date().getFullYear()} TradeGuardX. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs">
            TradeGuardX is not affiliated with any broker or prop firm.
          </p>
        </div>
      </div>
    </footer>
  );
}
