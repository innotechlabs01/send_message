-- Crear tabla de pagos para rastrear órdenes
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  descripcion TEXT,
  bold_config JSONB,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'expirado')),
  cantidad_mensajes INTEGER NOT NULL DEFAULT 1,
  user_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_order_id ON public.pagos(order_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON public.pagos(estado);

-- RLS (Row Level Security)
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Service role can do anything" ON public.pagos;

-- Política para servicio (usar service_role key)
CREATE POLICY "Service role can do anything" ON public.pagos
  FOR ALL USING (true) WITH CHECK (true);