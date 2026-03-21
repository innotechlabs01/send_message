import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/pse';
import { createClient } from '@supabase/supabase-js';

// Usar service role para operaciones del webhook (sin RLS)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-placetopay-signature') ?? '';
  const rawBody = await request.text();

  // Verificar firma HMAC
  const secret = process.env.PSE_WEBHOOK_SECRET!;
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { error: { code: 'FIRMA_INVALIDA', message: 'Firma del webhook inválida.' } },
      { status: 401 }
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: { code: 'BODY_INVALIDO', message: 'JSON inválido.' } }, { status: 400 });
  }

  const status = (payload.status as Record<string, string>)?.status;
  const referencia = payload.reference as string;

  const supabase = getSupabaseAdmin();

  if (status === 'APPROVED') {
    // Idempotencia: verificar si ya existe
    const { data: existente } = await supabase
      .from('mensajes_programados')
      .select('id')
      .eq('referencia_pago', referencia)
      .single();

    if (!existente) {
      await supabase.from('audit_logs').insert({
        evento: 'pago_aprobado',
        metadata: { referencia, status },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'webhook',
      });
    }
  } else if (status === 'REJECTED' || status === 'FAILED') {
    await supabase.from('audit_logs').insert({
      evento: 'pago_rechazado',
      metadata: { referencia, status },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'webhook',
    });
  }

  return NextResponse.json({ ok: true });
}
