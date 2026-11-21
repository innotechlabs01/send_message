-- 017_admin_rls_hardening.sql
-- Hardens RLS policies on admin_users and predefined_messages,
-- removes exposure of password_hash to non-service_role clients,
-- and invalidates seeded default weak admin password hashes.

-- 1. Harden admin_users RLS: only service_role (Edge Functions) may read or write admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read own data" ON admin_users;
DROP POLICY IF EXISTS "Service role manages admins" ON admin_users;
DROP POLICY IF EXISTS "service_role_all_admin_users" ON admin_users;

CREATE POLICY "service_role_all_admin_users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE admin_users FROM anon, authenticated;
GRANT ALL ON TABLE admin_users TO service_role;

-- Invalidate known seeded default password hashes ("admin123456") from migrations 013 & 014
-- Requires rotation or bootstrap via ADMIN_BOOTSTRAP_SECRET
DELETE FROM admin_users
WHERE email = 'admin@consentiido.com'
  AND password_hash IN (
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S',
    'pbkdf2_sha256$100000$eeLhbGjHK/La09Y8gEvifA==$KGWVi+R6u5YuxcADpGCYFkeqcgvCB3IKczn0LZ8VF50='
  );

-- 2. Harden predefined_messages RLS: public SELECT only, service_role only for INSERT/UPDATE/DELETE
ALTER TABLE predefined_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE predefined_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for predefined messages" ON predefined_messages;
DROP POLICY IF EXISTS "Service role write access for predefined messages" ON predefined_messages;
DROP POLICY IF EXISTS "service_role_write_predefined_messages" ON predefined_messages;

CREATE POLICY "Public read access for predefined messages"
  ON predefined_messages
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

CREATE POLICY "service_role_write_predefined_messages"
  ON predefined_messages
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE INSERT, UPDATE, DELETE ON TABLE predefined_messages FROM anon, authenticated;
GRANT SELECT ON TABLE predefined_messages TO anon, authenticated;
GRANT ALL ON TABLE predefined_messages TO service_role;

-- Allow admins to add more than 20 predefined messages per category
ALTER TABLE predefined_messages DROP CONSTRAINT IF EXISTS predefined_messages_sort_order_check;
ALTER TABLE predefined_messages ADD CONSTRAINT predefined_messages_sort_order_check CHECK (sort_order >= 1);
