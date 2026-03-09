import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-surface-950/90 backdrop-blur-xl"
    >
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white flex items-center gap-2">
          <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">TradeGuardX</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/#features" className="text-slate-400 hover:text-white transition-colors text-sm">Features</Link>
          <Link to="/#how-it-works" className="text-slate-400 hover:text-white transition-colors text-sm">How it works</Link>
          <Link to="/pricing" className="text-slate-400 hover:text-white transition-colors text-sm">Pricing</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm">Dashboard</Link>
              <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-accent text-surface-950 font-medium text-sm hover:bg-accent-hover transition-colors">
                Open Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-400 hover:text-white transition-colors text-sm">Sign in</Link>
              <Link to="/pricing" className="px-4 py-2 rounded-lg bg-accent text-surface-950 font-medium text-sm hover:bg-accent-hover transition-colors">
                Install Extension
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden p-2 text-slate-400 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="md:hidden border-t border-surface-800/50 bg-surface-950/98 backdrop-blur px-6 py-4 space-y-4"
          >
            <Link to="/#features" className="block text-slate-400 hover:text-white" onClick={() => setOpen(false)}>Features</Link>
            <Link to="/#how-it-works" className="block text-slate-400 hover:text-white" onClick={() => setOpen(false)}>How it works</Link>
            <Link to="/pricing" className="block text-slate-400 hover:text-white" onClick={() => setOpen(false)}>Pricing</Link>
            {user ? (
              <Link to="/dashboard" className="block px-4 py-2 rounded-lg bg-accent text-surface-950 font-medium w-fit" onClick={() => setOpen(false)}>Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="block text-slate-400 hover:text-white" onClick={() => setOpen(false)}>Sign in</Link>
                <Link to="/pricing" className="block px-4 py-2 rounded-lg bg-accent text-surface-950 font-medium w-fit" onClick={() => setOpen(false)}>Install Extension</Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
