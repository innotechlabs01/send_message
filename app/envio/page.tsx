'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SendForm from '@/components/SendForm';

interface DatosEnvio {
  texto_final: string;
  nombre_destinatario: string;
  nombre_remitente: string;
}

export default function PaginaEnvio() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosEnvio | null>(null);

  useEffect(() => {
    const guardado = sessionStorage.getItem('datos_envio');
    if (!guardado) {
      router.replace('/categorias');
      return;
    }
    const parsed = JSON.parse(guardado);
    if (!parsed.texto_final) {
      router.replace('/categorias');
      return;
    }
    setDatos(parsed);
  }, [router]);

  if (!datos) return null;

  return (
    <main className="min-h-screen px-4 py-12 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#333333] mb-2">Datos de envío</h1>
        <p className="text-[#666666] text-sm">
          Ingresa la fecha y los celulares para programar el envío.
        </p>
      </div>

      {/* Resumen del mensaje */}
      <div className="bg-[#ECECEC] border border-[#CCCCCC] rounded-xl p-4 mb-8">
        <p className="text-xs text-[#666666] mb-1 font-medium uppercase tracking-wide">
          Para: {datos.nombre_destinatario}
        </p>
        <p className="text-sm text-[#333333] leading-relaxed line-clamp-2">{datos.texto_final}</p>
      </div>

      <SendForm datosIniciales={datos} />
    </main>
  );
}
