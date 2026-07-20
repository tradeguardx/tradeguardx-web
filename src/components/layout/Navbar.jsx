import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { founderTelegramUrl, FOUNDER_TELEGRAM_CONFIGURED } from '../../lib/founderContact';
import { trackCtaClick } from '../../lib/analytics';

function TelegramGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/** Direct line to the founder. Hidden entirely when no handle is configured, so
 *  the nav never ships a dead link. */
function TalkToFounderLink({ mobile = false, onClick }) {
  if (!FOUNDER_TELEGRAM_CONFIGURED) return null;
  const handle = () => {
    try {
      trackCtaClick(mobile ? 'nav_telegram_mobile' : 'nav_telegram');
    } catch {
      /* analytics is best-effort */
    }
    onClick?.();
  };
  return (
    <a
      href={founderTelegramUrl('Hi — I have a question about TradeGuardX.')}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handle}
      className={
        mobile
          ? 'flex items-center gap-2.5 rounded-xl px-4 py-3 font-medium text-slate-300 transition-all hover:bg-white/[0.04] hover:text-white'
          : 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200'
      }
      style={mobile ? undefined : { color: '#5ec2ee' }}
    >
      <TelegramGlyph className={mobile ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
      Talk to founder
    </a>
  );
}

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
    { label: 'How it Works', to: { pathname: '/', hash: 'scenarios' } },
    { label: 'Pricing', to: '/pricing' },
    // Prop-firm page hidden for now — Delta Exchange (crypto) is the launch focus.
    { label: 'Guides', to: '/help' },
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
          <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
          <TalkToFounderLink />
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
                to="/signup"
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
            <TalkToFounderLink mobile onClick={() => setOpen(false)} />
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
                    to="/signup"
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
