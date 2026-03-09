import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const links = {
  product: [
    { label: 'Features', to: '/#features' },
    { label: 'How it works', to: '/#how-it-works' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Preview', to: '/#preview' },
  ],
  resources: [
    { label: 'Documentation', to: '#' },
    { label: 'Contact', to: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms & Conditions', to: '/terms' },
    { label: 'Refund Policy', to: '/refund' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-surface-800 py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-2"
          >
            <span className="text-xl font-bold text-white">TradeGuardX</span>
            <span className="text-slate-500 text-sm">© {new Date().getFullYear()}</span>
          </motion.div>

          <div className="flex flex-wrap gap-8">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2">
                {links.product.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-slate-400 hover:text-white transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Resources</h4>
              <ul className="space-y-2">
                {links.resources.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-slate-400 hover:text-white transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2">
                {links.legal.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-slate-400 hover:text-white transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-12 text-slate-500 text-sm">
          Protect every trade automatically. TradeGuardX is a browser extension for traders who want to enforce risk rules without the stress.
        </p>
      </div>
    </footer>
  );
}
