import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', to: { pathname: '/', hash: 'features' } },
    { label: 'How it Works', to: { pathname: '/', hash: 'how-it-works' } },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Docs', to: '/help' },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-surface-950/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
      style={{ top: 'var(--tg-promo-h, 0px)' }}
    >
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition-colors">
            <svg className="w-4.5 h-4.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-lg font-display font-bold text-white">TradeGuardX</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200 text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-accent text-surface-950 font-semibold text-sm hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/20"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                to="/pricing"
                className="px-5 py-2.5 rounded-xl bg-accent text-surface-950 font-semibold text-sm hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/20"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.06] bg-surface-950/95 backdrop-blur-2xl px-6 py-5 space-y-1"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="block px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all font-medium"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/[0.06] mt-3">
              {user ? (
                <Link
                  to="/dashboard"
                  className="block px-4 py-3 rounded-xl bg-accent text-surface-950 font-semibold text-center"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-3 text-slate-300 hover:text-white" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                  <Link
                    to="/pricing"
                    className="block px-4 py-3 rounded-xl bg-accent text-surface-950 font-semibold text-center mt-2"
                    onClick={() => setOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
