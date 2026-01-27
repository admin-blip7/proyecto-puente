-- Function to merge duplicate clients
-- It finds clients with the same First Name + Last Name
-- Keeps the one with a "real" identification (not temp-*) or the oldest one
-- Moves all crm_interactions to the kept client
-- Deletes the duplicate clients

DO $$
DECLARE
    r RECORD;
    kept_client_id BIGINT;
    duplicate_client_ids BIGINT[];
    id_iter BIGINT;
    dup_count INT;
BEGIN
    RAISE NOTICE 'Starting duplicate client merge...';

    -- Loop through groups of duplicates
    FOR r IN 
        SELECT 
            first_name, 
            last_name, 
            array_agg(id ORDER BY 
                CASE 
                    WHEN identification_number IS NULL OR identification_number LIKE 'temp-%' OR identification_number LIKE 'TEMP-%' THEN 1 
                    ELSE 0 
                END,
                created_at ASC
            ) as ids,
            COUNT(*) as count
        FROM crm_clients
        WHERE first_name IS NOT NULL AND last_name IS NOT NULL
        GROUP BY first_name, last_name
        HAVING COUNT(*) > 1
    LOOP
        -- The first ID in the array is the one we keep (because of the ORDER BY case: real ID first, then oldest)
        kept_client_id := r.ids[1];
        
        -- The rest are duplicates
        duplicate_client_ids := r.ids[2:array_length(r.ids, 1)];
        
        RAISE NOTICE 'Merging % %: Keeping ID %, Deleting IDs %', r.first_name, r.last_name, kept_client_id, duplicate_client_ids;
        
        -- Loop through duplicates to move data
        FOREACH id_iter IN ARRAY duplicate_client_ids
        LOOP
            -- 1. Move Interactions
            UPDATE crm_interactions 
            SET client_id = kept_client_id 
            WHERE client_id = id_iter;
            
            -- 2. Move Tasks
            UPDATE crm_tasks 
            SET client_id = kept_client_id 
            WHERE client_id = id_iter;
            
            -- 3. Move Documents
            UPDATE crm_documents 
            SET client_id = kept_client_id 
            WHERE client_id = id_iter;
            
            -- 4. Delete the duplicate client
            DELETE FROM crm_clients WHERE id = id_iter;
        END LOOP;
        
    END LOOP;
    
    RAISE NOTICE 'Duplicate merge completed.';
END $$;
