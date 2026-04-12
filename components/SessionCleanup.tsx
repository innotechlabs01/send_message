'use client';

import { useEffect } from 'react';

export default function SessionCleanup({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tieneMensajes = localStorage.getItem('mensajes_programados_pendientes');

    if (!tieneMensajes) {
      localStorage.removeItem('datos_contacto');
    }

  }, []);

  return <>{children}</>;
}
