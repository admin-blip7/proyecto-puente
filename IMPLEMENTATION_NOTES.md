# Sale Cancellation Implementation

## Overview
This implementation adds a transactional backend flow that cancels one or many sales, restores inventory, adjusts consignor balances, and logs the reversal for auditing.

## Changes Made

### 1. Database Migration (`supabase/migrations/20250125_add_sale_cancellation_support.sql`)
- Added cancellation columns to `sales` table:
  - `status` (TEXT, default 'completed', CHECK constraint for 'completed'|'cancelled')
  - `cancelled_at` (TIMESTAMPTZ)
  - `cancelled_by` (UUID)
  - `cancel_reason` (TEXT)
- Created index on `status` column for efficient filtering
- Reconciled `inventory_logs` table to support both creation and cancellation operations:
  - Added columns: `change_type`, `quantity_change`, `previous_stock`, `new_stock`, `reference_id`, `notes`
  - These work alongside existing columns: `product_id`, `product_name`, `change`, `reason`, `updated_by`, `metadata`
- Created `cancel_sales()` stored procedure that:
  - Takes array of sale IDs, user ID, user name, and optional cancel reason
  - Processes each sale transactionally
  - Verifies sale exists and is not already cancelled
  - Restores product stock for each item
  - Creates inventory log entries with reason 'Cancelación de Venta'
  - Reverses consignor balance additions when applicable
  - Marks sales as cancelled
  - Returns per-sale success/error results

### 2. TypeScript Types (`src/types/index.ts`)
- Added `SaleStatus` type: `'completed' | 'cancelled'`
- Extended `Sale` interface with optional fields:
  - `status?: SaleStatus`
  - `cancelledAt?: Date`
  - `cancelledBy?: string`
  - `cancelReason?: string`

### 3. Service Layer (`src/lib/services/salesService.ts`)
- Updated `mapSale()` to map cancellation fields from database
- Enhanced `getSales()` to accept optional `includeStatus` parameter:
  - `undefined` (default): returns only completed sales
  - `'completed'`: returns only completed sales
  - `'cancelled'`: returns only cancelled sales
  - `'all'`: returns all sales regardless of status
- Added `cancelSales()` function that:
  - Calls the stored procedure via service-role Supabase client
  - Normalizes response into structured results
  - Returns `CancelSalesResponse` with per-sale results and summary statistics
- Updated `addSaleAndUpdateStock()` to explicitly set `status: 'completed'` on new sales

### 4. API Endpoint (`src/app/api/sales/cancel/route.ts`)
- Created POST endpoint at `/api/sales/cancel`
- Accepts request body:
  ```typescript
  {
    saleIds: string[];        // Array of sale IDs to cancel
    performedBy: string;      // User ID performing the cancellation
    performedByName?: string; // User name (optional, defaults to performedBy)
    cancelReason?: string;    // Optional reason for cancellation
  }
  ```
- Returns structured response:
  ```typescript
  {
    success: boolean;
    results: Array<{
      saleId: string;
      success: boolean;
      errorMessage?: string;
    }>;
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    message: string;
    timestamp: string;
  }
  ```
- HTTP status codes:
  - 200: All sales cancelled successfully
  - 207 (Multi-Status): Partial success
  - 400: Invalid request
  - 500: All failed or internal error
- Comprehensive error handling ensures one sale failure doesn't abort others
- Detailed logging for observability

### 5. Bug Fix (`src/app/api/test-supabase/route.ts`)
- Fixed missing parentheses in `.from('profiles')` call (was `.from 'profiles'`)

## Features

### Atomicity
- Each sale is processed in its own transaction block within the stored procedure
- A failure on one sale does not affect others
- All operations for a single sale (inventory restore, consignor balance adjustment, status update) are atomic

### Inventory Management
- Product stock is incremented by the quantity sold
- Inventory logs record the restoration with:
  - Both new schema fields (`change_type`, `quantity_change`, etc.)
  - And existing schema fields (`product_id`, `product_name`, `change`, `reason`, etc.)

### Consignor Balance Handling
- For consigned products, the consignor's `balanceDue` is decremented by the original cost
- Only affects products that have a `consignor_id`
- Balance calculation: `new_balance = current_balance - (product_cost * quantity)`

### Audit Trail
- All cancellations are logged with:
  - Who cancelled (`cancelled_by`, `cancelled_by_name`)
  - When cancelled (`cancelled_at`)
  - Why cancelled (`cancel_reason`)
  - Inventory logs with detailed metadata

### UI Integration
- `getSales()` by default excludes cancelled sales from results
- Callers can explicitly request cancelled or all sales
- Cancelled sales no longer appear in standard UI views

## Testing

### Manual Testing
```bash
# Test the API endpoint
curl -X POST http://localhost:3000/api/sales/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "saleIds": ["SALE-12345678"],
    "performedBy": "user-uuid",
    "performedByName": "Admin User",
    "cancelReason": "Customer requested refund"
  }'
```

### Expected Behaviors
1. Cancelling a valid sale:
   - Returns success=true for that sale
   - Product stock increases
   - Consignor balance decreases (if applicable)
   - Sale marked as cancelled
   - Inventory log created

2. Cancelling an already-cancelled sale:
   - Returns success=false with error "Sale already cancelled"
   - No changes to inventory or balances

3. Cancelling a non-existent sale:
   - Returns success=false with error "Sale not found"

4. Partial failure scenario:
   - Some sales succeed, others fail
   - Returns 207 status with detailed per-sale results

## Migration Deployment

The migration is ready to be applied to Supabase:
```bash
supabase db push
# or
supabase migration up
```

## Notes

- The stored procedure uses `SECURITY DEFINER` to run with elevated privileges
- Permissions are granted to both `authenticated` and `service_role`
- The implementation handles both `saleId` (camelCase) and `saleid` (lowercase) columns for compatibility
- Inventory logs support both old and new schema for backward compatibility
