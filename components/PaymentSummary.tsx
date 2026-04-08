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

interface MensajeGuardado extends DatosEnvio {
  email_contacto: string;
  nombre_contacto: string;
  telefono_contacto: string;
}

interface BoldConfig {
  orderId: string;
  amount: number;
  currency: string;
  apiKey: string;
  integritySignature: string;
  descripcion: string;
}

const STORAGE_KEY = 'mensajes_programados_pendientes';
const PRECIO_UNITARIO = 2380;

function enmascararCelular(cel: string): string {
  if (!cel || cel.length < 4) return '******';
  return `******${cel.slice(-4)}`;
}

function obtenerMensajesGuardados(): MensajeGuardado[] {
  if (typeof window === 'undefined') return [];
  try {
    const almacenados = localStorage.getItem(STORAGE_KEY);
    return almacenados ? JSON.parse(almacenados) : [];
  } catch {
    return [];
  }
}

function guardarMensajeEnStorage(mensaje: MensajeGuardado) {
  if (typeof window === 'undefined') return;
  try {
    const existentes = obtenerMensajesGuardados();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existentes, mensaje]));
  } catch {
    console.error('Error guardando en localStorage');
  }
}

export default function PaymentSummary() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosEnvio | null>(null);
  const [boldConfig, setBoldConfig] = useState<BoldConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [formularioEnviado, setFormularioEnviado] = useState(false);
  const [mensajesGuardados, setMensajesGuardados] = useState(0);
  const scriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const guardado = sessionStorage.getItem('datos_envio');
    if (!guardado) { router.replace('/categorias'); return; }
    const parsed = JSON.parse(guardado);
    if (!parsed.texto_final) { router.replace('/categorias'); return; }
    setDatos(parsed);

    // Cargar cantidad de mensajes guardados
    const guardados = obtenerMensajesGuardados();
    setMensajesGuardados(guardados.length);
  }, [router]);

  // Cuando el formulario de contacto se envía
  const handleFormularioContactoSubmit = async (datosForm: DatosContactoInput, programarMas: boolean) => {
    console.log('handleFormularioContactoSubmit called', { programarMas, datosForm });
    setFormularioEnviado(true);
    setGuardando(true);
    setError(null);

    if (!datos) {
      console.log('No datos found');
      setGuardando(false);
      return;
    }

    try {
      console.log('datos:', datos);
      console.log('datosForm:', datosForm);
      const mensajeCompleto: MensajeGuardado = {
        ...datos,
        ...datosForm,
      };
      console.log('mensajeCompleto:', mensajeCompleto);

      // Si checkbox MARCADO (programarMas = true): Guardar en LocalStorage y volver a categorías
      if (programarMas) {
        console.log('Guardando en localStorage y navegando a categorias');
        guardarMensajeEnStorage(mensajeCompleto);
        sessionStorage.removeItem('datos_envio');
        window.location.href = '/categorias';
        return;
      }

      console.log('Procediendo al pago, guardando en localStorage');
      // Si checkbox DESMARCADO (programarMas = false): Proceder al pago
      // 1. Guardar mensaje actual en LocalStorage (con contacto)
      guardarMensajeEnStorage(mensajeCompleto);

      // 2. Obtener cantidad total de mensajes (guardados + 1 actual)
      const guardados = obtenerMensajesGuardados();
      const cantidadTotal = guardados.length;

      // 3. Guardar mensaje en DB (incluye campos de contacto)
      console.log('Guardando mensaje en DB, cantidadTotal:', cantidadTotal, 'mensaje:', mensajeCompleto);
      const resMensaje = await fetch('/api/mensajes/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mensajeCompleto),
      });

      if (!resMensaje.ok) {
        const json = await resMensaje.json();
        console.log('Error guardando mensaje:', json);
        setError(json.error?.message ?? 'Error al guardar el mensaje.');
        setFormularioEnviado(false);
        setGuardando(false);
        return;
      }

      // 4. Obtener config de Bold con cantidad de mensajes
      console.log('Obteniendo config de Bold');
      const resBold = await fetch('/api/pago/bold-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: `${cantidadTotal} mensaje(s) programado(s)`,
          cantidad: cantidadTotal,
        }),
      });

      console.log('Obteniendo config de Bold, resBold.status:', resBold.status);
      const jsonBold = await resBold.json();
      console.log('jsonBold response:', jsonBold);
      if (!resBold.ok || 'error' in jsonBold) {
        console.log('Error en bold config:', jsonBold);
        setError(jsonBold.error?.message ?? 'Error al configurar el pago.');
        setFormularioEnviado(false);
        setGuardando(false);
        return;
      }

      console.log('Bold config obtained:', jsonBold.data);
      setBoldConfig(jsonBold.data);
      sessionStorage.setItem('referencia_pago', jsonBold.data.orderId);
      sessionStorage.setItem('cantidad_mensajes', String(cantidadTotal));
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

    if (typeof window !== 'undefined' && (window as Window & { Bold?: { refresh?: () => void } }).Bold?.refresh) {
      (window as Window & { Bold?: { refresh?: () => void } }).Bold!.refresh!();
    }
  }, [listo, boldConfig]);

  if (!datos) return null;

  const cantidadTotalConActual = mensajesGuardados + 1;
  const precioTotal = cantidadTotalConActual * PRECIO_UNITARIO;

  return (
    <>
      {/* Cargar SDK de Bold una sola vez */}
      <Script
        src="https://checkout.bold.co/library/boldPaymentButton.js"
        strategy="afterInteractive"
      />

      <div className="space-y-6">
        {/* Contador de mensajes programados */}
        {mensajesGuardados > 0 && (
          <div className="bg-[#E8F5E9] border border-[#4CAF50] rounded-xl p-4">
            <p className="text-sm text-[#2E7D32] font-medium">
              ✅ Tienes {mensajesGuardados} mensaje{mensajesGuardados !== 1 ? 's' : ''} pendiente{mensajesGuardados !== 1 ? 's' : ''} de programar
            </p>
          </div>
        )}

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
                {(() => {
                  const [year, month, day] = datos.fecha_envio.split('-').map(Number);
                  const fecha = new Date(year, month - 1, day);
                  return fecha.toLocaleDateString('es-CO', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  });
                })()}
              </span>
            </div>
            {boldConfig && (
              <div className="border-t border-[#CCCCCC] pt-2 mt-2 space-y-2">
                {/* Desglose de precio en boldConfig */}
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666]">Cantidad de mensajes:</span>
                  <span className="text-[#333333] font-medium">{cantidadTotalConActual}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666]">Precio por mensaje:</span>
                  <span className="text-[#333333]">
                    {(2000).toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP', minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666]">IVA (19%):</span>
                  <span className="text-[#333333]">
                    {(Math.round(cantidadTotalConActual * 380)).toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP', minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
                {/* Total */}
                <div className="flex justify-between border-t border-[#CCCCCC] pt-2 font-semibold">
                  <span className="text-[#333333]">Total a pagar:</span>
                  <span className="text-[#4A90D9]">
                    {boldConfig.amount.toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP', minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desglose de precio (visible antes del formulario) */}
        <div className="bg-white border border-[#CCCCCC] rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-[#333333] mb-3">Desglose de precio</h2>
          <div className="flex justify-between text-sm">
            <span className="text-[#666666]">Cantidad de mensajes:</span>
            <span className="text-[#333333] font-medium">{cantidadTotalConActual}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#666666]">Precio por mensaje:</span>
            <span className="text-[#333333]">
              {(2000).toLocaleString('es-CO', {
                style: 'currency', currency: 'COP', minimumFractionDigits: 0,
              })}
            </span>
          </div>
          {/* <div className="flex justify-between text-sm">
            <span className="text-[#666666]">Subtotal:</span>
            <span className="text-[#333333]">
              {(cantidadTotalConActual * 2000).toLocaleString('es-CO', {
                style: 'currency', currency: 'COP', minimumFractionDigits: 0,
              })}
            </span>
          </div> */}
          <div className="flex justify-between text-sm">
            <span className="text-[#666666]">IVA (19%):</span>
            <span className="text-[#333333]">
              {(Math.round(cantidadTotalConActual * 380)).toLocaleString('es-CO', {
                style: 'currency', currency: 'COP', minimumFractionDigits: 0,
              })}
            </span>
          </div>
          <div className="flex justify-between border-t border-[#CCCCCC] pt-2 mt-2">
            <span className="font-semibold text-[#333333]">Total a pagar:</span>
            <span className="font-bold text-[#4A90D9]">
              {precioTotal.toLocaleString('es-CO', {
                style: 'currency', currency: 'COP', minimumFractionDigits: 0,
              })}
            </span>
          </div>
        </div>

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
