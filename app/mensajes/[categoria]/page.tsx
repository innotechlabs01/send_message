import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ListaMensajes from '@/components/ListaMensajes';
import HeaderBrand from '@/components/header-brand';
import PasoIndicator from '@/components/paso-indicator';
import { Categoria, MensajePrediseniado } from '@/types';

interface Props {
  params: Promise<{ categoria: string }>;
}

async function obtenerCategoria(id: string): Promise<Categoria | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .eq('activa', true)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

async function obtenerMensajes(
  categoriaId: string
): Promise<{ data: MensajePrediseniado[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('mensajes_prediseniados')
      .select('*')
      .eq('categoria_id', categoriaId)
      .eq('activo', true)
      .limit(100);

    if (error) return { data: null, error: error.message };
    if (!data || data.length === 0) return { data: [], error: null };
    return { data: [...data].sort(() => Math.random() - 0.5).slice(0, 5), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return { data: null, error: 'El servicio de base de datos no está disponible. Verifica que el proyecto de Supabase esté activo.' };
    }
    return { data: null, error: 'No se pudo conectar con la base de datos.' };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const cat = await obtenerCategoria(categoria);
  if (!cat) return { title: 'Categoría no encontrada' };
  return {
    title: `Mensajes de ${cat.nombre}`,
    description: `Elige entre nuestros mensajes prediseñados de ${cat.nombre} y personalízalos para tu ser querido.`,
    openGraph: {
      title: `Mensajes de ${cat.nombre} | ConSentido`,
      description: `Mensajes prediseñados de ${cat.nombre} para enviar con amor.`,
    },
  };
}

export default async function PaginaMensajes({ params }: Props) {
  const { categoria } = await params;
  const [cat, { data: mensajes, error }] = await Promise.all([
    obtenerCategoria(categoria),
    obtenerMensajes(categoria),
  ]);

  if (!cat) notFound();

  return (
    <main className="w-full min-h-screen bg-neutral-100 text-text-primary font-poppins">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-6 pt-10 pb-16">
        <HeaderBrand />
        <PasoIndicator texto="Paso 2 / 4" href="/categorias" />

        <section className="mb-2 mt-6">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            {cat.icono} Mensajes para {cat.nombre}
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Elige el que más resuene contigo. Si ninguno te convence, genera cinco nuevos.
          </p>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700 font-medium">No se pudieron cargar los mensajes</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <Link href="/categorias" className="text-primary-450 hover:underline text-sm block mt-2">
              Volver a categorías
            </Link>
          </div>
        ) : mensajes && mensajes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">No hay mensajes disponibles en esta categoría.</p>
            <Link href="/categorias" className="text-primary-450 hover:underline text-sm">
              Volver a categorías
            </Link>
          </div>
        ) : (
          <ListaMensajes mensajesIniciales={mensajes!} categoriaId={categoria} categoria={cat} />
        )}

        <footer className="mt-12 text-center text-sm text-text-tertiary">
          <p>© 2026 ConSentido - Palabras con intención</p>
        </footer>
      </div>
    </main>
  );
}
