'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SendForm from '@/components/SendForm';
import HeaderBrand from '@/components/header-brand';
import PasoIndicator from '@/components/paso-indicator';

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
    <main className="w-full min-h-screen bg-neutral-100 text-text-primary font-poppins">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-6 pt-10 pb-16">
        <HeaderBrand />
        <PasoIndicator texto="Paso 3 / 4" href="/personalizar" />

        <section className="mt-8">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Datos de envío</h1>
          <p className="mt-2 text-base text-text-secondary">
            Ingresa la fecha y los celulares para programar el envío de tu mensaje.
          </p>
        </section>

        {/* Resumen del mensaje */}
        <section className="mt-8">
          <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-5 shadow-xs">
            <p className="text-xs font-medium text-text-secondary mb-1">Para: {datos.nombre_destinatario}</p>
            <p className="text-sm text-text-primary leading-relaxed line-clamp-2">{datos.texto_final}</p>
          </div>
        </section>

        {/* Formulario de envío */}
        <section className="mt-8 w-full max-w-lg">
          <SendForm datosIniciales={datos} />
        </section>

        <footer className="mt-12 text-center text-sm text-text-tertiary">
          <p>© 2026 ConSentido - Palabras con intención</p>
        </footer>
      </div>
    </main>
  );
}
