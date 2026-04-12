'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const typeStyles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: 'bg-primary-50', border: 'border-primary-400', text: 'text-primary-700', icon: 'ℹ️' },
    success: { bg: 'bg-success-50', border: 'border-success-400', text: 'text-success-600', icon: '✅' },
    error: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', icon: '❌' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', icon: '⚠️' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const styles = typeStyles[toast.type];
          return (
            <div
              key={toast.id}
              role="alert"
              className={`
                ${styles.bg} ${styles.border} border-l-4
                px-4 py-3 rounded-lg shadow-lg
                animate-in slide-in-from-right duration-300
                flex items-start gap-3
              `}
            >
              <span className="text-lg flex-shrink-0">{styles.icon}</span>
              <p className={`text-sm font-medium ${styles.text} flex-1`}>{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
