import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CHROME_STORE_URL } from '../../lib/extension';

const links = {
  product: [
    { label: 'Features', to: { pathname: '/', hash: 'features' } },
    { label: 'How it Works', to: { pathname: '/', hash: 'how-it-works' } },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Roadmap', to: '/roadmap' },
    { label: 'FAQ', to: { pathname: '/', hash: 'faq' } },
  ],
  resources: [
    { label: 'Install for Chrome', to: CHROME_STORE_URL },
    { label: 'Docs', to: '/help' },
    { label: 'Support', to: '/support' },
    { label: 'Email Us', to: 'mailto:support@tradeguardx.com' },
    { label: 'Partner program', to: '/partner-with-us' },
    { label: 'Beta program', to: '/beta-traders' },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms & Conditions', to: '/terms' },
    { label: 'Refund Policy', to: '/refund' },
    { label: 'Risk Disclosure', to: '/risk-disclosure' },
    { label: 'Security', to: '/security' },
  ],
};

const socials = [
  {
    label: 'X (Twitter)',
    href: 'https://x.com/TradeguardX',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/tradeguardx/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@TradeGuardX',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative">
      {/* Top callout band — small CTA strip above the link grid. */}
      <div className="border-y border-white/[0.05] bg-white/[0.01]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-6 py-10 md:flex-row md:items-center md:justify-between md:py-8"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Ready when you are
            </p>
            <h3 className="mt-2 font-display text-xl font-bold text-white md:text-2xl">
              Stop the next mistake before it happens.
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-[#0a0c10] shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-[0.98]"
            >
              Start free
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/support"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/[0.15] hover:text-white"
            >
              Talk to us
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Main link grid */}
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
          {/* Brand column */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="col-span-2 md:col-span-1"
          >
            <Link to="/" className="mb-5 inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
                <svg className="h-4.5 w-4.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-display text-base font-bold text-white">TradeGuardX</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">
              Automated trade protection for serious traders. Browser extension
              that enforces your risk rules in real-time.
            </p>
            {/* Status pill */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-semibold text-emerald-300">All systems operational</span>
            </div>
          </motion.div>

          {/* Link columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                {title}
              </h4>
              <ul className="space-y-3.5">
                {items.map((link) => {
                  const isExternal =
                    typeof link.to === 'string' &&
                    (link.to.startsWith('http') || link.to.startsWith('mailto:'));
                  return (
                    <li key={link.label}>
                      {isExternal ? (
                        <a
                          href={link.to}
                          target={link.to.startsWith('http') ? '_blank' : undefined}
                          rel={link.to.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="text-sm text-slate-400 transition-colors hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.to}
                          className="text-sm text-slate-400 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar — copy left, social right */}
        <div className="mt-16 flex flex-col items-start gap-6 border-t border-white/[0.05] pt-8 md:flex-row md:items-center md:justify-between md:gap-4">
          <div>
            <p className="font-mono text-xs text-slate-500">
              &copy; {new Date().getFullYear()} TradeGuardX. All rights reserved.
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              TradeGuardX is not affiliated with any broker or prop firm. Trading
              involves risk — use at your own discretion.
            </p>
          </div>

          {/* Socials */}
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-slate-400 transition hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
