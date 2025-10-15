-- Crear tabla para registrar compatibilidades entre modelos de celular y micas
CREATE TABLE IF NOT EXISTS public.compatibilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_celular TEXT NOT NULL,
  alto NUMERIC NOT NULL,
  ancho NUMERIC NOT NULL,
  mica_id UUID,
  tienda_id TEXT DEFAULT 'default',
  vendedor_id TEXT,
  contador INTEGER DEFAULT 1,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear �ndices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_compatibilidades_modelo ON public.compatibilidades(modelo_celular);
CREATE INDEX IF NOT EXISTS idx_compatibilidades_mica_id ON public.compatibilidades(mica_id);
CREATE INDEX IF NOT EXISTS idx_compatibilidades_medidas ON public.compatibilidades(alto, ancho);
CREATE INDEX IF NOT EXISTS idx_compatibilidades_contador ON public.compatibilidades(contador DESC);

-- Crear funci�n para actualizar el timestamp
CREATE OR REPLACE FUNCTION update_actualizado_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar actualizado_at
CREATE TRIGGER update_compatibilidades_actualizado_at
    BEFORE UPDATE ON public.compatibilidades
    FOR EACH ROW
    EXECUTE FUNCTION update_actualizado_at_column();

-- A�adir comentario a la tabla
COMMENT ON TABLE public.compatibilidades IS 'Registra qu� modelos de celular son compatibles con qu� micas';
COMMENT ON COLUMN public.compatibilidades.modelo_celular IS 'Modelo del celular (ej: iPhone 13 Pro)';
COMMENT ON COLUMN public.compatibilidades.alto IS 'Alto del celular en mil�metros';
COMMENT ON COLUMN public.compatibilidades.ancho IS 'Ancho del celular en mil�metros';
COMMENT ON COLUMN public.compatibilidades.mica_id IS 'ID de la mica compatible';
COMMENT ON COLUMN public.compatibilidades.contador IS 'N�mero de veces que se ha registrado esta compatibilidad';

-- Enable RLS
ALTER TABLE public.compatibilidades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'compatibilidades'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.compatibilidades FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'compatibilidades'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.compatibilidades FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'compatibilidades'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.compatibilidades FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
END $$;