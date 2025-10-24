# Fix for Payment Processing Error

## Problem
The error "Error al procesar el pago. Intente nuevamente." was occurring when trying to register a payment for a consignor.

## Root Causes Identified
1. The API was expecting to find consignors by `firestore_id` but the actual database uses UUID `id` as primary key
2. The `consignor_transactions` table didn't exist in the database
3. Type mismatch between TEXT and UUID in foreign key references
4. The component was sending the wrong identifier in the API call

## Solutions Applied

### 1. Updated Consignor Type (`src/types/index.ts`)
- Added optional `firestore_id` field to Consignor interface
- Prepared for backward compatibility

### 2. Updated Consignor Service (`src/lib/services/consignorService.ts`)
- Modified `mapConsignor` to prioritize UUID `id` over `firestore_id`
- Ensured consistent ID mapping throughout the service

### 3. Updated Payment API (`src/app/api/consignors/[id]/register-payment/route.ts`)
- Changed from searching by both `firestore_id` and `id` to only using `id` (UUID)
- Updated transaction structure to use proper UUID references
- Fixed foreign key relationships to use the correct consignor ID
- Updated response to include correct transaction and consignor IDs

### 4. Updated RegisterPaymentDialog Component (`src/components/admin/consignors/RegisterPaymentDialog.tsx`)
- Modified to use `consignor.firestore_id || consignor.id` for API calls
- Ensured backward compatibility with existing data
- Fixed numeric conversion issues with `toFixed` errors

### 5. Updated ConsignorClient Component (`src/components/admin/consignors/ConsignorClient.tsx`)
- Modified `handlePaymentRegistered` to match consignors by both `id` and `firestore_id`
- Ensured UI updates correctly regardless of which ID is used

### 6. Created consignor_transactions Table
- Created new table to track all payment transactions
- Defined proper relationships and indexes
- Enabled Row Level Security (RLS)
- Added foreign key constraint to consignors table

## Database Schema
```sql
CREATE TABLE consignor_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firestore_id TEXT UNIQUE NOT NULL,
  consignorId UUID NOT NULL REFERENCES consignors(id),
  consignorName TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paymentMethod TEXT NOT NULL,
  notes TEXT,
  previousBalance DECIMAL(10,2) NOT NULL,
  newBalance DECIMAL(10,2) NOT NULL,
  transactionType TEXT NOT NULL DEFAULT 'payment',
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processedBy TEXT
);
```

## Key Changes Summary
- All consignor references now use UUID `id` instead of `firestore_id`
- Proper transaction tracking with audit trail
- Type consistency between frontend and backend
- Fixed all type conversion issues

## Testing Instructions
1. Navigate to /admin/consignors
2. Click on "Registrar Pago" for any consignor with balance
3. Fill in payment details
4. Submit payment
5. Verify payment is registered successfully
6. Check that consignor balance is updated
7. Verify transaction is recorded in database

## Files Modified
- `src/types/index.ts`
- `src/lib/services/consignorService.ts`
- `src/app/api/consignors/[id]/register-payment/route.ts`
- `src/components/admin/consignors/RegisterPaymentDialog.tsx`
- `src/components/admin/consignors/ConsignorClient.tsx`
- `scripts/create-consignor-transactions-table.sql` (NEW)
- `supabase/migrations/20251023175048_create_consignor_transactions_table.sql` (NEW)

## Notes
- The system now properly tracks all payment transactions
- UUIDs are used as primary keys for database consistency
- Backward compatibility is maintained for any data still using firestore_id
- All payment operations are properly logged and auditable