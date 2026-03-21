import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/pse';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { z } from 'zod';

const bodySchema = z.object({
  referencia: z.string().min(1),
  monto: z.number().positive(),
  descripcion: z.string().min(1),
  recaptchaToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'BODY_INVALIDO', message: 'El cuerpo de la solicitud no es JSON válido.' } },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_INVALIDO', message: 'Datos de pago incompletos.' } },
      { status: 400 }
    );
  }

  const { referencia, monto, descripcion, recaptchaToken } = parsed.data;

  // Verificar reCAPTCHA
  const captcha = await verifyRecaptcha(recaptchaToken);
  if (!captcha.valid) {
    return NextResponse.json(
      { error: { code: 'RECAPTCHA_INVALIDO', message: 'Verificación de seguridad fallida.' } },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const userAgent = request.headers.get('user-agent') ?? 'unknown';

  try {
    const sesion = await createSession({
      referencia,
      monto,
      descripcion,
      returnUrl: `${appUrl}/confirmacion`,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({ data: { checkoutUrl: sesion.checkoutUrl, requestId: sesion.requestId } });
  } catch (err) {
    console.error('Error PSE:', err);
    return NextResponse.json(
      { error: { code: 'PSE_NO_DISPONIBLE', message: 'El servicio de pago no está disponible. Intenta más tarde.' } },
      { status: 502 }
    );
  }
}
