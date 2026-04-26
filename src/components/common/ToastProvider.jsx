import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext(null);

const TONE = {
  success: {
    bar: 'bg-emerald-400',
    iconBg: 'bg-emerald-400/15',
    iconColor: 'text-emerald-400',
    glow: '0 14px 40px -10px rgba(16, 185, 129, 0.35)',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bar: 'bg-rose-400',
    iconBg: 'bg-rose-400/15',
    iconColor: 'text-rose-400',
    glow: '0 14px 40px -10px rgba(244, 63, 94, 0.35)',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bar: 'bg-cyan-400',
    iconBg: 'bg-cyan-400/15',
    iconColor: 'text-cyan-400',
    glow: '0 14px 40px -10px rgba(34, 211, 238, 0.35)',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function ToastItem({ toast, onClose }) {
  const tone = TONE[toast.type] ?? TONE.info;
  const [paused, setPaused] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] backdrop-blur-xl"
      style={{
        background:
          'linear-gradient(135deg, rgba(20,24,32,0.92) 0%, rgba(15,18,25,0.92) 100%)',
        boxShadow: `${tone.glow}, 0 0 0 1px rgba(255,255,255,0.04), 0 1px 0 0 rgba(255,255,255,0.04) inset`,
      }}
    >
      {/* Left accent bar */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-1 ${tone.bar}`}
        style={{ boxShadow: '0 0 12px currentColor' }}
      />

      <div className="flex items-start gap-3 px-4 py-3.5 pl-5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone.iconBg} ${tone.iconColor}`}
        >
          {tone.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white leading-snug tracking-[-0.005em]">
            {toast.title}
          </p>
          {toast.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{toast.description}</p>
          )}
        </div>

        <button
          onClick={() => onClose(toast.id)}
          className="text-slate-500 hover:text-white/90 transition-colors flex-shrink-0 -mr-1 -mt-0.5 p-1 rounded-md hover:bg-white/5"
          aria-label="Close notification"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Auto-dismiss progress bar — pauses on hover */}
      <div className="absolute left-0 bottom-0 right-0 h-[2px] bg-white/[0.06]">
        <motion.div
          className={`h-full ${tone.bar}`}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{
            duration: toast.duration / 1000,
            ease: 'linear',
          }}
          style={{
            transformOrigin: 'left',
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const handle = timersRef.current.get(id);
    if (handle) {
      window.clearTimeout(handle);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (input) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast = {
        id,
        type: input.type || 'info',
        title: input.title || 'Notice',
        description: input.description || '',
        duration: input.duration ?? 3200,
      };
      setToasts((prev) => [...prev, toast]);
      const handle = window.setTimeout(() => removeToast(id), toast.duration);
      timersRef.current.set(id, handle);
    },
    [removeToast],
  );

  const api = useMemo(
    () => ({
      pushToast,
      success: (title, description) => pushToast({ type: 'success', title, description }),
      error: (title, description) => pushToast({ type: 'error', title, description }),
      info: (title, description) => pushToast({ type: 'info', title, description }),
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[120] w-[min(92vw,380px)] flex flex-col gap-2.5 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onClose={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
