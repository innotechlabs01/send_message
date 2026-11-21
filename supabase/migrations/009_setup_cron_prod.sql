-- Cron jobs producción (pazykgddlrbbplvwiizr)
-- Nota: El secreto de autenticación (`cron_secret`) se lee dinámicamente desde
-- `vault.decrypted_secrets` (o `current_setting('app.settings.cron_secret', true)`),
-- evitando llamadas sin autenticar o placeholders hardcodeados.
-- Para configurar el secreto en Supabase Vault:
--   SELECT vault.create_secret('<TU_CRON_SECRET>', 'cron_secret', 'Bearer secret for edge function crons');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.get_cron_auth_headers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  BEGIN
    SELECT decrypted_secret
      INTO v_secret
      FROM vault.decrypted_secrets
     WHERE name = 'cron_secret'
     ORDER BY created_at DESC
     LIMIT 1;
  EXCEPTION
    WHEN undefined_table OR insufficient_privilege THEN
      v_secret := NULL;
  END;

  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := current_setting('app.settings.cron_secret', true);
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'cron_secret is not configured in vault.decrypted_secrets or app.settings.cron_secret';
  END IF;

  RETURN jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_secret
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_auth_headers() FROM PUBLIC, anon, authenticated;

-- Cleanup mensajes expirados: 6 AM Colombia = 11:00 UTC
SELECT cron.schedule('cleanup-expired-messages', '0 11 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/cleanup-expired',
    headers := public.get_cron_auth_headers(),
    body := jsonb_build_object('scheduled', true)
  );
$cron$);

-- Envío SMS pendientes: 6 AM Colombia = 11:00 UTC
SELECT cron.schedule('send-messages-morning', '0 11 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-messages',
    headers := public.get_cron_auth_headers(),
    body := '{}'::jsonb
  );
$cron$);

-- Envío SMS pendientes: 6 PM Colombia = 23:00 UTC
SELECT cron.schedule('send-messages-evening', '0 23 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-messages',
    headers := public.get_cron_auth_headers(),
    body := '{}'::jsonb
  );
$cron$);

-- Recordatorios: 9 AM UTC
SELECT cron.schedule('send-reminders-daily', '0 9 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-reminders',
    headers := public.get_cron_auth_headers(),
    body := '{}'::jsonb
  );
$cron$);

-- Retry queue: cada 15 minutos
SELECT cron.schedule('process-retry-queue', '*/15 * * * *', $cron$
  SELECT process_retry_queue();
$cron$);

-- Envío programado cada 6 horas (mensajes no enviados)
SELECT cron.schedule('send-scheduled-messages', '0 */6 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-scheduled-messages',
    headers := public.get_cron_auth_headers(),
    body := '{}'::jsonb
  );
$cron$);
