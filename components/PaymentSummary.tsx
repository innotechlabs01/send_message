'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { FormularioContacto } from '@/components/FormularioContacto';
import Button from '@/components/ui/Button';
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

function obtenerDatosContactoIniciales(): { email_contacto: string; nombre_contacto: string; telefono_contacto: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const datos = localStorage.getItem('datos_contacto');
    return datos ? JSON.parse(datos) : null;
  } catch {
    return null;
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
  const [mensajesLocalStorage, setMensajesLocalStorage] = useState(0);
  const [datosContactoGuardados, setDatosContactoGuardados] = useState<{
    email_contacto: string;
    nombre_contacto: string;
    telefono_contacto: string;
  } | null>(null);

  const cargarDatos = () => {
    const guardados = obtenerMensajesGuardados();
    setMensajesLocalStorage(guardados.length);

    const datosContacto = obtenerDatosContactoIniciales();
    if (datosContacto) {
      setDatosContactoGuardados(datosContacto);
    }
  };

  useEffect(() => {
    const guardado = sessionStorage.getItem('datos_envio');
    if (!guardado) { router.replace('/categorias'); return; }
    const parsed = JSON.parse(guardado);
    if (!parsed.texto_final) { router.replace('/categorias'); return; }
    setDatos(parsed);

    cargarDatos();
    
    // Recargar cada que el componente se monta (cada navegación)
    const interval = setInterval(cargarDatos, 300);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    window.addEventListener('focus', cargarDatos);
    return () => window.removeEventListener('focus', cargarDatos);
  }, []);

  // Cuando el formulario de contacto se envía
  const handleFormularioContactoSubmit = async (datosForm: DatosContactoInput, programarMas: boolean) => {
    setFormularioEnviado(true);
    setGuardando(true);
    setError(null);

    if (!datos) {
      setGuardando(false);
      return;
    }

    // Guardar datos de contacto en localStorage inmediatamente
    localStorage.setItem('datos_contacto', JSON.stringify(datosForm));
    setDatosContactoGuardados(datosForm);

    try {
      const mensajeCompleto: MensajeGuardado = {
        ...datos,
        ...datosForm,
      };

      // Siempre guardar el mensaje actual en localStorage primero
      guardarMensajeEnStorage(mensajeCompleto);
      
      // Obtener TODOS los mensajes del localStorage (incluidos los anteriores)
      const guardados = obtenerMensajesGuardados();
      const cantidadTotal = guardados.length;

      if (programarMas) {
        setMensajesLocalStorage(cantidadTotal);
        
        sessionStorage.removeItem('datos_envio');
        window.location.href = '/categorias';
        return;
      }

      // Proceder al pago: guardar TODOS los mensajes en la base de datos
      const resMensaje = await fetch('/api/mensajes/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensajes: guardados,
        }),
      });

      if (!resMensaje.ok) {
        const json = await resMensaje.json();
        setError(json.error?.message ?? 'Error al guardar los mensajes.');
        setFormularioEnviado(false);
        setGuardando(false);
        return;
      }

      const resBold = await fetch('/api/pago/bold-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: `${cantidadTotal} mensaje(s) programado(s)`,
          cantidad: cantidadTotal,
        }),
      });

      const jsonBold = await resBold.json();
      if (!resBold.ok || 'error' in jsonBold) {
        setError(jsonBold.error?.message ?? 'Error al configurar el pago.');
        setFormularioEnviado(false);
        setGuardando(false);
        return;
      }

      setBoldConfig(jsonBold.data);
      sessionStorage.setItem('referencia_pago', jsonBold.data.orderId);
      sessionStorage.setItem('cantidad_mensajes', String(cantidadTotal));
      
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('datos_contacto');
      setMensajesLocalStorage(0);
      setDatosContactoGuardados(null);
      
      setListo(true);
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setFormularioEnviado(false);
    } finally {
      setGuardando(false);
    }
  };

  // Inicializar y mostrar el botón de Bold
  const iniciarPagoBold = () => {
    if (!boldConfig) return;

    const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') ?? 'https://send-message-theta.vercel.app';

    const checkout = new (window as unknown as { BoldCheckout: new (config: unknown) => { open: () => void } }).BoldCheckout({
      orderId: boldConfig.orderId,
      currency: boldConfig.currency,
      amount: String(boldConfig.amount),
      apiKey: boldConfig.apiKey,
      integritySignature: boldConfig.integritySignature,
      description: boldConfig.descripcion,
      renderMode: 'embedded',
      redirectionUrl: `${appUrl}/confirmacion`,
    });

    checkout.open();
  };

  // Mostrar botón de pago cuando está listo
  const mostrarBotonPago = listo && boldConfig;

  if (!datos) return null;

  const cantidadTotalConActual = mensajesLocalStorage + 1;
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
        {mensajesLocalStorage > 0 && (
          <div className="bg-[#E8F5E9] border border-[#4CAF50] rounded-xl p-4">
            <p className="text-sm text-[#2E7D32] font-medium">
              ✅ Tienes {mensajesLocalStorage} mensaje{mensajesLocalStorage !== 1 ? 's' : ''} pendiente{mensajesLocalStorage !== 1 ? 's' : ''} de programar
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
              datosIniciales={datosContactoGuardados ?? undefined}
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

        {/* Botón de pago Bold */}
        {mostrarBotonPago && (
          <Button 
            variante="primary" 
            className="w-full"
            onClick={iniciarPagoBold}
          >
            💳 Pagar con Bold
          </Button>
        )}

        <p className="text-xs text-center text-[#999999]">
          Pago seguro procesado por Bold
        </p>
      </div>
    </>
  );
}
