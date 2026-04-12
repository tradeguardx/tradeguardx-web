import { motion } from 'framer-motion';

export default function AppLoader() {
  return (
    <div className="fixed inset-0 z-[100] bg-surface-950 flex items-center justify-center overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-accent/[0.08] blur-[120px]" />
      <div className="absolute bottom-[-120px] right-[-80px] w-[360px] h-[360px] rounded-full bg-indigo-500/[0.08] blur-[120px]" />

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="relative w-20 h-20 rounded-2xl border border-accent/30 bg-accent/10 grid place-items-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-[-8px] rounded-[1.1rem] border border-accent/20"
          />
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mt-6 font-display text-xl font-bold gradient-text"
        >
          TradeGuardX
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="mt-1 text-sm text-slate-500"
        >
          Loading protection systems...
        </motion.p>

        <div className="mt-5 w-52 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent via-emerald-400 to-teal-300"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
}
