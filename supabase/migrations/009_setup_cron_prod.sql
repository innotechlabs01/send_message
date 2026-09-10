-- Cron jobs producción (pazykgddlrbbplvwiizr)
-- Nota: el CRON_SECRET en el header debe coincidir con el env var CRON_SECRET
-- de la edge function send-messages/send-reminders (regenerado vía
-- `supabase secrets set`). Supabase gestionado no permite custom GUC vía
-- ALTER DATABASE, por eso va inline aquí.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cleanup mensajes expirados: 6 AM Colombia = 11:00 UTC
SELECT cron.schedule('cleanup-expired-messages', '0 11 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/cleanup-expired',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('scheduled', true)
  );
$cron$);

-- Envío SMS pendientes: 6 AM Colombia = 11:00 UTC
SELECT cron.schedule('send-messages-morning', '0 11 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-messages',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer CRON_SECRET_PLACEHOLDER'),
    body := '{}'::jsonb
  );
$cron$);

-- Envío SMS pendientes: 6 PM Colombia = 23:00 UTC
SELECT cron.schedule('send-messages-evening', '0 23 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-messages',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer CRON_SECRET_PLACEHOLDER'),
    body := '{}'::jsonb
  );
$cron$);

-- Recordatorios: 9 AM UTC
SELECT cron.schedule('send-reminders-daily', '0 9 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer CRON_SECRET_PLACEHOLDER'),
    body := '{}'::jsonb
  );
$cron$);

-- Retry queue: cada 15 minutos
SELECT cron.schedule('process-retry-queue', '*/15 * * * *', $cron$
  SELECT process_retry_queue();
$cron$);