'use client';

import { useEffect, useState } from 'react';

const SESSION_MARKER = '___consentiido_session';
const LOCAL_KEYS = ['mensajes_programados_pendientes', 'datos_contacto'];
const APP_VERSION_KEY = '___consentiido_version';
const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';

type SessionStatus = 'checking' | 'showing-prompt' | 'ready';

export default function SessionCleanup({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Verificar si la versión de la app cambió
    const savedVersion = localStorage.getItem(APP_VERSION_KEY);
    if (savedVersion && savedVersion !== CURRENT_VERSION) {
      // Versión antigua detectada → limpiar caché y actualizar versión
      LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
      localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
      setStatus('ready');
      return;
    }

    // Marcar versión actual si no existe
    if (!savedVersion) {
      localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
    }

    // 2. Verificar si es una sesión existente (recarga normal)
    const existingMarker = sessionStorage.getItem(SESSION_MARKER);
    if (existingMarker) {
      setStatus('ready');
      return;
    }

    // 3. Nueva sesión: revisar si hay datos pendientes
    const pendingRaw = localStorage.getItem('mensajes_programados_pendientes');
    let pendingMessages: unknown[] = [];
    try {
      pendingMessages = pendingRaw ? JSON.parse(pendingRaw) : [];
    } catch {
      pendingMessages = [];
    }
    const hasContactData = localStorage.getItem('datos_contacto') !== null;

    if (pendingMessages.length > 0 || hasContactData) {
      setPendingCount(pendingMessages.length);
      setStatus('showing-prompt');
    } else {
      sessionStorage.setItem(SESSION_MARKER, 'active');
      setStatus('ready');
    }
  }, []);

  const handleContinue = () => {
    sessionStorage.setItem(SESSION_MARKER, 'active');
    setStatus('ready');
  };

  const handleStartFresh = () => {
    LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    sessionStorage.setItem(SESSION_MARKER, 'active');
    setStatus('ready');
  };

  if (status === 'checking') {
    return null;
  }

  if (status === 'showing-prompt') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Mensajes guardados encontrados</h3>
          <p className="mb-6 text-gray-600">
            {pendingCount > 0
              ? `Tienes ${pendingCount} mensaje(s) programado(s) pendiente(s). ¿Quieres continuar con ellos o empezar de nuevo?`
              : 'Tienes datos de contacto guardados. ¿Quieres continuar o empezar de nuevo?'}
          </p>
          <p className="text-sm text-text-tertiary mb-6">La mayoría de usuarios que cierran el navegador no completan el envío, recomendamos empezar de nuevo.</p>
          <div className="flex gap-4 justify-end">
            <button
              onClick={handleStartFresh}
              autoFocus
              className="px-6 py-3 border border-[#E8E8E8] text-text-tertiary rounded-screen hover:bg-[#E5F1FD] transition-colors"
            >
              Empezar de nuevo (borrar todo)
            </button>
            <button
              onClick={handleContinue}
              className="px-6 py-3 bg-primary-450 text-white rounded-screen hover:bg-primary-600 transition-colors"
            >
              Continuar con mensajes guardados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
