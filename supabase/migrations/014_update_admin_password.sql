-- Actualizar password del admin al nuevo formato PBKDF2
-- Password: admin123456
-- Hash generado con PBKDF2-SHA256, 100000 iteraciones

UPDATE admin_users
SET password_hash = 'pbkdf2_sha256$100000$eeLhbGjHK/La09Y8gEvifA==$KGWVi+R6u5YuxcADpGCYFkeqcgvCB3IKczn0LZ8VF50='
WHERE email = 'admin@consentiido.com';