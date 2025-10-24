-- Fix total_purchases discrepancies based on actual interactions

-- 1. Fix antonio mohameht: set to 40 (his actual sale amount)
UPDATE crm_clients
SET total_purchases = 40.00
WHERE firestore_id = '2e1891fa-f187-4bc6-b759-20dbe210ce63'
AND first_name = 'antonio'
AND last_name = 'mohameht';

-- 2. Fix benito rodriguez: set to 80 (his actual sale amount)
UPDATE crm_clients
SET total_purchases = 80.00
WHERE firestore_id = 'sale-1761321760064-0sh0dkt96'
AND first_name = 'benito'
AND last_name = 'rodriguez';

-- 3. Verify the fixes
SELECT 
    first_name,
    last_name,
    phone,
    total_purchases,
    (SELECT SUM(amount) FROM crm_interactions WHERE client_id = crm_clients.id AND interaction_type = 'sale') as calculated_total
FROM crm_clients
WHERE first_name IN ('antonio', 'benito')
ORDER BY first_name;
