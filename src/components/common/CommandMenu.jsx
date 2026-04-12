import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

const COMMANDS = [
  { label: 'Home', path: '/', keywords: 'landing hero tradeguardx' },
  { label: 'Pricing', path: '/pricing', keywords: 'plans pro free' },
  { label: 'Sign in', path: '/login', keywords: 'login auth account' },
  { label: 'Sign up', path: '/signup', keywords: 'register create account' },
  { label: 'Support', path: '/support', keywords: 'help contact' },
  { label: 'Beta program', path: '/beta-traders', keywords: 'research feedback video test free month' },
  { label: 'Privacy Policy', path: '/privacy', keywords: 'privacy legal policy' },
  { label: 'Terms', path: '/terms', keywords: 'terms legal' },
  { label: 'Refund Policy', path: '/refund', keywords: 'refund policy legal' },
  { label: 'Dashboard Overview', path: '/dashboard/overview', keywords: 'dashboard stats home' },
  { label: 'Risk rules', path: '/dashboard/rules', keywords: 'rules terminal risk protection limits prop' },
  { label: 'Trade journal', path: '/dashboard/journal', keywords: 'journal analytics equity pnl' },
  { label: 'All trades', path: '/dashboard/trades', keywords: 'trades history sync extension' },
  { label: 'Browser extension', path: '/dashboard/install-extension', keywords: 'install extension setup pair' },
  { label: 'Pairing', path: '/dashboard/pairing', keywords: 'pairing unique code extension connect' },
  { label: 'Trading accounts', path: '/dashboard/account/trading', keywords: 'accounts pairing prop platform size' },
  { label: 'Plans & billing', path: '/dashboard/account/billing', keywords: 'subscription payment upgrade invoice' },
  { label: 'Account home', path: '/dashboard/account', keywords: 'account profile summary plan' },
];

export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((item) =>
      `${item.label} ${item.path} ${item.keywords}`.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const targetTag = e.target?.tagName?.toLowerCase();
      const isTypingContext =
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        e.target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (!open) return;

      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter' && !isTypingContext) {
        e.preventDefault();
        const next = filtered[activeIndex];
        if (next) {
          navigate(next.path);
          setOpen(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, filtered, navigate, open]);

  useEffect(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, [location.pathname]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[70] hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.1] bg-surface-900/75 backdrop-blur-lg text-slate-300 hover:text-white hover:border-accent/30 transition-all"
        aria-label="Open command menu"
      >
        <span className="text-xs font-medium">Command</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">⌘K</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
              aria-label="Close command menu backdrop"
            />
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.18 }}
              className="fixed top-[14vh] left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-2xl rounded-2xl border border-white/[0.1] bg-surface-900/95 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Command menu"
            >
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages... (Esc to close)"
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="max-h-[52vh] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-slate-500">No results found.</div>
                ) : (
                  filtered.map((item, idx) => {
                    const active = idx === activeIndex;
                    return (
                      <button
                        key={`${item.label}-${item.path}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => {
                          navigate(item.path);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                          active ? 'bg-accent/15 text-white' : 'text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.path}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
