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

-- Envío programado cada 5 minutos (mensajes debidos y reintentos)
SELECT cron.schedule('send-scheduled-messages', '*/5 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-scheduled-messages',
    headers := public.get_cron_auth_headers(),
    body := '{}'::jsonb
  );
$cron$);
