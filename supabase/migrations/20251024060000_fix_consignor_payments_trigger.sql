-- Fix consignor payments table trigger
-- First create the missing function

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- Now update the trigger to use the correct function
DROP TRIGGER IF EXISTS update_consignor_payments_updated_at ON consignor_payments;

CREATE TRIGGER update_consignor_payments_updated_at
    BEFORE UPDATE ON consignor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();