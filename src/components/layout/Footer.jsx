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
    { label: 'Email Us', to: 'mailto:support@tradeguardx.com' },
    { label: 'FAQ', to: { pathname: '/', hash: 'faq' } },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms & Conditions', to: '/terms' },
    { label: 'Refund Policy', to: '/refund' },
  ],
};

const socials = [
  {
    label: 'X (Twitter)',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Discord',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.789 13.789 0 0 0-.608 1.247 18.4 18.4 0 0 0-5.487 0 12.65 12.65 0 0 0-.617-1.247.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
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
                {items.map((link) => (
                  <li key={link.label}>
                    {typeof link.to === 'string' && link.to.startsWith('mailto:') ? (
                      <a
                        href={link.to}
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
                ))}
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
