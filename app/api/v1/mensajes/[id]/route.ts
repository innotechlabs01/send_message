import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, maskPhone } from '@/lib/api-auth';
import { ApiResponse, MensajeProgramado } from '@/types';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const apiKey = request.headers.get('x-api-key') ?? '';
  const empresaId = await validateApiKey(apiKey);

  if (!empresaId) {
    return NextResponse.json(
      { error: { code: 'API_KEY_INVALIDA', message: 'API Key ausente o inválida.' } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('mensajes_programados')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'NO_ENCONTRADO', message: 'Mensaje no encontrado.' } },
      { status: 404 }
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

  return NextResponse.json(respuesta);
}
