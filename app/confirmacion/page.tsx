'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

function ContenidoConfirmacion() {
  const params = useSearchParams();
  const status = params.get('status');
  const aprobado = status !== 'rejected' && status !== 'failed';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Ícono */}
        <div className="flex justify-center">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
              aprobado ? 'bg-green-500' : 'bg-red-500'
            }`}
            aria-hidden="true"
          >
            {aprobado ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
                ¡Tu mensaje ha sido programado exitosamente!
              </h1>
              <p className="text-[#666666]">
                Recibirás un recordatorio un día antes del envío. El destinatario recibirá el mensaje en la fecha programada.
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
          {!aprobado && (
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
