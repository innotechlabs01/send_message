'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

const STORAGE_KEY = 'mensajes_programados_pendientes';
const STORAGE_CONTACTO = 'datos_contacto';

interface MensajeCompleto {
  texto_final: string;
  nombre_destinatario: string;
  nombre_remitente: string;
  celular_destinatario: string;
  celular_remitente: string;
  fecha_envio: string;
  email_contacto?: string;
  nombre_contacto?: string;
  telefono_contacto?: string;
}

function ContenidoConfirmacion() {
  const params = useSearchParams();
  const [cantidadMensajes, setCantidadMensajes] = useState(0);
  const [nombresDestinatarios, setNombresDestinatarios] = useState<string[]>([]);
  const [fechasEnvio, setFechasEnvio] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(true);

  const txStatus = params.get('bold-tx-status');
  const aprobado = txStatus === 'approved';
  const rechazado = txStatus === 'rejected' || txStatus === 'failed';

  useEffect(() => {
    const procesarConfirmacion = async () => {
      if (!aprobado) {
        setGuardando(false);
        return;
      }

      const mensajesRaw = localStorage.getItem(STORAGE_KEY);
      const contactosRaw = localStorage.getItem(STORAGE_CONTACTO);

      let mensajes: MensajeCompleto[] = [];
      let contactos: { email_contacto: string; nombre_contacto: string; telefono_contacto: string } | null = null;

      try {
        mensajes = mensajesRaw ? JSON.parse(mensajesRaw) : [];
        contactos = contactosRaw ? JSON.parse(contactosRaw) : null;
      } catch {
        mensajes = [];
      }

      const cantidadStr = sessionStorage.getItem('cantidad_mensajes');
      const cantidadSession = cantidadStr ? parseInt(cantidadStr, 10) : mensajes.length;

      setCantidadMensajes(cantidadSession || mensajes.length);
      setNombresDestinatarios(mensajes.map(m => m.nombre_destinatario));
      setFechasEnvio(mensajes.map(m => {
        const [y, mo, d] = m.fecha_envio.split('-');
        return new Date(parseInt(y), parseInt(mo) - 1, parseInt(d)).toLocaleDateString('es-CO', {
          day: 'numeric', month: 'long', year: 'numeric',
        });
      }));

      if (mensajes.length > 0) {
        try {
          const mensajesConContacto = mensajes.map(m => ({
            ...m,
            email_contacto: contactos?.email_contacto ?? m.email_contacto ?? '',
            nombre_contacto: contactos?.nombre_contacto ?? m.nombre_contacto ?? '',
            telefono_contacto: contactos?.telefono_contacto ?? m.telefono_contacto ?? '',
          }));

          await fetch('/api/mensajes/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensajes: mensajesConContacto }),
          });
        } catch (err) {
          console.error('Error guardando mensajes:', err);
        }
      }

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_CONTACTO);
      sessionStorage.removeItem('datos_envio');
      sessionStorage.removeItem('referencia_pago');
      sessionStorage.removeItem('cantidad_mensajes');

      setGuardando(false);
    };

    procesarConfirmacion();
  }, [aprobado]);

  if (guardando) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-primary-50 to-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-text-secondary">Procesando tu pago...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-success-50 to-white">
      <div className="max-w-lg w-full text-center space-y-8">
        {aprobado ? (
          <>
            <div className="flex justify-center animate-bounce">
              <div className="w-32 h-32 rounded-full bg-success-400 flex items-center justify-center shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-success-600">
                Pago exitoso!
              </h1>
              <p className="text-xl text-text-secondary">
                Tus mensajes han sido programados correctamente
              </p>
            </div>

            {cantidadMensajes > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-6xl">
                  💌
                </div>
                <p className="text-2xl font-bold text-primary-500">
                  {cantidadMensajes} mensaje{cantidadMensajes !== 1 ? 's' : ''} programado{cantidadMensajes !== 1 ? 's' : ''}
                </p>

                {nombresDestinatarios.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-sm font-medium text-text-secondary">Destinatarios:</p>
                    {nombresDestinatarios.slice(0, 5).map((nombre, i) => (
                      <div key={i} className="flex items-center justify-center gap-2 text-text-primary">
                        <span className="w-2 h-2 rounded-full bg-success-400" />
                        <span>{nombre}</span>
                      </div>
                    ))}
                    {nombresDestinatarios.length > 5 && (
                      <p className="text-sm text-text-tertiary">+{nombresDestinatarios.length - 5} mas</p>
                    )}
                  </div>
                )}

                {fechasEnvio.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    <p className="text-sm font-medium text-text-secondary">Fechas de envio:</p>
                    {fechasEnvio.slice(0, 3).map((fecha, i) => (
                      <p key={i} className="text-sm text-text-tertiary">{fecha}</p>
                    ))}
                    {fechasEnvio.length > 3 && (
                      <p className="text-sm text-text-tertiary">+{fechasEnvio.length - 3} mas</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-2">
              <p className="text-text-secondary">
                📱 Recibiras un recordatorio <strong>un dia antes</strong> de cada envio.
              </p>
              <p className="text-text-secondary">
                💡 Los mensajes se enviaran automaticamente en la fecha programada.
              </p>
            </div>

            <p className="text-lg font-medium text-success-600 pt-4">
              Gracias por confiar en nosotros!
            </p>

            <Link href="/" className="block pt-4">
              <Button variante="primary" className="w-full text-lg py-4">
                Crear nuevos mensajes
              </Button>
            </Link>
          </>
        ) : rechazado ? (
          <>
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full bg-red-500 flex items-center justify-center shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-red-600">
                Pago no completado
              </h1>
              <p className="text-lg text-text-secondary">
                Tu pago fue rechazado. Puedes intentar de nuevo cuando quieras.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Link href="/pago">
                <Button variante="primary" className="w-full text-lg py-4">
                  Reintentar pago
                </Button>
              </Link>
              <Link href="/">
                <Button variante="secondary" className="w-full">
                  Volver al inicio
                </Button>
              </Link>
            </div>

            <p className="text-sm text-text-tertiary pt-4">
              Tus mensajes guardados se mantendran disponibles.
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full bg-yellow-400 flex items-center justify-center shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-yellow-600">
                Procesando pago
              </h1>
              <p className="text-lg text-text-secondary">
                Tu pago esta siendo verificado. Esto puede tomar unos momentos.
              </p>
            </div>

            <p className="text-sm text-text-tertiary">
              No cierres esta pagina. Recibiras una notificacion cuando se confirme.
            </p>

            <Link href="/">
              <Button variante="secondary" className="w-full mt-6">
                Volver al inicio
              </Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaginaConfirmacion() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-text-secondary">Cargando...</p>
        </div>
      </main>
    }>
      <ContenidoConfirmacion />
    </Suspense>
  );
}
