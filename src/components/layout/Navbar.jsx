import { useState, useEffect } from 'react';
import BrandMark from '../common/BrandMark';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { founderWhatsAppUrl, FOUNDER_WHATSAPP_CONFIGURED } from '../../lib/founderContact';
import { trackCtaClick } from '../../lib/analytics';

function WhatsAppGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#25D366" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/** Direct line to the founder. Hidden entirely when no handle is configured, so
 *  the nav never ships a dead link. */
function TalkToFounderLink({ mobile = false, onClick }) {
  if (!FOUNDER_WHATSAPP_CONFIGURED) return null;
  const handle = () => {
    try {
      trackCtaClick(mobile ? 'nav_whatsapp_mobile' : 'nav_whatsapp');
    } catch {
      /* analytics is best-effort */
    }
    onClick?.();
  };
  return (
    <a
      href={founderWhatsAppUrl('Hi — I have a question about TradeGuardX.')}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handle}
      className={
        mobile
          ? 'flex items-center gap-2.5 rounded-xl px-4 py-3 font-medium text-slate-300 transition-all hover:bg-white/[0.04] hover:text-white'
          : 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap'
      }
      style={mobile ? undefined : { color: '#25D366' }}
      aria-label="Talk to founder on WhatsApp"
      title="Talk to founder"
    >
      <WhatsAppGlyph className={mobile ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
      {/* Icon only between 1024 and 1280px, where the full row does not fit. */}
      <span className={mobile ? undefined : 'hidden xl:inline whitespace-nowrap'}>Talk to founder</span>
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
    // The free revenge report: the no-commitment way in, so it gets a badge.
    { label: 'Revenge report', to: '/revenge-report', badge: 'Free' },
    // Which venues we support is the second question every visitor has, and it
    // used to be answerable only from inside the docs sidebar.
    { label: 'Exchanges', to: '/exchanges' },
    { label: 'Pricing', to: '/pricing' },
    // Prop-firm page hidden for now — Delta Exchange (crypto) is the launch focus.
    { label: 'Guides', to: '/help' },
    { label: 'Blog', to: '/blog' },
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
            <BrandMark />
          </div>
          <span className="text-lg font-display font-bold text-white">TradeGuard<span className="tgx-x">X</span></span>
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="inline-flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200 text-sm font-medium whitespace-nowrap"
            >
              {link.label}
              {link.badge && <NavBadge>{link.badge}</NavBadge>}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
          <TalkToFounderLink />
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="whitespace-nowrap px-5 py-2.5 rounded-xl bg-accent text-surface-950 font-semibold text-sm hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/20"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="whitespace-nowrap px-4 py-2.5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="whitespace-nowrap px-5 py-2.5 rounded-xl bg-accent text-surface-950 font-semibold text-sm hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/20"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="lg:hidden p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
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
            className="lg:hidden border-t border-white/[0.06] bg-surface-950/95 backdrop-blur-2xl px-6 py-5 space-y-1"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all font-medium"
                onClick={() => setOpen(false)}
              >
                {link.label}
                {link.badge && <NavBadge>{link.badge}</NavBadge>}
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

function NavBadge({ children }) {
  return (
    <span className="rounded-full px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ background: 'rgba(255,138,122,0.16)', color: '#ff9a87' }}>
      {children}
    </span>
  );
}
