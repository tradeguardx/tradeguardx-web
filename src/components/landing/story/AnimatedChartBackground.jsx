import { motion, useReducedMotion } from 'framer-motion';

export default function AnimatedChartBackground({ className = '' }) {
  const reduce = useReducedMotion();

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <svg className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="none" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="chartLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(0,212,170)" stopOpacity="0" />
            <stop offset="45%" stopColor="rgb(0,212,170)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(52,211,153)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(0,212,170)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="rgb(0,212,170)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          fill="url(#chartFill)"
          d="M0,520 Q200,480 400,420 T800,380 T1200,320 L1200,800 L0,800 Z"
        />
        <motion.path
          fill="none"
          stroke="url(#chartLine)"
          strokeWidth="1.5"
          initial={false}
          animate={reduce ? { opacity: 0.45 } : { opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          d="M0,540 L150,500 L300,520 L450,460 L600,480 L750,400 L900,420 L1050,360 L1200,340"
        />
        <path
          fill="none"
          stroke="rgba(148,163,184,0.12)"
          strokeWidth="1"
          strokeDasharray="6 10"
          d="M0,600 L1200,600"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/40 to-surface-950" />
    </div>
  );
}
