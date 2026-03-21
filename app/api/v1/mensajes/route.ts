import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, maskPhone } from '@/lib/api-auth';
import { crearMensajeSchema } from '@/lib/validations';
import { ApiResponse, ApiError, MensajeProgramado } from '@/types';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function respuesta401(): NextResponse {
  const error: ApiError = {
    error: { code: 'API_KEY_INVALIDA', message: 'API Key ausente o inválida.' },
  };
  return NextResponse.json(error, { status: 401 });
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') ?? '';
  const empresaId = await validateApiKey(apiKey);
  if (!empresaId) return respuesta401();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'BODY_INVALIDO', message: 'JSON inválido.' } },
      { status: 400 }
    );
  }

  const parsed = crearMensajeSchema.safeParse(body);
  if (!parsed.success) {
    const campos: Record<string, string> = {};
    parsed.error.issues.forEach((e) => { campos[String(e.path[0])] = e.message; });
    const error: ApiError = {
      error: { code: 'PAYLOAD_INVALIDO', message: 'Datos del mensaje inválidos.', fields: campos },
    };
    return NextResponse.json(error, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mensajes_programados')
    .insert({ ...parsed.data, empresa_id: empresaId, estado: 'pendiente' })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: 'Error al guardar el mensaje.' } },
      { status: 500 }
    );
  }

  const respuesta: ApiResponse<MensajeProgramado> = {
    data: {
      ...data,
      celular_destinatario: maskPhone(data.celular_destinatario),
      celular_remitente: maskPhone(data.celular_remitente),
    },
    meta: { timestamp: new Date().toISOString() },
  };

  return NextResponse.json(respuesta, { status: 201 });
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') ?? '';
  const empresaId = await validateApiKey(apiKey);
  if (!empresaId) return respuesta401();

  const { searchParams } = request.nextUrl;
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') ?? '1', 10));
  const limite = Math.min(100, Math.max(1, parseInt(searchParams.get('limite') ?? '20', 10)));
  const offset = (pagina - 1) * limite;

  const supabase = getSupabaseAdmin();
  const { data, error, count } = await supabase
    .from('mensajes_programados')
    .select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limite - 1);

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: 'Error al obtener mensajes.' } },
      { status: 500 }
    );
  }

  const mensajesEnmascarados = (data ?? []).map((m) => ({
    ...m,
    celular_destinatario: maskPhone(m.celular_destinatario),
    celular_remitente: maskPhone(m.celular_remitente),
  }));

  return NextResponse.json({
    data: mensajesEnmascarados,
    meta: {
      timestamp: new Date().toISOString(),
      pagina,
      limite,
      total: count ?? 0,
    },
  });
}
