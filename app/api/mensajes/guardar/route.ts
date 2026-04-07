import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { crearMensajeSchema } from '@/lib/validations';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  // Ya no requiere sesión autenticada - acceso público
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
    return NextResponse.json(
      { error: { code: 'PAYLOAD_INVALIDO', message: 'Datos inválidos.', fields: campos } },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('mensajes_programados')
    .insert({
      ...parsed.data,
      user_id: null,  // Sin autenticación, user_id es null
      empresa_id: null,  // Sin API key
      estado: 'pendiente',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: 'Error al guardar el mensaje.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
}
