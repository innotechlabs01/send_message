-- 021_whatsapp_logs_kpis.sql
-- Ensure whatsapp_logs table exists and add KPI/delivery tracking columns

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  provider text DEFAULT 'twilio',
  template_name text,
  wa_message_id text,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_logs
  ADD COLUMN IF NOT EXISTS scheduled_message_id uuid REFERENCES public.scheduled_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_reference_id text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_logs FROM anon, authenticated;
GRANT ALL ON public.whatsapp_logs TO service_role;

DROP POLICY IF EXISTS "service_role_all_whatsapp_logs" ON public.whatsapp_logs;
CREATE POLICY "service_role_all_whatsapp_logs"
  ON public.whatsapp_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_wa_message_id
  ON public.whatsapp_logs (wa_message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_scheduled_message_id
  ON public.whatsapp_logs (scheduled_message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_payment_reference_id
  ON public.whatsapp_logs (payment_reference_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status_created_at
  ON public.whatsapp_logs (status, created_at DESC);
