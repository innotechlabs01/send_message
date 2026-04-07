'use client';

import { useEffect, ReactNode } from 'react';

interface SessionCleanupProps {
  children: ReactNode;
}

export default function SessionCleanup({ children }: SessionCleanupProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const STORAGE_KEY = 'datos_envio';

    const manejarAntesDeDescargar = () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('referencia_pago');
        sessionStorage.removeItem('otp_phone');
        sessionStorage.removeItem('cantidad_mensajes');
      } catch {
        console.error('Error limpiando sessionStorage');
      }
    };

    window.addEventListener('beforeunload', manejarAntesDeDescargar);

    return () => {
      window.removeEventListener('beforeunload', manejarAntesDeDescargar);
    };
  }, []);

  return <>{children}</>;
}
