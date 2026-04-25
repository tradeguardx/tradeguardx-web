import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext(null);

const TONE = {
  success: {
    bar: 'bg-success',
    icon: (
      <svg className="w-4 h-4 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bar: 'bg-danger',
    icon: (
      <svg className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bar: 'bg-accent',
    icon: (
      <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function ToastItem({ toast, onClose }) {
  const tone = TONE[toast.type] ?? TONE.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="w-full rounded-xl border border-white/[0.08] bg-surface-800 shadow-xl shadow-black/40 overflow-hidden"
    >
      {/* coloured top bar */}
      <div className={`h-0.5 w-full ${tone.bar}`} />

      <div className="flex items-start gap-3 px-4 py-3">
        {tone.icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{toast.title}</p>
          {toast.description && (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0 mt-0.5"
          aria-label="Close notification"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((input) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast = {
      id,
      type: input.type || 'info',
      title: input.title || 'Notice',
      description: input.description || '',
      duration: input.duration ?? 2600,
    };
    setToasts((prev) => [...prev, toast]);
    window.setTimeout(() => removeToast(id), toast.duration);
  }, [removeToast]);

  const api = useMemo(() => ({
    pushToast,
    success: (title, description) => pushToast({ type: 'success', title, description }),
    error: (title, description) => pushToast({ type: 'error', title, description }),
    info: (title, description) => pushToast({ type: 'info', title, description }),
  }), [pushToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[120] w-[min(92vw,360px)] space-y-2 pointer-events-none">
        <AnimatePresence>
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
