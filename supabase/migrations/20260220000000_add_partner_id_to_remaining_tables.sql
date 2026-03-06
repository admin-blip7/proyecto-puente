-- Migration: Add partner_id to remaining POS tables

DO $$ 
BEGIN

    -- repair_orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repair_orders' AND column_name = 'partner_id') THEN
        ALTER TABLE public.repair_orders ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- warranties_new
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties_new' AND column_name = 'partner_id') THEN
        ALTER TABLE public.warranties_new ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- consignors
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignors' AND column_name = 'partner_id') THEN
        ALTER TABLE public.consignors ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- consignor_transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignor_transactions' AND column_name = 'partner_id') THEN
        ALTER TABLE public.consignor_transactions ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- consignor_payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consignor_payments' AND column_name = 'partner_id') THEN
        ALTER TABLE public.consignor_payments ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- debts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'partner_id') THEN
        ALTER TABLE public.debts ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- incomes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'partner_id') THEN
        ALTER TABLE public.incomes ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- transfers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'partner_id') THEN
        ALTER TABLE public.transfers ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- expense_categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'partner_id') THEN
        ALTER TABLE public.expense_categories ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- purchase_orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'partner_id') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- suppliers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'partner_id') THEN
        ALTER TABLE public.suppliers ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- inventory_logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'partner_id') THEN
        ALTER TABLE public.inventory_logs ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

    -- kardex
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kardex' AND column_name = 'partner_id') THEN
        ALTER TABLE public.kardex ADD COLUMN partner_id UUID REFERENCES public.partners(id);
    END IF;

END $$;
