-- Agregar categoría "Bolsa de Saldo" para separar el dinero de cambio de las ventas
-- Esta categoría permite identificar correctamente los depósitos de dinero dejado para el siguiente turno
-- evitando que se mezcle con los ingresos operativos

INSERT INTO public.income_categories (firestore_id, name, "isActive") VALUES
(
    uuid_generate_v4()::text,
    'Bolsa de Saldo',
    true
)
ON CONFLICT (firestore_id) DO NOTHING;

-- Comentario explicativo
COMMENT ON COLUMN public.incomes.category IS 
'Categoría del ingreso. "Bolsa de Saldo" se usa para depósitos de dinero reservado para el siguiente turno, 
mientras que "Corte de Caja" se usa para depósitos de efectivo operativo. 
Ambas categorías deben excluirse de los cálculos de "Otros Ingresos".';
