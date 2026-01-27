-- Recalculate total_purchases for all clients
-- This ensures the denormalized total_purchases field matches the actual sum of sales

DO $$
BEGIN
    RAISE NOTICE 'Starting total_purchases recalculation...';

    -- Update total_purchases from crm_interactions
    -- We join crm_clients with a subquery that sums amounts from interactions
    UPDATE crm_clients c
    SET total_purchases = COALESCE(sub.total, 0)
    FROM (
        SELECT client_id, SUM(amount) as total
        FROM crm_interactions
        WHERE interaction_type = 'sale'
        GROUP BY client_id
    ) sub
    WHERE c.id = sub.client_id;
    
    RAISE NOTICE 'Recalculation completed.';
END $$;
