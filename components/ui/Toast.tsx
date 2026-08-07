'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastTipo = 'info' | 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastTipo;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastTipo) => void;
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

  const showToast = useCallback((message: string, type: ToastTipo = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const estilos: Record<ToastTipo, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: 'bg-primary-50', border: 'border-primary-450', text: 'text-primary-700', icon: 'ℹ️' },
    success: { bg: 'bg-success-50', border: 'border-success-400', text: 'text-success-600', icon: '✅' },
    error: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', icon: '❌' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', icon: '⚠️' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => {
          const estilos_ = estilos[toast.type];
          return (
            <div
              key={toast.id}
              role="alert"
              className={[
                'flex items-start gap-3',
                'px-4 py-3 rounded-lg border-l-4 shadow-lg',
                'animate-in slide-in-from-right duration-300',
                estilos_.bg, estilos_.border,
              ].join(' ')}
            >
              <span className="text-lg flex-shrink-0" aria-hidden="true">{estilos_.icon}</span>
              <p className={`text-sm font-medium ${estilos_.text} flex-1`}>
                {toast.message}
              </p>
                <button
                onClick={() => removeToast(toast.id)}
                className={`${estilos_.text} hover:opacity-70 transition-opacity flex-shrink-0`}
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
