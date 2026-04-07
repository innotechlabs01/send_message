'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { FormularioContacto } from '@/components/FormularioContacto';
import type { DatosContactoInput } from '@/lib/validations';

interface DatosEnvio {
  texto_final: string;
  nombre_destinatario: string;
  nombre_remitente: string;
  celular_destinatario: string;
  celular_remitente: string;
  fecha_envio: string;
}

interface BoldConfig {
  orderId: string;
  amount: number;
  currency: string;
  apiKey: string;
  integritySignature: string;
  descripcion: string;
}

function enmascararCelular(cel: string): string {
  if (!cel || cel.length < 4) return '******';
  return `******${cel.slice(-4)}`;
}

export default function PaymentSummary() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosEnvio | null>(null);
  const [boldConfig, setBoldConfig] = useState<BoldConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [formularioEnviado, setFormularioEnviado] = useState(false);
  const scriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const guardado = sessionStorage.getItem('datos_envio');
    if (!guardado) { router.replace('/categorias'); return; }
    const parsed = JSON.parse(guardado);
    if (!parsed.texto_final) { router.replace('/categorias'); return; }
    setDatos(parsed);
  }, [router]);

  // Cuando el formulario de contacto se envía, guardar datos y obtener config de Bold
  const handleFormularioContactoSubmit = async (datosForm: DatosContactoInput) => {
    setFormularioEnviado(true);
    setGuardando(true);
    setError(null);

    if (!datos) return;

    try {
      // 1. Guardar mensaje en DB con datos de contacto
      const resMensaje = await fetch('/api/mensajes/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...datos,
          ...datosForm,
        }),
      });

      if (!resMensaje.ok) {
        const json = await resMensaje.json();
        setError(json.error?.message ?? 'Error al guardar el mensaje.');
        setFormularioEnviado(false);
        return;
      }

      // 2. Obtener config de Bold (orderId + hash generados en servidor)
      const resBold = await fetch('/api/pago/bold-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: `Mensaje para ${datos.nombre_destinatario}`,
        }),
      });

      const jsonBold = await resBold.json();
      if (!resBold.ok || 'error' in jsonBold) {
        setError(jsonBold.error?.message ?? 'Error al configurar el pago.');
        setFormularioEnviado(false);
        return;
      }

      setBoldConfig(jsonBold.data);
      sessionStorage.setItem('referencia_pago', jsonBold.data.orderId);
      setListo(true);
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setFormularioEnviado(false);
    } finally {
      setGuardando(false);
    }
  };

  // Inyectar el script del botón Bold una vez que tenemos la config
  useEffect(() => {
    if (!listo || !boldConfig || !scriptRef.current) return;

    // Limpiar botón previo si existe
    scriptRef.current.innerHTML = '';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const script = document.createElement('script');
    script.setAttribute('data-bold-button', 'dark-L');
    script.setAttribute('data-api-key', boldConfig.apiKey);
    script.setAttribute('data-order-id', boldConfig.orderId);
    script.setAttribute('data-currency', boldConfig.currency);
    script.setAttribute('data-amount', String(boldConfig.amount));
    script.setAttribute('data-integrity-signature', boldConfig.integritySignature);
    script.setAttribute('data-description', boldConfig.descripcion);
    script.setAttribute('data-render-mode', 'embedded');
    script.setAttribute('data-redirection-url', `${appUrl}/confirmacion`);

    scriptRef.current.appendChild(script);

    // Forzar que el SDK de Bold procese el nuevo script
    if (typeof window !== 'undefined' && (window as Window & { Bold?: { refresh?: () => void } }).Bold?.refresh) {
      (window as Window & { Bold?: { refresh?: () => void } }).Bold!.refresh!();
    }
  }, [listo, boldConfig]);

  if (!datos) return null;

  return (
    <>
      {/* Cargar SDK de Bold una sola vez */}
      <Script
        src="https://checkout.bold.co/library/boldPaymentButton.js"
        strategy="afterInteractive"
      />

      <div className="space-y-6">
        {/* Resumen del pedido */}
        <div className="bg-[#ECECEC] border border-[#CCCCCC] rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-[#333333]">Resumen del pedido</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666666]">Para:</span>
              <span className="font-medium text-[#333333]">{datos.nombre_destinatario}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Celular:</span>
              <span className="font-medium text-[#333333]">{enmascararCelular(datos.celular_destinatario)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Fecha de envío:</span>
              <span className="font-medium text-[#333333]">
                {new Date(datos.fecha_envio).toLocaleDateString('es-CO', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </div>
            {boldConfig && (
              <div className="flex justify-between border-t border-[#CCCCCC] pt-2 mt-2">
                <span className="font-semibold text-[#333333]">Total:</span>
                <span className="font-bold text-[#4A90D9]">
                  {boldConfig.amount.toLocaleString('es-CO', {
                    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Formulario de contacto (mostrar si no se ha enviado aún) */}
        {!formularioEnviado && (
          <div className="bg-white border border-[#CCCCCC] rounded-xl p-5">
            <h2 className="font-semibold text-[#333333] mb-4">Datos de contacto</h2>
            <FormularioContacto
              onSubmit={handleFormularioContactoSubmit}
              isLoading={guardando}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-red-600 text-sm text-center">{error}</p>
        )}

        {guardando && (
          <p className="text-center text-sm text-[#666666]">Preparando pago...</p>
        )}

        {/* Contenedor del botón Bold */}
        {listo && <div ref={scriptRef} className="flex justify-center" />}

        <p className="text-xs text-center text-[#999999]">
          Pago seguro procesado por Bold
        </p>
      </div>
    </>
  );
}
