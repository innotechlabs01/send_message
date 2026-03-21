import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

async function enviarSMS(to: string, body: string): Promise<string> {
  const numero = to.startsWith('+57') ? to : `+57${to}`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: numero, From: TWILIO_PHONE_NUMBER, Body: body }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Error Twilio');
  }

  const data = await res.json();
  return data.sid;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Mensajes que se envían mañana y aún no tienen recordatorio
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const fechaManana = manana.toISOString().split('T')[0];

  const { data: mensajes, error } = await supabase
    .from('mensajes_programados')
    .select('*')
    .eq('estado', 'pendiente')
    .eq('fecha_envio', fechaManana)
    .eq('recordatorio_enviado', false);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const resultados = { recordatorios: 0, fallidos: 0 };

  for (const msg of mensajes ?? []) {
    const textoRecordatorio =
      `ConSentido: Recordatorio — mañana se enviará tu mensaje a ${msg.nombre_destinatario}. ` +
      `Fecha: ${new Date(msg.fecha_envio).toLocaleDateString('es-CO')}.`;

    try {
      await enviarSMS(msg.celular_remitente, textoRecordatorio);
      await supabase
        .from('mensajes_programados')
        .update({ recordatorio_enviado: true })
        .eq('id', msg.id);

      resultados.recordatorios++;
    } catch (err: unknown) {
      // El fallo del recordatorio no afecta el estado del mensaje
      await supabase.from('audit_logs').insert({
        evento: 'recordatorio_fallido',
        metadata: { mensaje_id: msg.id, error: (err as Error).message },
        ip: 'cron',
      });
      resultados.fallidos++;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...resultados }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
