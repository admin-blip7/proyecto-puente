# Debugging Payment Error

## Current Error
"Error al procesar el pago. Intente nuevamente."

## Debugging Steps Performed

### 1. Fixed DialogTitle Accessibility Error ✅
- Updated ErrorSuppressionScript
- Created VisuallyHidden component
- Fixed Dialog UI configuration

### 2. Fixed toFixed TypeError ✅
- Created formatAmount utility function
- Updated zod schema to handle strings
- Fixed all numeric conversions

### 3. Created consignor_transactions Table ✅
- Created table with proper UUID references
- Added indexes and constraints
- Enabled RLS policies

### 4. Updated API and Components ✅
- Changed from firestore_id to UUID id
- Fixed foreign key relationships
- Updated type definitions

## Current Status
The payment registration is still failing. Added extensive logging to:
- Console logs in the frontend component
- Error details in API response
- Database query logs

## To Debug
1. Open browser console
2. Try to register a payment
3. Check the console logs for:
   - Consignor details
   - Form data being submitted
   - API URL being called
   - Response from API

## Test API Directly
Run this in browser console:
```javascript
fetch('/api/consignors/6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb/register-payment', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    amount: 100.00,
    paymentMethod: 'Efectivo',
    notes: 'Test'
  })
}).then(r => r.json()).then(console.log)
```

## Possible Issues
1. Consignor ID mismatch between frontend and backend
2. UUID parsing/validation error
3. Database connection issue
4. Permission/authorization issue
5. Missing required fields in database insert