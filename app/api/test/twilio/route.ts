import { NextRequest, NextResponse } from 'next/server';
import { sendSMS, buildMessageBody } from '@/lib/twilio';

// Solo disponible fuera de producción
export async function POST(request: NextRequest) {
  if (process.env.APP_SCOPE === 'production') {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 403 });
  }

  const { to } = await request.json();
  if (!to) {
    return NextResponse.json({ error: 'Falta el campo "to"' }, { status: 400 });
  }

  const body = buildMessageBody(
    'Este es un mensaje de prueba de ConSentido. Si lo recibes, Twilio está configurado correctamente.',
    'Usuario de prueba',
    'ConSentido'
  );

  try {
    const sid = await sendSMS(to, body);
    return NextResponse.json({ ok: true, sid });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
