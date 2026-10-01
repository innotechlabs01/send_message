-- Tabla para administradores (autenticación simple con email/password hash)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para login rápido
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Habilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Política: solo admins autenticados pueden ver su propio registro
CREATE POLICY "Admins can read own data" ON admin_users
  FOR SELECT USING (auth.uid() = id);

-- Política: solo service role puede insertar/actualizar admins
CREATE POLICY "Service role manages admins" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE admin_users IS 'Usuarios administradores para gestión de mensajes';
COMMENT ON COLUMN admin_users.password_hash IS 'Hash bcrypt del password';