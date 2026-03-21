'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({ abierto, onCerrar, titulo, children, className = '' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [abierto, onCerrar]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  // Focus trap al abrir
  useEffect(() => {
    if (abierto) dialogRef.current?.focus();
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-titulo"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden="true"
      />
      {/* Contenido */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[
          'relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'bg-white rounded-2xl shadow-xl',
          'focus:outline-none',
          className,
        ].join(' ')}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#CCCCCC]">
          <h2 id="modal-titulo" className="text-lg font-semibold text-[#333333]">
            {titulo}
          </h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#666666] hover:bg-[#ECECEC] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
