-- Cron cada 6 horas para enviar mensajes programados no enviados
SELECT cron.schedule('send-scheduled-messages', '0 */6 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-scheduled-messages',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$cron$);
