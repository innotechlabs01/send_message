'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface DatosEnvio {
  texto_final: string;
  nombre_destinatario: string;
  nombre_remitente: string;
  celular_destinatario: string;
  fecha_envio: string;
}

const PRECIO_COP = 5000;

function enmascararCelular(cel: string): string {
  if (!cel || cel.length < 4) return '******';
  return `******${cel.slice(-4)}`;
}

export default function PaymentSummary() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosEnvio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const guardado = sessionStorage.getItem('datos_envio');
    if (!guardado) { router.replace('/categorias'); return; }
    const parsed = JSON.parse(guardado);
    if (!parsed.texto_final) { router.replace('/categorias'); return; }
    setDatos(parsed);
  }, [router]);

  const handlePagar = async () => {
    if (!datos) return;
    setCargando(true);
    setError(null);

    try {
      // En producción se obtiene el token de reCAPTCHA v3 aquí
      const recaptchaToken = 'token-dev';
      const referencia = `MSG-${Date.now()}`;

      const res = await fetch('/api/pago/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referencia,
          monto: PRECIO_COP,
          descripcion: `Mensaje programado para ${datos.nombre_destinatario}`,
          recaptchaToken,
        }),
      });

      const json = await res.json();

      if (!res.ok || 'error' in json) {
        setError(json.error?.message ?? 'Error al iniciar el pago. Intenta de nuevo.');
        return;
      }

      // Guardar referencia y redirigir a PSE
      sessionStorage.setItem('referencia_pago', json.data.referencia ?? referencia);
      window.location.href = json.data.checkoutUrl;
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  if (!datos) return null;

  return (
    <div className="space-y-6">
      {/* Resumen */}
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
          <div className="flex justify-between border-t border-[#CCCCCC] pt-2 mt-2">
            <span className="font-semibold text-[#333333]">Total:</span>
            <span className="font-bold text-[#4A90D9]">
              {PRECIO_COP.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-red-600 text-sm text-center">
          {error}
        </p>
      )}

      <Button variante="primary" onClick={handlePagar} cargando={cargando} className="w-full text-base py-3">
        Pagar con PSE
      </Button>

      <p className="text-xs text-center text-[#999999]">
        Pago seguro procesado por PlacetoPay
      </p>
    </div>
  );
}
