import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import CategoryCard from '@/components/CategoryCard';
import { Categoria } from '@/types';

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
  } catch (err) {
    return { data: null, error: 'No se pudo conectar con la base de datos.' };
  }
}

export default async function PaginaCategorias() {
  const { data: categorias, error } = await obtenerCategorias();

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-[#333333] mb-2">¿Cuál es la ocasión?</h1>
        <p className="text-[#666666]">Elige la categoría que mejor describe tu mensaje</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-2">
          <p className="text-red-700 font-medium">No se pudieron cargar las categorías</p>
          <p className="text-red-500 text-sm">{error}</p>
          <p className="text-[#666666] text-sm">Verifica tu conexión e intenta recargar la página.</p>
        </div>
      ) : categorias && categorias.length === 0 ? (
        <p className="text-center text-[#666666]">No hay categorías disponibles en este momento.</p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-4" aria-label="Categorías de mensajes">
          {categorias!.map((cat) => (
            <li key={cat.id}>
              <CategoryCard categoria={cat} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
