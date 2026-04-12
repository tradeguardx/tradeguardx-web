import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext(null);

function ToastItem({ toast, onClose }) {
  const tone =
    toast.type === 'success'
      ? 'border-success/35 bg-success/10'
      : toast.type === 'error'
        ? 'border-danger/35 bg-danger/10'
        : 'border-accent/30 bg-surface-900/90';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className={`w-full rounded-xl border px-4 py-3 backdrop-blur-xl shadow-xl shadow-black/30 ${tone}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{toast.title}</p>
          {toast.description && (
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
