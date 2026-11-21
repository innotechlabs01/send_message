-- 020_kpi_views.sql
-- Creates payment_events audit table, ensures whatsapp_logs exists,
-- and creates KPI views for Admin Ops Dashboard:
-- v_kpi_payment_funnel, v_kpi_delivery_health, v_kpi_daily_revenue

-- 1. whatsapp_logs base table (must exist before views reference it)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  provider text DEFAULT 'twilio',
  template_name text,
  wa_message_id text,
  status text DEFAULT 'sent',
  scheduled_message_id uuid,
  payment_reference_id text,
  error_code text,
  error_message text,
  provider_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_logs FROM anon, authenticated;
GRANT ALL ON TABLE public.whatsapp_logs TO service_role;

DROP POLICY IF EXISTS "service_role_all_whatsapp_logs" ON public.whatsapp_logs;
CREATE POLICY "service_role_all_whatsapp_logs"
  ON public.whatsapp_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Payment Events table for funnel & security audit tracking
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'intent',
      'pending',
      'success',
      'blocked',
      'failed',
      'webhook_received',
      'signature_invalid',
      'amount_mismatch'
    )
  ),
  amount_cop numeric,
  currency text NOT NULL DEFAULT 'COP',
  payment_method text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_reference_id
  ON public.payment_events (reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type_created
  ON public.payment_events (event_type, created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_payment_events" ON public.payment_events;
CREATE POLICY "service_role_all_payment_events"
  ON public.payment_events
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.payment_events FROM anon, authenticated;
GRANT ALL ON TABLE public.payment_events TO service_role;

-- Ensure required columns exist on payments, scheduled_messages, whatsapp_logs
-- so views compile regardless of migration execution order
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS expected_amount_cop numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE public.scheduled_messages
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reference_id text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS attempts int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts int DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.whatsapp_logs
  ADD COLUMN IF NOT EXISTS scheduled_message_id uuid,
  ADD COLUMN IF NOT EXISTS payment_reference_id text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. View: v_kpi_payment_funnel
CREATE OR REPLACE VIEW v_kpi_payment_funnel AS
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

-- 4. View: v_kpi_delivery_health
CREATE OR REPLACE VIEW v_kpi_delivery_health AS
WITH msg_stats AS (
  SELECT
    COUNT(*)::int AS total_scheduled,
    COUNT(*) FILTER (
      WHERE COALESCE(status, CASE WHEN sent THEN 'sent' ELSE 'pending' END) IN ('pending', 'processing')
    )::int AS pending_messages,
    COUNT(*) FILTER (
      WHERE sent = true OR status = 'sent'
    )::int AS sent_messages,
    COUNT(*) FILTER (
      WHERE status = 'failed'
    )::int AS failed_messages,
    COUNT(*) FILTER (
      WHERE status = 'dead_letter'
    )::int AS dead_letter_messages,
    COALESCE(
      ROUND(
        AVG(
          EXTRACT(EPOCH FROM (sent_at - COALESCE(scheduled_for, created_at)))
        ) FILTER (
          WHERE sent_at IS NOT NULL
            AND sent_at >= COALESCE(scheduled_for, created_at)
        )::numeric,
        2
      ),
      0
    )::numeric AS avg_send_latency_seconds
  FROM public.scheduled_messages
),
log_stats AS (
  SELECT
    COUNT(*)::int AS wa_logs_total,
    COUNT(*) FILTER (
      WHERE LOWER(COALESCE(provider_status, status, '')) IN ('delivered', 'read')
    )::int AS wa_delivered_count,
    COUNT(*) FILTER (
      WHERE LOWER(COALESCE(provider_status, status, '')) IN ('failed', 'undelivered', 'error')
    )::int AS wa_failed_count
  FROM public.whatsapp_logs
)
SELECT
  m.total_scheduled,
  m.pending_messages,
  m.sent_messages,
  m.failed_messages,
  m.dead_letter_messages,
  COALESCE(
    ROUND(100.0 * m.sent_messages / NULLIF(m.total_scheduled, 0), 2),
    0
  )::numeric AS delivery_rate_pct,
  COALESCE(
    ROUND(100.0 * (m.failed_messages + m.dead_letter_messages) / NULLIF(m.total_scheduled, 0), 2),
    0
  )::numeric AS failure_rate_pct,
  COALESCE(
    ROUND(100.0 * m.dead_letter_messages / NULLIF(m.total_scheduled, 0), 2),
    0
  )::numeric AS dead_letter_rate_pct,
  m.avg_send_latency_seconds,
  l.wa_logs_total,
  l.wa_delivered_count,
  l.wa_failed_count
FROM msg_stats m
CROSS JOIN log_stats l;

-- 5. View: v_kpi_daily_revenue
CREATE OR REPLACE VIEW v_kpi_daily_revenue AS
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

REVOKE ALL ON v_kpi_payment_funnel FROM anon, authenticated;
REVOKE ALL ON v_kpi_delivery_health FROM anon, authenticated;
REVOKE ALL ON v_kpi_daily_revenue FROM anon, authenticated;
GRANT SELECT ON v_kpi_payment_funnel TO service_role;
GRANT SELECT ON v_kpi_delivery_health TO service_role;
GRANT SELECT ON v_kpi_daily_revenue TO service_role;
