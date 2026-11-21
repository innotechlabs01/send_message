CREATE TABLE IF NOT EXISTS scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number text NOT NULL,
  text text,
  sender_name text,
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_sent
  ON scheduled_messages (sent);
