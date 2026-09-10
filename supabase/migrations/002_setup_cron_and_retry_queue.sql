-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to cleanup expired messages daily at 6 AM (Colombia time, UTC-5 = 11:00 UTC)
SELECT cron.schedule(
  'cleanup-expired-messages',
  '0 11 * * *', -- 6 AM Colombia time = 11:00 UTC
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/cleanup-expired',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('scheduled', true)
    );
  $$
);

-- Create a table for failed jobs queue
CREATE TABLE IF NOT EXISTS failed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for retry processing
CREATE INDEX IF NOT EXISTS idx_failed_jobs_status ON failed_jobs(status);
CREATE INDEX IF NOT EXISTS idx_failed_jobs_next_retry ON failed_jobs(next_retry_at);

-- RLS for failed_jobs
ALTER TABLE failed_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on failed_jobs" ON failed_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Function to queue failed job
CREATE OR REPLACE FUNCTION queue_failed_job(
  p_job_name TEXT,
  p_payload JSONB,
  p_error_message TEXT
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO failed_jobs (job_name, payload, error_message, next_retry_at)
  VALUES (p_job_name, p_payload, p_error_message, NOW() + INTERVAL '5 minutes')
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process retry queue
CREATE OR REPLACE FUNCTION process_retry_queue()
RETURNS void AS $$
DECLARE
  v_job RECORD;
BEGIN
  -- Get pending jobs that are ready for retry
  FOR v_job IN
    SELECT * FROM failed_jobs
    WHERE status = 'pending'
      AND next_retry_at <= NOW()
      AND retry_count < max_retries
    FOR UPDATE SKIP LOCKED
    LIMIT 10
  LOOP
    -- Mark as processing
    UPDATE failed_jobs
    SET status = 'processing', updated_at = NOW()
    WHERE id = v_job.id;

    -- Try to execute the cleanup
    BEGIN
      PERFORM cleanup_expired_messages();

      -- Mark as completed
      UPDATE failed_jobs
      SET status = 'completed', updated_at = NOW()
      WHERE id = v_job.id;

    EXCEPTION WHEN OTHERS THEN
      -- Increment retry count and set next retry
      UPDATE failed_jobs
      SET
        retry_count = retry_count + 1,
        error_message = SQLERRM,
        next_retry_at = NOW() + (INTERVAL '5 minutes' * (retry_count + 1)),
        status = CASE
          WHEN retry_count + 1 >= max_retries THEN 'failed'
          ELSE 'pending'
        END,
        updated_at = NOW()
      WHERE id = v_job.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Cron job to process retry queue every 15 minutes
SELECT cron.schedule(
  'process-retry-queue',
  '*/15 * * * *',
  $$
  SELECT process_retry_queue();
  $$
);
