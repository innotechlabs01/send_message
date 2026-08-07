import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import CategoryCard from '@/components/CategoryCard';
import { Categoria } from '@/types';
import HeaderBrand from '@/components/header-brand';
import PasoIndicator from '@/components/paso-indicator';

export const metadata: Metadata = {
  title: 'Elige una categoría',
  description:
    'Selecciona la categoría de mensaje que mejor se adapte a la ocasión: cumpleaños, amor, amistad y más.',
  openGraph: {
    title: 'Elige una categoría | ConSentido',
    description: 'Selecciona la categoría de mensaje para tu ocasión especial.',
    url: '/categorias',
  },
};

export const revalidate = 86400;

async function obtenerCategorias(): Promise<{ data: Categoria[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('activa', true)
      .order('nombre');

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return { data: null, error: 'El servicio de base de datos no está disponible. Verifica que el proyecto de Supabase esté activo.' };
    }
    return { data: null, error: 'No se pudo conectar con la base de datos.' };
  }
}

export default async function PaginaCategorias() {
  const { data: categorias, error } = await obtenerCategorias();

  return (
    <main className="w-full min-h-screen bg-neutral-100 text-text-primary font-poppins">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-6 pt-10 pb-16">
        <HeaderBrand />
        <PasoIndicator texto="Paso 1 / 4" />

        <section className="mt-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">¿Cuál es la ocasión?</h1>
          <p className="mt-3 text-base text-text-secondary max-sm:text-sm">
            Elige una categoría para empezar a darle forma a tu mensaje.
          </p>
        </section>

        <section className="mt-10">
          {error ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-center space-y-2">
              <p className="text-red-700 font-medium">No se pudieron cargar las categorías</p>
              <p className="text-red-500 text-sm">{error}</p>
              <p className="text-text-secondary text-sm">Verifica tu conexión e intenta recargar la página.</p>
            </div>
          ) : categorias && categorias.length === 0 ? (
            <p className="text-center text-text-secondary">No hay categorías disponibles en este momento.</p>
          ) : (
            <ul
              className="mx-auto grid w-full max-w-4xl grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Categorías de mensajes"
            >
              {categorias!.map((cat) => (
                <li key={cat.id} className="w-full max-w-[260px]">
                  <CategoryCard categoria={cat} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
