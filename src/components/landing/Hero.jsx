import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Hero() {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32"
      onMouseMove={handleMouseMove}
    >
      {/* Mouse-following glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 40vmax at ${mouse.x}% ${mouse.y}%, rgba(0, 212, 170, 0.08) 0%, transparent 50%)`,
          transition: 'background 0.2s ease-out',
        }}
        aria-hidden
      />

      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/6 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[150px] pointer-events-none animate-float" />
      <div className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[130px] pointer-events-none" style={{ animation: 'float 8s ease-in-out 2s infinite' }} />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-gold/5 blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'float 10s ease-in-out 1s infinite' }} />

      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass text-sm mb-12"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <span className="text-slate-300">Chrome Extension for Traders</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="gradient-text">Trade Smarter.</span>
          <br />
          <span className="gradient-text-accent">Stay Protected.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-5 leading-relaxed"
        >
          TradeGuardX automatically enforces your risk rules inside your trading platform.
          No API keys. No broker connection. Rule checks run locally; sign in to sync rules, pairing, and optional trade history to your account.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-accent font-semibold text-base md:text-lg mb-12"
        >
          Never break a prop firm rule again.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-accent text-surface-950 font-semibold text-lg hover:bg-accent-hover transition-all duration-300 shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:shadow-xl"
            >
              Get Started Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              to={{ pathname: '/', hash: 'how-it-works' }}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl glass text-slate-200 font-medium text-lg hover:bg-white/[0.08] transition-all duration-300"
            >
              See How It Works
            </Link>
          </motion.div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-slate-500"
        >
          {['Free plan available', 'No credit card required', '100% browser-based'].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent/60" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item}
            </span>
          ))}
        </motion.div>

        {/* Live preview card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20"
        >
          <div className="rounded-3xl glass p-1 shadow-2xl shadow-black/30">
            <div className="rounded-[1.35rem] bg-surface-900/80 backdrop-blur-sm overflow-hidden">
              {/* Window chrome */}
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-3">
                <div className="flex gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-slate-500 text-xs font-mono ml-2">TradeGuardX — Live Protection Active</span>
                <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Monitoring
                </span>
              </div>

              {/* Trade cards */}
              <div className="p-5">
                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    { label: 'BTC/USD', pnl: '+$324.50', percent: '+2.4%', positive: true, rule: 'SL Protected' },
                    { label: 'EUR/USD', pnl: '-$42.00', percent: '-0.8%', positive: false, rule: 'Risk OK' },
                    { label: 'ETH/USD', pnl: '+$148.40', percent: '+1.2%', positive: true, rule: 'SL Protected' },
                  ].map((trade, i) => (
                    <motion.div
                      key={trade.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-accent/20 transition-all duration-300 group"
                    >
                      <div>
                        <span className="font-mono text-sm text-slate-300 block">{trade.label}</span>
                        <span className="text-xs text-slate-500">{trade.rule}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold text-sm block ${trade.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnl}
                        </span>
                        <span className={`text-xs ${trade.positive ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                          {trade.percent}
                        </span>
                      </div>
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 text-accent opacity-60 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
                  <span>Daily Loss: 0.8% / 2.0%</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>Max Drawdown: 1.2% / 5.0%</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-accent">All Rules Passing</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
