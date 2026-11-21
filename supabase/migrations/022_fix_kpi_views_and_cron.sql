-- 022_fix_kpi_views_and_cron.sql
-- 1. Add password_changed_at to admin_users (for T-022 session invalidation)
-- 2. Add sender_phone to scheduled_messages (for T-024)
-- 3. Recreate v_kpi_payment_funnel & v_kpi_daily_revenue matching state IN ('blocked', 'gateway_blocked')
-- 4. Unschedule dead jobs in pg_cron and reschedule send-scheduled-messages to */5 * * * *

-- 1. Schema additions
ALTER TABLE IF EXISTS public.admin_users
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

ALTER TABLE IF EXISTS public.scheduled_messages
  ADD COLUMN IF NOT EXISTS sender_phone text;

-- 2. Recreate KPI Views with gateway_blocked matching
CREATE OR REPLACE VIEW public.v_kpi_payment_funnel AS
WITH payment_stats AS (
  SELECT
    COUNT(*)::int AS total_intents,
    COUNT(*) FILTER (
      WHERE LOWER(COALESCE(state, status, 'pending')) = 'pending'
    )::int AS pending_count,
    COUNT(*) FILTER (
      WHERE LOWER(COALESCE(state, status, '')) IN ('success', 'approved', 'paid')
    )::int AS success_count,
    COUNT(*) FILTER (
      WHERE LOWER(COALESCE(state, status, '')) IN ('blocked', 'gateway_blocked')
    )::int AS blocked_count,
    COUNT(*) FILTER (
      WHERE LOWER(COALESCE(state, status, '')) IN ('failed', 'rejected', 'error', 'cancelled')
    )::int AS failed_count,
    COALESCE(
      SUM(COALESCE(expected_amount_cop, amount, 0)) FILTER (
        WHERE LOWER(COALESCE(state, status, '')) IN ('success', 'approved', 'paid')
      ),
      0
    )::numeric AS gross_revenue_cop,
    COALESCE(
      ROUND(
        AVG(COALESCE(expected_amount_cop, amount, 0)) FILTER (
          WHERE LOWER(COALESCE(state, status, '')) IN ('success', 'approved', 'paid')
        ),
        2
      ),
      0
    )::numeric AS avg_ticket_cop
  FROM public.payments
)
SELECT
  total_intents,
  pending_count,
  success_count,
  blocked_count,
  failed_count,
  COALESCE(
    ROUND(100.0 * success_count / NULLIF(total_intents, 0), 2),
    0
  )::numeric AS conversion_rate_pct,
  gross_revenue_cop,
  avg_ticket_cop
FROM payment_stats;

CREATE OR REPLACE VIEW public.v_kpi_daily_revenue AS
SELECT
  DATE(created_at AT TIME ZONE 'America/Bogota') AS day,
  COUNT(*)::int AS total_orders,
  COUNT(*) FILTER (
    WHERE LOWER(COALESCE(state, status, '')) IN ('success', 'approved', 'paid')
  )::int AS paid_orders,
  COUNT(*) FILTER (
    WHERE LOWER(COALESCE(state, status, '')) IN ('failed', 'rejected', 'blocked', 'gateway_blocked', 'error', 'cancelled')
  )::int AS failed_orders,
  COALESCE(
    SUM(COALESCE(expected_amount_cop, amount, 0)) FILTER (
      WHERE LOWER(COALESCE(state, status, '')) IN ('success', 'approved', 'paid')
    ),
    0
  )::numeric AS revenue_cop,
  COALESCE(
    ROUND(
      100.0 * COUNT(*) FILTER (
        WHERE LOWER(COALESCE(state, status, '')) IN ('success', 'approved', 'paid')
      ) / NULLIF(COUNT(*), 0),
      2
    ),
    0
  )::numeric AS conversion_rate_pct
FROM public.payments
GROUP BY DATE(created_at AT TIME ZONE 'America/Bogota')
ORDER BY day DESC;

REVOKE ALL ON public.v_kpi_payment_funnel FROM anon, authenticated;
REVOKE ALL ON public.v_kpi_daily_revenue FROM anon, authenticated;
GRANT SELECT ON public.v_kpi_payment_funnel TO service_role;
GRANT SELECT ON public.v_kpi_daily_revenue TO service_role;

-- 3. Unschedule dead jobs and reschedule send-scheduled-messages at */5 * * * *
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule dead/obsolete jobs if present
    PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname IN (
      'cleanup-expired',
      'cleanup-expired-messages',
      'send-messages',
      'send-messages-morning',
      'send-messages-evening',
      'send-reminders',
      'send-reminders-daily',
      'process-retry-queue',
      'send-scheduled-messages'
    );

    -- Reschedule send-scheduled-messages to run every 5 minutes (*/5 * * * *)
    PERFORM cron.schedule(
      'send-scheduled-messages',
      '*/5 * * * *',
      $cron$
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
      $cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unschedule/schedule in 022 skipped: %', SQLERRM;
END;
$do$;
