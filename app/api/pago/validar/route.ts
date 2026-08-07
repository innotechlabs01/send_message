import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

const VALID_STATES = ['pendiente', 'aprobado'];

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json(
      { valid: false, error: { code: 'MISSING_ORDER_ID', message: 'OrderId requerido' } },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false });
    }

    if (!VALID_STATES.includes(data.estado)) {
      return NextResponse.json({ valid: false });
    }

    // Devolver la configuración completa almacenada
    const configToSend = data.bold_config || {
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency,
      descripcion: data.descripcion,
    };

    return NextResponse.json({ valid: true, config: configToSend });
  } catch (err) {
    console.error('Error validando orden:', err);
    return NextResponse.json(
      { valid: false, error: { code: 'SERVER_ERROR', message: 'Error interno' } },
      { status: 500 }
    );
  }
}
