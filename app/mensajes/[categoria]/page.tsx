import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ListaMensajes from '@/components/ListaMensajes';
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
  } catch {
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
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <nav aria-label="Migas de pan" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-[#666666]">
          <li>
            <Link href="/categorias" className="hover:text-[#4A90D9] transition-colors">
              Categorías
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[#333333] font-medium" aria-current="page">
            {cat.icono} {cat.nombre}
          </li>
        </ol>
      </nav>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#333333] mb-2">
          {cat.icono} {cat.nombre}
        </h1>
        <p className="text-[#666666]">Selecciona el mensaje que más te guste</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-2">
          <p className="text-red-700 font-medium">No se pudieron cargar los mensajes</p>
          <p className="text-red-500 text-sm">{error}</p>
          <Link href="/categorias" className="text-[#4A90D9] hover:underline text-sm block mt-2">
            Volver a categorías
          </Link>
        </div>
      ) : mensajes && mensajes.length === 0 ? (
        <div className="text-center space-y-3">
          <p className="text-[#666666]">No hay mensajes disponibles en esta categoría.</p>
          <Link href="/categorias" className="text-[#4A90D9] hover:underline text-sm">
            Volver a categorías
          </Link>
        </div>
      ) : (
        <ListaMensajes mensajesIniciales={mensajes!} categoriaId={categoria} />
      )}
    </main>
  );
}
