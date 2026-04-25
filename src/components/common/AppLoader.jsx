import { motion } from 'framer-motion';

const BARS = [0.4, 0.7, 0.55, 1, 0.8, 0.6, 0.9, 0.5, 0.75, 0.45, 0.85, 0.65];

export default function AppLoader() {
  return (
    <div className="fixed inset-0 z-[100] bg-surface-950 flex flex-col items-center justify-center overflow-hidden">

      {/* Background glow blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.06] blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.05] blur-[120px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(to right, #00d4aa 1px, transparent 1px), linear-gradient(to bottom, #00d4aa 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-10">

        {/* Mini chart bars — trading motif */}
        <motion.div
          className="flex items-end gap-1.5 h-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {BARS.map((h, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-sm bg-accent"
              style={{ height: `${h * 40}px` }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: h }}
              transition={{
                delay: i * 0.045,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
        </motion.div>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-2">
          <motion.h1
            className="font-display text-3xl font-bold tracking-tight text-white"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            Trade<span className="text-accent">Guard</span>X
          </motion.h1>
          <motion.p
            className="text-xs tracking-widest uppercase text-slate-500 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            Risk Intelligence
          </motion.p>
        </div>

        {/* Progress track */}
        <motion.div
          className="w-48 h-[2px] rounded-full bg-white/[0.06] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent via-emerald-400 to-teal-300"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.55 }}
          />
        </motion.div>
      </div>
    </div>
  );
}
