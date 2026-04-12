import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, status, reference } = body;

    const supabase = getSupabaseAdmin();

    if (status === 'approved') {
      await supabase.from('audit_logs').insert({
        evento: 'bold_pago_aprobado',
        metadata: { order_id, status, reference },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'webhook',
      });

      await supabase
        .from('mensajes_programados')
        .update({ 
          estado: 'pagado',
          referencia_pago: order_id 
        })
        .eq('referencia_pago', reference);
    } else if (status === 'rejected' || status === 'failed') {
      await supabase.from('audit_logs').insert({
        evento: 'bold_pago_rechazado',
        metadata: { order_id, status, reference },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'webhook',
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
