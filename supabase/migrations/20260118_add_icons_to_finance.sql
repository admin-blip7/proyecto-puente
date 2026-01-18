-- Migration: Add icon support to finance tables
-- This migration adds an icon column to categories, transactions, and assets to support Photoroom icons.

-- 1. Add icon to expense_categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'icon') THEN
        ALTER TABLE public.expense_categories ADD COLUMN icon TEXT;
    END IF;
END $$;

-- 2. Add icon to income_categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'income_categories' AND column_name = 'icon') THEN
        ALTER TABLE public.income_categories ADD COLUMN icon TEXT;
    END IF;
END $$;

-- 3. Add icon to expenses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'icon') THEN
        ALTER TABLE public.expenses ADD COLUMN icon TEXT;
    END IF;
END $$;

-- 4. Add icon to incomes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'icon') THEN
        ALTER TABLE public.incomes ADD COLUMN icon TEXT;
    END IF;
END $$;

-- 5. Add custom_icon to fixed_assets (iOS compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fixed_assets' AND column_name = 'custom_icon') THEN
        ALTER TABLE public.fixed_assets ADD COLUMN custom_icon TEXT;
    END IF;
END $$;
