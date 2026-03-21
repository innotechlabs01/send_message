import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { generarIntegrityHash, getBoldCredentials } from '@/lib/bold';

const CURRENCY = 'COP';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  let body: { descripcion?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body opcional
  }

  // Leer precio desde la DB
  const supabase = getSupabaseAdmin();
  const { data: config, error } = await supabase
    .from('configuracion_pago')
    .select('precio_cop')
    .eq('activa', true)
    .single();

  if (error || !config) {
    return NextResponse.json(
      { error: { code: 'CONFIG_NO_DISPONIBLE', message: 'No se pudo obtener la configuración de pago.' } },
      { status: 500 }
    );
  }

  const { apiKey, secretKey } = getBoldCredentials();
  const orderId = `MSG-${Date.now()}`;
  const amount = config.precio_cop;
  const integritySignature = generarIntegrityHash(orderId, amount, CURRENCY, secretKey);

  return NextResponse.json({
    data: {
      orderId,
      amount,
      currency: CURRENCY,
      apiKey,
      integritySignature,
      descripcion: body.descripcion ?? 'Mensaje programado ConSentido',
    },
  });
}
