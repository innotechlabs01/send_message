'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import HeaderBrand from '@/components/header-brand';

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
      setNombresDestinatarios(mensajes.map((m) => m.nombre_destinatario));
      setFechasEnvio(
        mensajes.map((m) => {
          const [y, mo, d] = m.fecha_envio.split('-');
          const fecha = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
          return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
        })
      );

      if (mensajes.length > 0) {
        try {
          const mensajesConContacto = mensajes.map((m) => ({
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
      sessionStorage.removeItem('bold_config');

      setGuardando(false);
    };

    procesarConfirmacion();
  }, [aprobado]);

  if (guardando) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-neutral-100 px-6">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 border-4 border-primary-450 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-text-secondary">Procesando tu pago…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-neutral-100 text-text-primary font-poppins">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-6 pt-14 pb-16">
        <HeaderBrand />

        {aprobado ? (
          <>
            {/* Estado de éxito */}
            <section className="mx-auto mt-8 flex h-32 w-32 items-center justify-center rounded-full bg-success-400 text-white shadow-2xl">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </section>

            <h1 className="mt-6 text-center text-4xl font-bold text-success-600">
              ¡Pago exitoso!
            </h1>
            <p className="mt-2 text-center text-lg text-text-secondary">
              Tus mensajes han sido programados correctamente.
            </p>

            {cantidadMensajes > 0 && (
              <section className="mt-8 w-full max-w-md rounded-[24px] border border-[#E8E8E8] bg-white p-6 shadow-xs">
                <div className="flex items-center justify-center gap-2 text-5xl">💌</div>
                <p className="mt-3 text-center text-2xl font-bold text-primary-450">
                  {cantidadMensajes} mensaje{cantidadMensajes !== 1 ? 's' : ''} programado{cantidadMensajes !== 1 ? 's' : ''}
                </p>

                {nombresDestinatarios.length > 0 && (
                  <div className="mt-4 space-y-2 pt-4 border-t border-[#E8E8E8]">
                    <p className="text-sm font-medium text-text-secondary">Destinatarios:</p>
                    {nombresDestinatarios.slice(0, 5).map((nombre, i) => (
                      <div key={i} className="flex items-center gap-2 text-text-primary">
                        <span className="h-2 w-2 rounded-full bg-success-400" />
                        <span>{nombre}</span>
                      </div>
                    ))}
                    {nombresDestinatarios.length > 5 && (
                      <p className="text-sm text-text-tertiary">+{nombresDestinatarios.length - 5} más</p>
                    )}
                  </div>
                )}

                {fechasEnvio.length > 0 && (
                  <div className="mt-3 space-y-1 pt-3 border-t border-[#E8E8E8]">
                    <p className="text-sm font-medium text-text-secondary">Fechas de envío:</p>
                    {fechasEnvio.slice(0, 3).map((fecha, i) => (
                      <p key={i} className="text-sm text-text-tertiary">{fecha}</p>
                    ))}
                    {fechasEnvio.length > 3 && (
                      <p className="text-sm text-text-tertiary">+{fechasEnvio.length - 3} más</p>
                    )}
                  </div>
                )}
              </section>
            )}

            <div className="mt-8 flex flex-col gap-3 text-center text-sm text-text-tertiary">
              <p>📱 Recibirás un recordatorio un día antes de cada envío.</p>
              <p>💡 Los mensajes se enviarán automáticamente en la fecha programada.</p>
            </div>

            <p className="mt-6 text-center text-lg font-medium text-success-600">
              ¡Gracias por confiar en ConSentido!
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="flex-1">
                <Button variante="primary" className="w-full">
                  Volver al inicio
                </Button>
              </Link>
              <Link href="/categorias" className="flex-1">
                <Button variante="secondary" className="w-full">
                  Crear otro mensaje
                </Button>
              </Link>
            </div>
          </>
        ) : rechazado ? (
          <>
            <section className="mt-8 mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </section>
            <h1 className="mt-6 text-center text-3xl font-bold text-red-600">Pago no completado</h1>
            <p className="mt-2 text-center text-lg text-text-secondary">
              Tu pago fue rechazado. Puedes intentar de nuevo cuando quieras.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/pago" className="flex-1">
                <Button variante="primary" className="w-full">
                  Reintentar pago
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variante="secondary" className="w-full">
                  Volver al inicio
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-center text-sm text-text-tertiary">
              Tus mensajes guardados se mantendrán disponibles.
            </p>
          </>
        ) : (
          <>
            <section className="mt-8 mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-yellow-400 text-white shadow-2xl">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
              </svg>
            </section>
            <h1 className="mt-6 text-center text-3xl font-bold text-yellow-600">Procesando pago</h1>
            <p className="mt-2 text-center text-lg text-text-secondary">
              Tu pago está siendo verificado. Esto puede tomar unos momentos.
            </p>
            <p className="mt-2 text-center text-sm text-text-tertiary">
              No cierres esta página. Recibirás una notificación cuando se confirme.
            </p>
            <Link href="/" className="mt-6">
              <Button variante="secondary" className="w-full max-w-xs">
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
    <Suspense
      fallback={
        <main className="flex min-h-screen w-full items-center justify-center bg-neutral-100">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 border-4 border-primary-450 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-text-secondary">Cargando…</p>
          </div>
        </main>
      }
    >
      <ContenidoConfirmacion />
    </Suspense>
  );
}
