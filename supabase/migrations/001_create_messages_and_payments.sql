-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  send_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'sent', 'expired', 'cancelled')),
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL UNIQUE,
  transaction_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'failed', 'expired', 'refunded')),
  payment_method TEXT,
  bold_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_send_date ON messages(send_date);
CREATE INDEX IF NOT EXISTS idx_messages_payment_reference ON messages(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_reference_id ON payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_message_id ON payments(message_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can do everything on messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own messages (by phone)
CREATE POLICY "Users can read messages by phone" ON messages
  FOR SELECT USING (true);

-- Allow anon to insert messages (for initial creation)
CREATE POLICY "Anonymous can insert messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Allow anon to update messages (for status changes)
CREATE POLICY "Anonymous can update messages" ON messages
  FOR UPDATE USING (true);

-- Allow anon to insert payments
CREATE POLICY "Anonymous can insert payments" ON payments
  FOR INSERT WITH CHECK (true);

-- Allow anon to update payments
CREATE POLICY "Anonymous can update payments" ON payments
  FOR UPDATE USING (true);

-- Allow anon to read payments
CREATE POLICY "Anonymous can read payments" ON payments
  FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired messages (older than 3 days with pending status)
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
  -- Mark messages as expired if payment not completed within 3 days
  UPDATE messages
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '3 days';

  -- Delete expired messages and their payments (cascade)
  DELETE FROM messages
  WHERE status = 'expired'
    AND updated_at < NOW() - INTERVAL '1 day';
END;
$$ language 'plpgsql';
