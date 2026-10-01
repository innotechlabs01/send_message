-- Crear usuario administrador inicial
-- Email: admin@consentiido.com
-- Password: admin123456 (cambiar en primer login)

-- Usar bcrypt para hashear el password
-- hash generado con bcrypt(password, 12) para "admin123456"
-- $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S

INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'admin@consentiido.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S',
  'Administrador Principal'
)
ON CONFLICT (email) DO NOTHING;