# Fix for TypeError: watchedAmount?.toFixed is not a function

## Problem
The error occurred because `watchedAmount` from react-hook-form was returning a string value instead of a number, causing the `.toFixed()` method to fail.

## Root Cause
- React Hook Form with zod coercion was returning the input value as string
- The component was trying to call `.toFixed()` directly on a string value

## Solutions Applied

### 1. Added type conversion
```typescript
// Ensure watchedAmount is a number for toFixed operations
const numericAmount = typeof watchedAmount === 'string' ? parseFloat(watchedAmount) || 0 : (watchedAmount || 0);
```

### 2. Created formatAmount utility function
```typescript
const formatAmount = (amount: number | string | undefined) => {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0);
  return num.toFixed(2);
};
```

### 3. Updated zod schema
- Changed from `z.coerce.number()` to `z.union([z.number(), z.string()])`
- Added transform to handle string to number conversion
- Maintained all validation rules

### 4. Updated all toFixed calls
Replaced all instances of `watchedAmount?.toFixed(2)` with `formatAmount(watchedAmount)`

### 5. Updated form configuration
- Changed default value from `0` to `''` (empty string)
- Updated reset to use empty string
- Ensured API calls use numericAmount instead of data.amount

## Files Modified
- `src/components/admin/consignors/RegisterPaymentDialog.tsx`

## Key Changes
- Line 81: Added numericAmount conversion
- Line 120-123: Added formatAmount utility function
- Line 20-34: Updated zod schema with union type and transform
- Line 75: Changed default amount to empty string
- Line 92: Changed reset amount to empty string
- Line 43-45: Updated type definition
- Lines 415, 452, 475, 509: Replaced toFixed calls with formatAmount
- Line 428: Used numericAmount for calculation
- Lines 156, 172: Use numericAmount for API calls

## Result
- No more TypeError when using toFixed
- Proper handling of both string and number inputs
- Consistent display formatting throughout the component