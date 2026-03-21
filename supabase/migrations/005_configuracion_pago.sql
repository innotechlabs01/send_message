-- Tabla: configuracion_pago
-- Permite gestionar el precio del servicio desde la base de datos
CREATE TABLE configuracion_pago (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precio_cop INT NOT NULL DEFAULT 5000,
  activa     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_configuracion_pago_updated_at
  BEFORE UPDATE ON configuracion_pago
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE configuracion_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura_publica_config" ON configuracion_pago
  FOR SELECT USING (activa = true);

CREATE POLICY "escritura_service_role_config" ON configuracion_pago
  FOR ALL USING (auth.role() = 'service_role');

INSERT INTO configuracion_pago (precio_cop) VALUES (5000);
