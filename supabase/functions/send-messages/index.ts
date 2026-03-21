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
    throw Object.assign(new Error(err.message ?? 'Error Twilio'), { code: err.code });
  }

  const data = await res.json();
  return data.sid;
}

Deno.serve(async (req) => {
  // Autenticación por CRON_SECRET
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Obtener mensajes pendientes con fecha de envío <= hoy
  const { data: mensajes, error } = await supabase
    .from('mensajes_programados')
    .select('*')
    .eq('estado', 'pendiente')
    .lte('fecha_envio', new Date().toISOString().split('T')[0]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const resultados = { enviados: 0, fallidos: 0 };

  for (const msg of mensajes ?? []) {
    try {
      const sid = await enviarSMS(msg.celular_destinatario, msg.texto_final);

      await supabase
        .from('mensajes_programados')
        .update({ estado: 'enviado', intentos_envio: msg.intentos_envio + 1 })
        .eq('id', msg.id);

      await supabase.from('audit_logs').insert({
        evento: 'sms_enviado',
        metadata: { mensaje_id: msg.id, sid },
        ip: 'cron',
      });

      resultados.enviados++;
    } catch (err: unknown) {
      const detalle = (err as Error).message;
      await supabase
        .from('mensajes_programados')
        .update({
          estado: 'fallido',
          error_detalle: detalle,
          intentos_envio: msg.intentos_envio + 1,
        })
        .eq('id', msg.id);

      await supabase.from('audit_logs').insert({
        evento: 'sms_fallido',
        metadata: { mensaje_id: msg.id, error: detalle },
        ip: 'cron',
      });

      resultados.fallidos++;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...resultados }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
