'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { FormularioContacto } from '@/components/FormularioContacto';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { DatosContactoInput } from '@/lib/validations';

const STORAGE_KEY = 'mensajes_programados_pendientes';
const STORAGE_CONTACTO = 'datos_contacto';
const SESSION_DATOS_ENVIO = 'datos_envio';
const PRECIO_UNITARIO = 2000;
const IVA_POR_MENSAJE = 380;
const PRECIO_TOTAL_POR_MENSAJE = 2380;

interface DatosEnvio {
  texto_final: string;
  nombre_destinatario: string;
  nombre_remitente: string;
  celular_destinatario: string;
  celular_remitente: string;
  fecha_envio: string;
}

interface MensajeCompleto extends DatosEnvio {
  email_contacto?: string;
  nombre_contacto?: string;
  telefono_contacto?: string;
}

interface BoldConfig {
  orderId: string;
  amount: number;
  currency: string;
  apiKey: string;
  integritySignature: string;
  descripcion: string;
}

function obtenerMensajesLocalStorage(): MensajeCompleto[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function obtenerDatosContactoLocalStorage(): { email_contacto: string; nombre_contacto: string; telefono_contacto: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_CONTACTO);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function guardarMensajeLocalStorage(mensaje: MensajeCompleto): void {
  const mensajes = obtenerMensajesLocalStorage();
  mensajes.push(mensaje);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes));
}

function enmascararCelular(cel: string): string {
  if (!cel || cel.length < 4) return '******';
  return `******${cel.slice(-4)}`;
}

function formatearFecha(fechaStr: string): string {
  const [year, month, day] = fechaStr.split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatearPrecio(cantidad: number): string {
  return cantidad.toLocaleString('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  });
}

export default function PaymentSummary() {
  const router = useRouter();
  const { showToast } = useToast();

  const [mensajeActual, setMensajeActual] = useState<DatosEnvio | null>(null);
  const [mensajesPendientes, setMensajesPendientes] = useState<MensajeCompleto[]>([]);
  const [datosContacto, setDatosContacto] = useState<{ email_contacto: string; nombre_contacto: string; telefono_contacto: string } | null>(null);
  
  const [boldConfig, setBoldConfig] = useState<BoldConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [formularioEnviado, setFormularioEnviado] = useState(false);

  const cantidadTotal = mensajesPendientes.length + (mensajeActual ? 1 : 0);
  const precioIva = cantidadTotal * IVA_POR_MENSAJE;
  const precioTotal = cantidadTotal * PRECIO_TOTAL_POR_MENSAJE;

  useEffect(() => {
    mensajesPendientes.forEach(m => console.log('MSG:', m));
    console.log('Actual:', mensajeActual);
  }, [mensajesPendientes, mensajeActual]);

  useEffect(() => {
    const mensajes = obtenerMensajesLocalStorage();
    setMensajesPendientes(mensajes);

    const contacto = obtenerDatosContactoLocalStorage();
    if (contacto) {
      setDatosContacto(contacto);
    }

    const datosEnvio = sessionStorage.getItem(SESSION_DATOS_ENVIO);
    if (!datosEnvio) {
      showToast('Selecciona un mensaje para continuar', 'warning');
      setTimeout(() => router.replace('/categorias'), 1000);
      return;
    }

    const parsed = JSON.parse(datosEnvio);
    if (!parsed.texto_final) {
      showToast('Personaliza tu mensaje antes de continuar', 'warning');
      setTimeout(() => router.replace('/personalizar'), 1000);
      return;
    }

    setMensajeActual(parsed);
  }, [router, showToast]);

  const handleFormularioSubmit = async (datosForm: DatosContactoInput, programarMas: boolean) => {
    if (guardando || !mensajeActual) return;

    setGuardando(true);
    setError(null);

    const mensajeCompleto: MensajeCompleto = {
      ...mensajeActual,
      ...datosForm,
    };

    localStorage.setItem(STORAGE_CONTACTO, JSON.stringify(datosForm));

    if (programarMas) {
      guardarMensajeLocalStorage(mensajeCompleto);
      const nuevaCantidad = mensajesPendientes.length + 1;
      showToast(`${nuevaCantidad} mensaje(s) guardado(s). ¡Programa otro!`, 'success');
      
      sessionStorage.removeItem(SESSION_DATOS_ENVIO);
      setTimeout(() => {
        window.location.href = '/categorias';
      }, 1200);
      return;
    }

    guardarMensajeLocalStorage(mensajeCompleto);
    setFormularioEnviado(true);

    try {
      const todosLosMensajes = [...mensajesPendientes, mensajeCompleto];

      const resMensaje = await fetch('/api/mensajes/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajes: todosLosMensajes }),
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
          descripcion: `${todosLosMensajes.length} mensaje(s) programado(s)`,
          cantidad: todosLosMensajes.length,
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
      sessionStorage.setItem('cantidad_mensajes', String(todosLosMensajes.length));
      
      setListo(true);
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setFormularioEnviado(false);
    } finally {
      setGuardando(false);
    }
  };

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

  if (!mensajeActual) return null;

  return (
    <>
      <Script
        src="https://checkout.bold.co/library/boldPaymentButton.js"
        strategy="afterInteractive"
      />

      <div className="space-y-6">
        {cantidadTotal > 1 && (
          <div className="bg-success-50 border border-success-400 rounded-xl p-4">
            <p className="text-sm text-success-600 font-medium">
              Tienes {cantidadTotal} mensajes programados
            </p>
          </div>
        )}

        {mensajeActual && (
          <div className="bg-surface-secondary border border-border rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-text-primary">Mensaje actual</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Para:</span>
                <span className="font-medium text-text-primary">{mensajeActual.nombre_destinatario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Celular:</span>
                <span className="font-medium text-text-primary">{enmascararCelular(mensajeActual.celular_destinatario)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Fecha de envío:</span>
                <span className="font-medium text-text-primary">{formatearFecha(mensajeActual.fecha_envio)}</span>
              </div>
            </div>
          </div>
        )}

        {mensajesPendientes.length > 0 && (
          <div className="bg-surface-secondary border border-border rounded-xl p-5">
            <h2 className="font-semibold text-text-primary mb-3">Mensajes guardados ({mensajesPendientes.length})</h2>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {mensajesPendientes.map((msg, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-border pb-2 last:border-0">
                  <span className="text-text-secondary">Para {msg.nombre_destinatario}</span>
                  <span className="text-text-tertiary text-xs">{formatearFecha(msg.fecha_envio)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface-secondary border border-border rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-text-primary mb-3">Desglose de precio</h2>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Cantidad de mensajes:</span>
            <span className="font-medium text-text-primary">{cantidadTotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Precio por mensaje:</span>
            <span className="text-text-primary">{formatearPrecio(PRECIO_UNITARIO)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">IVA (19%):</span>
            <span className="text-text-primary">{formatearPrecio(precioIva)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-semibold text-text-primary">Total a pagar:</span>
            <span className="font-bold text-primary-400">{formatearPrecio(precioTotal)}</span>
          </div>
        </div>

        {!formularioEnviado && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-semibold text-text-primary mb-4">Datos de contacto</h2>
            <FormularioContacto
              datosIniciales={datosContacto ?? undefined}
              onSubmit={handleFormularioSubmit}
              isLoading={guardando}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-red-600 text-sm text-center">{error}</p>
        )}

        {guardando && !formularioEnviado && (
          <p className="text-center text-sm text-text-tertiary">Preparando...</p>
        )}

        {listo && boldConfig && (
          <Button variante="primary" className="w-full" onClick={iniciarPagoBold}>
            Pagar {formatearPrecio(boldConfig.amount)}
          </Button>
        )}

        <p className="text-xs text-center text-text-tertiary">
          Pago seguro procesado por Bold
        </p>
      </div>
    </>
  );
}
