-- Diagnóstico detallado para cliente antonio mohameht

-- 1. Verificar datos del cliente
SELECT 
    id,
    firestore_id,
    first_name,
    last_name,
    phone,
    total_purchases,
    registration_date,
    last_contact_date,
    created_at
FROM crm_clients
WHERE first_name = 'antonio' AND last_name = 'mohameht'
ORDER BY created_at DESC;

-- 2. Ver todas las interacciones de este cliente (todas las tablas)
SELECT 
    ci.id,
    ci.firestore_id,
    ci.interaction_type,
    ci.amount,
    ci.interaction_date,
    ci.description,
    ci.related_table,
    ci.created_at
FROM crm_interactions ci
WHERE ci.client_id IN (
    SELECT id FROM crm_clients 
    WHERE first_name = 'antonio' AND last_name = 'mohameht'
)
ORDER BY ci.interaction_date DESC;

-- 3. Contar interacciones por tipo para este cliente
SELECT 
    interaction_type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM crm_interactions
WHERE client_id IN (
    SELECT id FROM crm_clients 
    WHERE first_name = 'antonio' AND last_name = 'mohameht'
)
GROUP BY interaction_type;

-- 4. Comparar: ¿cuál debería ser el total según las interacciones?
SELECT 
    cc.id,
    cc.first_name,
    cc.last_name,
    cc.phone,
    cc.total_purchases as "Valor en BD",
    COALESCE(SUM(CASE WHEN ci.interaction_type = 'sale' THEN ci.amount ELSE 0 END), 0)::DECIMAL(12,2) as "Suma de interacciones de venta",
    cc.total_purchases - COALESCE(SUM(CASE WHEN ci.interaction_type = 'sale' THEN ci.amount ELSE 0 END), 0) as "Diferencia"
FROM crm_clients cc
LEFT JOIN crm_interactions ci ON cc.id = ci.client_id
WHERE cc.first_name = 'antonio' AND cc.last_name = 'mohameht'
GROUP BY cc.id, cc.first_name, cc.last_name, cc.phone, cc.total_purchases;
