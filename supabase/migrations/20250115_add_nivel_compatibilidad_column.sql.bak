-- Agregar columna nivel_compatibilidad a la tabla compatibilidades
ALTER TABLE public.compatibilidades 
ADD COLUMN IF NOT EXISTS nivel_compatibilidad TEXT DEFAULT 'No compatible';

-- Agregar comentario a la nueva columna
COMMENT ON COLUMN public.compatibilidades.nivel_compatibilidad IS 'Nivel de compatibilidad: Compatible, Posiblemente compatible, No compatible';

-- Crear índice para mejorar consultas por nivel de compatibilidad
CREATE INDEX IF NOT EXISTS idx_compatibilidades_nivel ON public.compatibilidades(nivel_compatibilidad);