import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse, ApiError, MensajePrediseniado } from '@/types';

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

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: 'No se pudo conectar con la base de datos.' } },
      { status: 503 }
    );
  }

  let query = supabase
    .from('mensajes_prediseniados')
    .select('*')
    .eq('categoria_id', categoria)
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
