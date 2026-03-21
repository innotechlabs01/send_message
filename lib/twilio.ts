import twilio from 'twilio';

/** Construye el cuerpo del SMS con tres secciones */
export function buildMessageBody(
  texto: string,
  destinatario: string,
  remitente: string
): string {
  const cuerpo = texto
    .replace(/\{destinatario\}/gi, destinatario)
    .replace(/\{remitente\}/gi, remitente);

  return `Hola ${destinatario}\n\n${cuerpo}\n\nEste mensaje es enviado por ${remitente}`;
}

/** Espera un tiempo determinado (para backoff exponencial) */
function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Envía un SMS vía Twilio con reintentos y backoff exponencial */
export async function sendSMS(to: string, body: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_PHONE_NUMBER!;

  const client = twilio(accountSid, authToken);
  const numero = to.startsWith('+57') ? to : `+57${to}`;

  const MAX_INTENTOS = 3;
  let ultimoError: Error | null = null;

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    if (intento > 0) {
      await esperar(1000 * Math.pow(2, intento - 1)); // 1s, 2s, 4s
    }

    try {
      const msg = await client.messages.create({ to: numero, from, body });
      return msg.sid;
    } catch (err: unknown) {
      ultimoError = err as Error;
      const codigo = (err as { code?: number }).code;

      // Errores no reintentables
      if (codigo === 21211) {
        throw Object.assign(new Error('Número de celular inválido'), { code: 'sms_numero_invalido' });
      }
      if (codigo === 21408) {
        throw Object.assign(new Error('Región no habilitada para SMS'), { code: 'sms_region_no_habilitada' });
      }
      // Para otros errores, continuar reintentando
    }
  }

  throw ultimoError ?? new Error('Error desconocido al enviar SMS');
}
