-- Tabla para mensajes predefinidos por categoría
-- 20 mensajes por categoría: cumpleanos, graduacion, aniversario, luto, amor

CREATE TABLE IF NOT EXISTS predefined_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL CHECK (category_id IN ('cumpleanos', 'graduacion', 'aniversario', 'luto', 'amor')),
  message_text TEXT NOT NULL,
  sort_order INT NOT NULL CHECK (sort_order >= 1 AND sort_order <= 20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, sort_order)
);

-- Índice para consultas paginadas ordenadas
CREATE INDEX IF NOT EXISTS idx_predefined_category_order 
  ON predefined_messages(category_id, sort_order);

-- Habilitar RLS
ALTER TABLE predefined_messages ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública (los mensajes son públicos)
CREATE POLICY "Public read access for predefined messages"
  ON predefined_messages
  FOR SELECT
  USING (true);

-- Comentarios
COMMENT ON TABLE predefined_messages IS 'Mensajes predefinidos por categoría (20 por categoría) para selección aleatoria/paginada';
COMMENT ON COLUMN predefined_messages.category_id IS 'Categoría: cumpleanos, graduacion, aniversario, luto, amor';
COMMENT ON COLUMN predefined_messages.sort_order IS 'Orden determinístico 1-20 dentro de la categoría';