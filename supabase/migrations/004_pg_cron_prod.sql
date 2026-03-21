-- Configuración de pg_cron para producción
-- Reemplaza <PROJECT_REF> con el ID de tu proyecto Supabase

-- Actualizar los schedules con las URLs de producción
SELECT cron.unschedule('send-messages-hourly');
SELECT cron.unschedule('send-reminders-daily');

SELECT cron.schedule(
  'send-messages-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-messages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para configurar el secret en Supabase:
-- ALTER DATABASE postgres SET app.cron_secret = '<tu_cron_secret>';
-- ALTER DATABASE postgres SET app.supabase_url = 'https://<PROJECT_REF>.supabase.co';
