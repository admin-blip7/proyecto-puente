-- Migration: Add partner_id to accounts table

DO $$ 
BEGIN

    -- accounts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'partner_id') THEN
        ALTER TABLE public.accounts ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

END $$;
