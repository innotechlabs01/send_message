-- 018_payments_and_rls.sql
-- Ensure payments table exists with full server-side integrity columns and locked RLS (no anon access to PII)

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text NOT NULL UNIQUE,
  idempotency_key text UNIQUE,
  amount numeric NOT NULL,
  expected_amount_cop numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'COP',
  status text NOT NULL DEFAULT 'PENDING',
  state text NOT NULL DEFAULT 'pending',
  bold_status text,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_method text,
  transaction_id text,
  message_id text,
  gateway_reason text,
  gateway_raw jsonb,
  bold_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS expected_amount_cop numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS bold_status text,
  ADD COLUMN IF NOT EXISTS state text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS gateway_reason text,
  ADD COLUMN IF NOT EXISTS gateway_raw jsonb,
  ADD COLUMN IF NOT EXISTS bold_response jsonb,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_method text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference_id ON public.payments (reference_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key ON public.payments (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_state ON public.payments (state);

-- Lock down Row Level Security so anon/authenticated clients cannot read PII or tamper/upsert payment records
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public update payments" ON public.payments;
DROP POLICY IF EXISTS "Allow anon read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow anon upsert payments" ON public.payments;
DROP POLICY IF EXISTS "payments_anon_select" ON public.payments;
DROP POLICY IF EXISTS "payments_anon_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_anon_update" ON public.payments;
DROP POLICY IF EXISTS "service_role_all_payments" ON public.payments;

REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT ALL ON public.payments TO service_role;

CREATE POLICY "service_role_all_payments"
  ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
