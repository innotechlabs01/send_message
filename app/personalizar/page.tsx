'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { personalizarSchema } from '@/lib/validations';
import { MensajePrediseniado } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MessagePreview from '@/components/MessagePreview';
import HeaderBrand from '@/components/header-brand';
import PasoIndicator from '@/components/paso-indicator';

interface Errores {
  nombre_destinatario?: string;
  nombre_remitente?: string;
}

export default function PaginaPersonalizar() {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<MensajePrediseniado | null>(null);
  const [nombreDestinatario, setNombreDestinatario] = useState('');
  const [nombreRemitente, setNombreRemitente] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    const guardado = sessionStorage.getItem('mensaje_seleccionado');
    if (!guardado) {
      router.replace('/categorias');
      return;
    }
    setMensaje(JSON.parse(guardado));
  }, [router]);

  const validar = (): boolean => {
    const resultado = personalizarSchema.safeParse({
      nombre_destinatario: nombreDestinatario,
      nombre_remitente: nombreRemitente,
    });

    if (!resultado.success) {
      const campos: Errores = {};
      resultado.error.issues.forEach((e) => {
        const campo = e.path[0] as keyof Errores;
        campos[campo] = e.message;
      });
      setErrores(campos);
      return false;
    }
    setErrores({});
    return true;
  };

  const handleGenerar = (e: React.FormEvent) => {
    e.preventDefault();
    if (validar()) setModalAbierto(true);
  };

  if (!mensaje) return null;

  return (
    <main className="w-full min-h-screen bg-neutral-100 text-text-primary font-poppins">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-6 pt-10 pb-16">
        <HeaderBrand />
        <PasoIndicator texto="Paso 3 / 4" href={`/mensajes/${mensaje.categoria_id}`} />

        <section className="mt-8">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Confirmar mensaje</h1>
          <p className="mt-2 text-base text-text-secondary">Completa los datos para personalizar tu mensaje.</p>
        </section>

        {/* Mensaje seleccionado */}
        <section className="mt-8">
          <p className="text-xs font-medium text-text-secondary mb-2">Mensaje seleccionado</p>
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-5 shadow-xs">
            <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{mensaje.texto}</p>
          </div>
        </section>

        {/* Formulario */}
        <form onSubmit={handleGenerar} noValidate className="mt-8 space-y-5">
          <Input
            label="Nombre del destinatario"
            placeholder="Ej: María"
            value={nombreDestinatario}
            onChange={(e) => setNombreDestinatario(e.target.value)}
            error={errores.nombre_destinatario}
            autoComplete="off"
          />
          <Input
            label="Tu nombre"
            placeholder="Ej: Carlos"
            value={nombreRemitente}
            onChange={(e) => setNombreRemitente(e.target.value)}
            error={errores.nombre_remitente}
            autoComplete="off"
          />
          <div className="pt-2">
            <Button type="submit" variante="primary" className="w-full">
              Generar mensaje
            </Button>
          </div>
        </form>

        {/* Modal de vista previa */}
        <MessagePreview
          abierto={modalAbierto}
          datos={{
            nombreDestinatario,
            nombreRemitente,
            textoBase: mensaje.texto,
          }}
          onCerrar={() => setModalAbierto(false)}
          onAceptar={(textoFinal) => {
            sessionStorage.setItem(
              'datos_envio',
              JSON.stringify({ texto_final: textoFinal, nombre_destinatario: nombreDestinatario, nombre_remitente: nombreRemitente })
            );
            setModalAbierto(false);
            router.push('/envio');
          }}
        />

        <footer className="mt-12 text-center text-sm text-text-tertiary">
          <p>© 2026 ConSentido - Palabras con intención</p>
        </footer>
      </div>
    </main>
  );
}
