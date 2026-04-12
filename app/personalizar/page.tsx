'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { personalizarSchema } from '@/lib/validations';
import { MensajePrediseniado } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MessagePreview from '@/components/MessagePreview';
import Stepper from '@/components/Stepper';

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
    <main className="min-h-screen px-4 py-12 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#333333] mb-1">Personaliza tu mensaje</h1>
        <p className="text-[#666666] text-sm">
          Ingresa los nombres para personalizar el mensaje.
        </p>
      </div>

      <div className="mb-8">
        <Stepper />
      </div>

      {/* Mensaje seleccionado */}
      <div className="bg-[#ECECEC] border border-[#CCCCCC] rounded-xl p-4 mb-8">
        <p className="text-xs text-[#666666] mb-1 font-medium uppercase tracking-wide">
          Mensaje seleccionado
        </p>
        <p className="text-sm text-[#333333] leading-relaxed line-clamp-3">{mensaje.texto}</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleGenerar} noValidate className="space-y-5">
        <Input
          label="Nombre del destinatario"
          placeholder="Ej: María"
          value={nombreDestinatario}
          onChange={(e) => setNombreDestinatario(e.target.value)}
          error={errores.nombre_destinatario}
          hint="¿A quién le envías el mensaje?"
          autoComplete="off"
        />
        <Input
          label="Tu nombre"
          placeholder="Ej: Carlos"
          value={nombreRemitente}
          onChange={(e) => setNombreRemitente(e.target.value)}
          error={errores.nombre_remitente}
          hint="¿Quién envía el mensaje?"
          autoComplete="off"
        />
        <Button type="submit" variante="primary" className="w-full mt-2">
          Generar mensaje
        </Button>
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
    </main>
  );
}
