-- Habilitar extensión uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla: categorias
CREATE TABLE categorias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL UNIQUE,
  icono      TEXT NOT NULL,
  activa     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: mensajes_prediseniados
CREATE TABLE mensajes_prediseniados (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  texto        TEXT NOT NULL,
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensajes_categoria ON mensajes_prediseniados(categoria_id) WHERE activo = true;

-- Tabla: api_keys (debe existir antes de mensajes_programados por la FK)
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL,
  nombre      TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,
  activa      BOOLEAN NOT NULL DEFAULT true,
  revocada_en TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_apikeys_hash ON api_keys(key_hash) WHERE activa = true;

-- Tabla: mensajes_programados
CREATE TABLE mensajes_programados (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa_id           UUID REFERENCES api_keys(empresa_id) ON DELETE SET NULL,
  texto_final          TEXT NOT NULL,
  nombre_destinatario  TEXT NOT NULL,
  nombre_remitente     TEXT NOT NULL,
  celular_destinatario TEXT NOT NULL,
  celular_remitente    TEXT NOT NULL,
  fecha_envio          DATE NOT NULL,
  estado               TEXT NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente','enviado','fallido')),
  referencia_pago      TEXT,
  recordatorio_enviado BOOLEAN NOT NULL DEFAULT false,
  intentos_envio       INT NOT NULL DEFAULT 0,
  error_detalle        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mp_fecha_estado ON mensajes_programados(fecha_envio, estado) WHERE estado = 'pendiente';
CREATE INDEX idx_mp_user ON mensajes_programados(user_id);
CREATE INDEX idx_mp_empresa ON mensajes_programados(empresa_id);

-- Trigger updated_at para mensajes_programados
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mensajes_programados_updated_at
  BEFORE UPDATE ON mensajes_programados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tabla: audit_logs
CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento     TEXT NOT NULL,
  entidad    TEXT,
  entidad_id UUID,
  ip         TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_logs_evento ON audit_logs(evento, created_at DESC);
CREATE INDEX idx_logs_ip ON audit_logs(ip, created_at DESC);
