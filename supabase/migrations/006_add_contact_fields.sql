-- Add contact information fields to mensajes_programados table
-- These fields store the contact details of the user who scheduled the message

ALTER TABLE mensajes_programados
ADD COLUMN email_contacto TEXT,
ADD COLUMN nombre_contacto TEXT,
ADD COLUMN telefono_contacto TEXT;

-- Add comment for documentation
COMMENT ON COLUMN mensajes_programados.email_contacto IS 'Email del usuario que realizó el pago';
COMMENT ON COLUMN mensajes_programados.nombre_contacto IS 'Nombre completo del usuario que realizó el pago';
COMMENT ON COLUMN mensajes_programados.telefono_contacto IS 'Teléfono de contacto del usuario que realizó el pago';
