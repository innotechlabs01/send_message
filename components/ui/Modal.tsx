'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  className?: string;
  ancho?: string;
}

export default function Modal({ abierto, onCerrar, titulo, children, className = '', ancho = 'max-w-lg' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [abierto, onCerrar]);

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCerrar();
  };

  if (!abierto) return null;

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-titulo"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[
          'relative w-full bg-white rounded-2xl shadow-xl overflow-y-auto',
          'focus:outline-none',
          ancho,
          className,
        ].join(' ')}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E8E8E8]">
          <h2 id="modal-titulo" className="text-lg font-semibold text-text-primary">
            {titulo}
          </h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-screen text-text-tertiary hover:bg-neutral-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
