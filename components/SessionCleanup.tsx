'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface SessionCleanupProps {
  children: ReactNode;
}

export default function SessionCleanup({ children }: SessionCleanupProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const STORAGE_KEY = 'datos_envio';
    const PENDING_KEY = 'mensajes_programados_pendientes';

    // Solo limpiar localStorage en la primera carga
    // Esto asegura que siempre start con estado limpio
    if (!initialized.current) {
      initialized.current = true;
      try {
        localStorage.removeItem(PENDING_KEY);
      } catch {
        console.error('Error limpiando localStorage');
      }
    }

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