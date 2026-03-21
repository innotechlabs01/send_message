-- RLS: mensajes_programados
ALTER TABLE mensajes_programados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_propio" ON mensajes_programados
  FOR ALL USING (auth.uid() = user_id);

-- RLS: api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo_service_role_apikeys" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- RLS: audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo_service_role_logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS: categorias (lectura pública, escritura solo service_role)
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura_publica_cat" ON categorias
  FOR SELECT USING (activa = true);

CREATE POLICY "escritura_service_role_cat" ON categorias
  FOR ALL USING (auth.role() = 'service_role');

-- RLS: mensajes_prediseniados (lectura pública, escritura solo service_role)
ALTER TABLE mensajes_prediseniados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura_publica_msg" ON mensajes_prediseniados
  FOR SELECT USING (activo = true);

CREATE POLICY "escritura_service_role_msg" ON mensajes_prediseniados
  FOR ALL USING (auth.role() = 'service_role');
