import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const floatOrb = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 0.4,
    scale: 1,
    transition: { duration: 1.2, ease: 'easeOut' }
  }
};

export default function Hero() {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMouse({ x, y });
  }, []);

  return (
    <section
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24 pb-32"
      onMouseMove={handleMouseMove}
    >
      {/* Mouse-following background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 35vmax at ${mouse.x}% ${mouse.y}%, rgba(0, 212, 170, 0.12) 0%, transparent 50%)`,
          transition: 'background 0.15s ease-out'
        }}
        aria-hidden
      />

      {/* Animated background orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/20 blur-[120px] pointer-events-none"
        variants={floatOrb}
        initial="initial"
        animate="animate"
        style={{ animation: 'hero-float-a 18s ease-in-out infinite' }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-[320px] h-[320px] rounded-full bg-accent/15 blur-[100px] pointer-events-none"
        variants={floatOrb}
        initial="initial"
        animate="animate"
        style={{ animation: 'hero-float-b 22s ease-in-out infinite' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[280px] h-[280px] rounded-full bg-white/5 blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        variants={floatOrb}
        initial="initial"
        animate="animate"
        style={{ animation: 'hero-float-c 25s ease-in-out infinite' }}
      />

      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent" />

      <style>{`
        @keyframes hero-float-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes hero-float-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 25px) scale(1.03); }
          66% { transform: translate(20px, -15px) scale(0.97); }
        }
        @keyframes hero-float-c {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(calc(-50% + 15px), calc(-50% - 10px)) scale(1.02); }
        }
      `}</style>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Pill badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm mb-10"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Browser extension for traders
        </motion.div>

        {/* Headline - solid so name is always visible */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-5"
        >
          <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
            TradeGuardX
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="text-xl md:text-2xl text-slate-300 font-medium mb-4"
        >
          Protect every trade automatically.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="text-base md:text-lg text-accent font-semibold mb-10"
        >
          Never break prop firm rules again.
        </motion.p>

        {/* Single concise body */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-slate-400 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-12"
        >
          Runs inside your trading platform and enforces your risk rules automatically. No API keys, no broker connection — your data never leaves your computer.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-accent text-surface-950 font-semibold text-lg hover:bg-accent-hover transition-all duration-200 shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:shadow-xl"
            >
              Install Extension
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-24"
        >
          <motion.div
            className="rounded-2xl border border-white/10 bg-surface-900/60 backdrop-blur-sm px-6 py-5 shadow-xl"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {[
                { label: 'BTC/USD', pnl: '+2.4%', color: 'text-emerald-400' },
                { label: 'EUR/USD', pnl: '-0.8%', color: 'text-red-400' },
                { label: 'ETH/USD', pnl: '+1.2%', color: 'text-emerald-400' },
              ].map((trade, i) => (
                <motion.div
                  key={trade.label}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  whileHover={{ scale: 1.04 }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-accent/30 transition-colors duration-200"
                >
                  <span className="font-mono text-sm text-slate-300">{trade.label}</span>
                  <span className={`font-semibold text-sm ${trade.color}`}>{trade.pnl}</span>
                  <span className="flex items-center gap-1 text-accent text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Protected
                  </span>
                </motion.div>
              ))}
            </div>
            <p className="text-slate-500 text-xs mt-3 text-center">
              Works inside your platform · No API keys · Local-only
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
