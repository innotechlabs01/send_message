-- Cron cada 6 horas para enviar mensajes programados no enviados (autenticado con cron_secret)
SELECT cron.schedule('send-scheduled-messages', '0 */6 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pazykgddlrbbplvwiizr.supabase.co/functions/v1/send-scheduled-messages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' ORDER BY created_at DESC LIMIT 1),
        current_setting('app.settings.cron_secret', true)
      )
    ),
    body := '{}'::jsonb
  );
$cron$);
