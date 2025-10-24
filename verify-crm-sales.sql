-- Diagnóstico: Verificar si las ventas se registran en CRM

-- 1. Ver todos los clientes y sus totales
SELECT 
    id,
    firestore_id,
    first_name,
    last_name,
    phone,
    total_purchases,
    last_contact_date,
    created_at
FROM crm_clients
ORDER BY created_at DESC;

-- 2. Ver todas las interacciones de tipo 'sale'
SELECT 
    ci.id,
    ci.firestore_id,
    ci.client_id,
    cc.first_name,
    cc.last_name,
    ci.interaction_type,
    ci.amount,
    ci.interaction_date,
    ci.description
FROM crm_interactions ci
LEFT JOIN crm_clients cc ON ci.client_id = cc.id
WHERE ci.interaction_type = 'sale'
ORDER BY ci.interaction_date DESC;

-- 3. Contar cuántas interacciones tiene cada cliente
SELECT 
    cc.id,
    cc.first_name,
    cc.last_name,
    COUNT(ci.id) as interaction_count,
    SUM(CASE WHEN ci.interaction_type = 'sale' THEN ci.amount ELSE 0 END) as total_sales_from_interactions
FROM crm_clients cc
LEFT JOIN crm_interactions ci ON cc.id = ci.client_id
GROUP BY cc.id, cc.first_name, cc.last_name
ORDER BY interaction_count DESC;

-- 4. Comparar total_purchases en tabla vs suma de interacciones
SELECT 
    cc.id,
    cc.firestore_id,
    cc.first_name,
    cc.last_name,
    cc.total_purchases,
    SUM(CASE WHEN ci.interaction_type = 'sale' THEN ci.amount ELSE 0 END)::DECIMAL(12,2) as calculated_total
FROM crm_clients cc
LEFT JOIN crm_interactions ci ON cc.id = ci.client_id
GROUP BY cc.id, cc.firestore_id, cc.first_name, cc.last_name, cc.total_purchases
ORDER BY cc.id;
