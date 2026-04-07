-- Allow public (anonymous) inserts to mensajes_programados when user_id is null
-- This is for the public API endpoint that doesn't require authentication
ALTER TABLE mensajes_programados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_sin_usuario" ON mensajes_programados
  FOR INSERT WITH CHECK (user_id IS NULL);

CREATE POLICY "public_select_sin_usuario" ON mensajes_programados
  FOR SELECT USING (user_id IS NULL);
