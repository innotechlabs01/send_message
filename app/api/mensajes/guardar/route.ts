import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { crearMensajeSchema, guardarMensajesSchema } from '@/lib/validations';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'BODY_INVALIDO', message: 'JSON inválido.' } },
      { status: 400 }
    );
  }

  // Verificar si es formato array (múltiples mensajes) o single (un mensaje)
  if (Array.isArray(body) || (body && typeof body === 'object' && 'mensajes' in body)) {
    // Formato para guardar múltiples mensajes
    const parsed = guardarMensajesSchema.safeParse(body);
    if (!parsed.success) {
      const campos: Record<string, string> = {};
      parsed.error.issues.forEach((e) => { campos[String(e.path[0])] = e.message; });
      return NextResponse.json(
        { error: { code: 'PAYLOAD_INVALIDO', message: 'Datos inválidos.', fields: campos } },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const mensajes = parsed.data.mensajes;

    // Insertar todos los mensajes
    const { data, error } = await admin
      .from('mensajes_programados')
      .insert(
        mensajes.map((msg) => ({
          nombre_destinatario: msg.nombre_destinatario,
          nombre_remitente: msg.nombre_remitente,
          texto_final: msg.texto_final,
          celular_destinatario: msg.celular_destinatario,
          celular_remitente: msg.celular_remitente,
          fecha_envio: msg.fecha_envio,
          email_contacto: msg.email_contacto,
          nombre_contacto: msg.nombre_contacto,
          telefono_contacto: msg.telefono_contacto,
          user_id: null,
          empresa_id: null,
          estado: 'pendiente',
        }))
      )
      .select('id');

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: 'Error al guardar los mensajes.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { ids: data.map((d) => d.id), count: data.length } }, { status: 201 });
  }

  // Formato single (compatibilidad hacia atrás)
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
      user_id: null,
      empresa_id: null,
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
