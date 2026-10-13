import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CircleCheck, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';

const ToastContext = createContext(null);

const DURATION = { success: 4500, info: 4500, warning: 7000, error: 9000 };

const STYLES = {
  success: { icon: CircleCheck, iconClass: 'text-success' },
  error: { icon: CircleAlert, iconClass: 'text-danger' },
  warning: { icon: TriangleAlert, iconClass: 'text-warning' },
  info: { icon: Info, iconClass: 'text-info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message: String(message || ''), type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), DURATION[type] ?? DURATION.info);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[100] bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 sm:bottom-5 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto animate-fade-up flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-pop"
            >
              <Icon className={`w-5 h-5 shrink-0 mt-px ${s.iconClass}`} aria-hidden />
              <p className="flex-1 text-sm text-ink leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 -mr-1 p-1 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
