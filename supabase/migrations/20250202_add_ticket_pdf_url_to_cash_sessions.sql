-- Add ticket_pdf_url column to cash_sessions table for storing PDF tickets
-- This column stores the Supabase Storage URL of the generated cash close ticket PDF

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cash_sessions'
          AND column_name = 'ticket_pdf_url'
    ) THEN
        ALTER TABLE public.cash_sessions
        ADD COLUMN ticket_pdf_url TEXT;

        -- Add a comment to document the column
        COMMENT ON COLUMN public.cash_sessions.ticket_pdf_url IS 'URL to the PDF ticket stored in Supabase Storage';
    END IF;
END $$;

-- Create an index for faster queries on this column (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_cash_sessions_ticket_pdf_url ON public.cash_sessions(ticket_pdf_url);
