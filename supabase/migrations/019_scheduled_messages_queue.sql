-- 019_scheduled_messages_queue.sql
-- Queue & retry columns for scheduled_messages + concurrency-safe claim RPC

ALTER TABLE public.scheduled_messages
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS payment_reference_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_queue
  ON public.scheduled_messages (status, scheduled_for, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_payment_ref
  ON public.scheduled_messages (payment_reference_id);

-- Atomic claim of due scheduled messages using FOR UPDATE SKIP LOCKED
-- Filters by scheduled_for <= now(), retry window, and verified payment (or legacy null payment_reference_id).
CREATE OR REPLACE FUNCTION public.claim_due_scheduled_messages(batch_size int DEFAULT 20)
RETURNS SETOF public.scheduled_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT sm.id
    FROM public.scheduled_messages sm
    WHERE sm.sent = false
      AND (
        sm.status IN ('pending', 'failed')
        OR (
          sm.status = 'processing'
          AND sm.locked_at IS NOT NULL
          AND sm.locked_at < now() - interval '15 minutes'
        )
      )
      AND COALESCE(sm.scheduled_for, sm.created_at) <= now()
      AND (sm.next_retry_at IS NULL OR sm.next_retry_at <= now())
      AND sm.attempts < COALESCE(sm.max_attempts, 3)
      AND (
        sm.payment_reference_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.payments p
          WHERE p.reference_id = sm.payment_reference_id
            AND (
              lower(COALESCE(p.state, '')) IN ('success', 'approved', 'paid')
              OR lower(COALESCE(p.status, '')) IN ('success', 'approved', 'paid')
            )
        )
      )
    ORDER BY COALESCE(sm.scheduled_for, sm.created_at) ASC
    LIMIT GREATEST(COALESCE(batch_size, 20), 1)
    FOR UPDATE OF sm SKIP LOCKED
  )
  UPDATE public.scheduled_messages target
  SET
    status = 'processing',
    locked_at = now()
  FROM due
  WHERE target.id = due.id
  RETURNING target.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_scheduled_messages(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_scheduled_messages(int) TO service_role;
