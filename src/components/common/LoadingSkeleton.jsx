import { motion } from 'framer-motion';

export function SkeletonBlock({ className = '' }) {
  return (
    <motion.div
      className={`rounded-lg ${className}`}
      style={{
        backgroundColor: 'var(--dash-skeleton, rgba(148, 163, 184, 0.22))',
      }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 mx-auto grid place-items-center mb-4">
        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="font-display text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">{description}</p>
      {action}
    </div>
  );
}
