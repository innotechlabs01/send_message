'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

function ContenidoConfirmacion() {
  const params = useSearchParams();
  const router = useRouter();
  
  // Bold redirige con: ?bold-order-id=xxx&bold-tx-status=approved|rejected|pending
  const txStatus = params.get('bold-tx-status');
  const orderId = params.get('bold-order-id');
  const aprobado = txStatus === 'approved';
  const pendiente = txStatus === 'pending' || (!txStatus && !orderId);

  // Limpiar sessionStorage cuando se confirma el pago
  useEffect(() => {
    if (aprobado) {
      sessionStorage.removeItem('datos_envio');
      sessionStorage.removeItem('referencia_pago');
      sessionStorage.removeItem('otp_phone');
    }
  }, [aprobado]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Ícono */}
        <div className="flex justify-center">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
              aprobado ? 'bg-green-500' : pendiente ? 'bg-yellow-400' : 'bg-red-500'
            }`}
            aria-hidden="true"
          >
            {aprobado ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : pendiente ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>

        {/* Mensaje */}
        <div className="space-y-3">
          {aprobado ? (
            <>
              <h1 className="text-3xl font-bold text-[#333333]">
                ¡Tu mensaje ha sido programado!
              </h1>
              <p className="text-[#666666]">
                Recibirás un recordatorio un día antes del envío. El destinatario recibirá el mensaje en la fecha programada.
              </p>
            </>
          ) : pendiente ? (
            <>
              <h1 className="text-3xl font-bold text-[#333333]">
                Pago en proceso
              </h1>
              <p className="text-[#666666]">
                Tu pago está siendo procesado. Te notificaremos cuando se confirme.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-[#333333]">
                El pago no fue procesado
              </h1>
              <p className="text-[#666666]">
                Tu pago fue rechazado o cancelado. Puedes intentarlo de nuevo.
              </p>
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          {!aprobado && !pendiente && (
            <Link href="/pago">
              <Button variante="primary" className="w-full">
                Reintentar pago
              </Button>
            </Link>
          )}
          <Link href="/">
            <Button variante={aprobado ? 'primary' : 'secondary'} className="w-full">
              {aprobado ? 'Crear otro mensaje' : 'Volver al inicio'}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaginaConfirmacion() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-[#666666]">Cargando...</p></div>}>
      <ContenidoConfirmacion />
    </Suspense>
  );
}
