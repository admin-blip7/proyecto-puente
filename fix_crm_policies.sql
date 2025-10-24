-- Fix CRM policies by creating them separately without conflicts

-- Fix CRM policies by creating them separately without conflicts

-- Drop existing conflicting policies if they exist
DO $$
BEGIN
    DECLARE
        tbl record;
        r_name TEXT;
    BEGIN
        -- Get all CRM-like tables
        FOR tbl IN
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename LIKE 'crm_%'
        LOOP
            BEGIN
                SELECT format('%I policy for table %s', tbl.tablename) INTO r_name;

                -- Drop existing policies if they exist
                EXECUTE format('DROP POLICY IF EXISTS "Users can view %s" ON %s', r_name, tbl.tablename);
                EXECUTE format('DROP POLICY IF EXISTS "Users can insert %s" ON %s', r_name, tbl.tablename);
                EXECUTE format('DROP POLICY IF EXISTS "Users can update %s" ON %s', r_name, tbl.tablename);
                EXECUTE format('DROP POLICY IF EXISTS "Users can delete %s" ON %s', r_name, tbl.tablename);

                -- Create basic policies
                EXECUTE format('CREATE POLICY "Users can view %s" ON %s FOR SELECT USING (auth.role() = ''authenticated'');', r_name, tbl.tablename);
                EXECUTE format('CREATE POLICY "Users can insert %s" ON %s FOR INSERT WITH CHECK (auth.role() = ''authenticated'');', r_name, tbl.tablename);
                EXECUTE format('CREATE POLICY "Users can update %s" ON %s FOR UPDATE USING (auth.role() = ''authenticated'');', r_name, tbl.tablename);
                EXECUTE format('CREATE POLICY "Users can delete %s" ON %s FOR DELETE USING (auth.role() = ''authenticated'');', r_name, tbl.tablename);

                -- Enable RLS
                EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', tbl.tablename);
            END;
        END IF;
    END;
END $$;