import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { ApiResponse, ApiError, MensajePrediseniado } from '@/types';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoria = searchParams.get('categoria');
  const excluirParam = searchParams.get('excluir');

  if (!categoria) {
    const error: ApiError = {
      error: { code: 'PARAM_REQUERIDO', message: 'El parámetro categoria es requerido.' },
    };
    return NextResponse.json(error, { status: 400 });
  }

  const excluir = excluirParam
    ? excluirParam.split(',').filter((id) => id.trim().length > 0)
    : [];

  const supabase = getSupabaseAdmin();

  // Primero obtener el categoria_id basado en el nombre (case-insensitive)
  // Usar LOWER para comparación case-insensitive
  const { data: categoriaData, error: categoriaError } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('activa', true);

  if (categoriaError) {
    console.error('Error fetching categorias:', categoriaError);
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: 'Error al obtener categorías.' } },
      { status: 500 }
    );
  }

  if (!categoriaData || categoriaData.length === 0) {
    return NextResponse.json(
      { error: { code: 'CATEGORIA_NO_ENCONTRADA', message: 'Categoría no encontrada.' } },
      { status: 404 }
    );
  }

  // Buscar la categoría ignorando mayúsculas/minúsculas y acentos
  // Normalizar los strings para comparación (remover acentos)
  const normalize = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const categoriaNormalizada = normalize(categoria);
  
  const categoriaEncontrada = categoriaData.find(
    (c) => normalize(c.nombre) === categoriaNormalizada
  );

  if (!categoriaEncontrada) {
    return NextResponse.json(
      { error: { code: 'CATEGORIA_NO_ENCONTRADA', message: 'Categoría no encontrada.' } },
      { status: 404 }
    );
  }

  // Luego obtener los mensajes de esa categoría, excluyendo los especificados
  let query = supabase
    .from('mensajes_prediseniados')
    .select('*')
    .eq('categoria_id', categoriaEncontrada.id)
    .eq('activo', true);

  if (excluir.length > 0) {
    query = query.not('id', 'in', `(${excluir.join(',')})`);
  }

  const { data, error } = await query.limit(5);

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: 'Error al obtener mensajes.' } },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: { code: 'SIN_MENSAJES', message: 'No hay más mensajes disponibles en esta categoría.' } },
      { status: 404 }
    );
  }

  const mezclados = [...data].sort(() => Math.random() - 0.5).slice(0, 5);

  const respuesta: ApiResponse<MensajePrediseniado[]> = {
    data: mezclados,
    meta: { timestamp: new Date().toISOString() },
  };

  return NextResponse.json(respuesta);
}
