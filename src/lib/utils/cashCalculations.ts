/**
 * Cash Float Management Utility Functions
 *
 * These utilities handle calculations related to cash float management in the POS system.
 * They can be used on both client and server sides.
 */

/**
 * Calculate net cash sales excluding float money
 *
 * Formula: Net Cash Sales = Total Cash Counted - Opening Float - Closing Float
 *
 * This ensures float money (cash left in drawer for change) doesn't inflate sales figures.
 * Float money is operating cash for giving change, not revenue.
 *
 * @param totalCashCounted - The total amount of cash counted in the drawer
 * @param openingFloat - The amount of cash that started in the drawer (from previous shift)
 * @param closingFloat - The amount of cash to leave in the drawer for the next shift
 * @returns Net cash sales amount (revenue generated from cash sales)
 *
 * @example
 * // Closing a shift: counted $1000, started with $200, leaving $300
 * calculateNetCashSales(1000, 200, 300) // Returns 500
 *
 * @example
 * // No float: counted $1000, started with $0, leaving $0
 * calculateNetCashSales(1000, 0, 0) // Returns 1000
 *
 * @example
 * // All cash is float: counted $200, started with $200, leaving $200
 * calculateNetCashSales(200, 200, 200) // Returns 0
 */
export const calculateNetCashSales = (
  totalCashCounted: number,
  openingFloat: number,
  closingFloat: number
): number => {
  // Ensure we're working with valid numbers
  const counted = Number(totalCashCounted) || 0;
  const opening = Number(openingFloat) || 0;
  const closing = Number(closingFloat) || 0;

  // Net cash sales is what's left after removing both floats
  const netSales = counted - opening - closing;

  // Sales cannot be negative - if the calculation results in negative,
  // it means there's a cash shortage (more money taken out than came in)
  // This should be reported separately as a shortage/overage
  return Math.max(0, netSales);
};

/**
 * Calculate the amount to deposit when closing a cash session
 *
 * Formula: Deposit Amount = Total Cash Counted - Closing Float
 *
 * The closing float is retained in the drawer for the next shift and is NOT deposited.
 * Only the net amount is transferred to the bank/account.
 *
 * @param totalCashCounted - The total amount of cash counted in the drawer
 * @param closingFloat - The amount of cash to leave in the drawer for the next shift
 * @returns Amount to deposit to the bank account
 *
 * @example
 * // Counted $1000, leaving $300 as float
 * calculateDepositAmount(1000, 300) // Returns 700
 *
 * @example
 * // Counted $500, leaving $0 as float (all cash to deposit)
 * calculateDepositAmount(500, 0) // Returns 500
 */
export const calculateDepositAmount = (
  totalCashCounted: number,
  closingFloat: number
): number => {
  const counted = Number(totalCashCounted) || 0;
  const closing = Number(closingFloat) || 0;
  return Math.max(0, counted - closing);
};

/**
 * Calculate expected cash in drawer before closing
 *
 * Formula: Expected Cash = Opening Float + Cash Sales - Cash Payouts
 *
 * This helps detect shortages or overages by comparing expected vs actual.
 *
 * @param openingFloat - The amount of cash that started in the drawer
 * @param cashSales - Total cash sales made during the shift
 * @param cashPayouts - Total cash payouts made during the shift
 * @returns Expected amount of cash that should be in the drawer
 *
 * @example
 * // Started with $200, sold $800 in cash, paid out $50
 * calculateExpectedCash(200, 800, 50) // Returns 950
 */
export const calculateExpectedCash = (
  openingFloat: number,
  cashSales: number,
  cashPayouts: number
): number => {
  const opening = Number(openingFloat) || 0;
  const sales = Number(cashSales) || 0;
  const payouts = Number(cashPayouts) || 0;
  return opening + sales - payouts;
};

/**
 * Calculate the difference between actual and expected cash
 *
 * Formula: Difference = Actual Cash Counted - Expected Cash
 *
 * Positive values indicate overage, negative values indicate shortage.
 * Zero indicates the drawer is balanced.
 *
 * @param actualCashCounted - The actual amount of cash counted in the drawer
 * @param expectedCash - The expected amount of cash based on calculations
 * @returns Difference amount (positive = overage, negative = shortage, 0 = balanced)
 *
 * @example
 * // Expected $950, counted $960
 * calculateCashDifference(960, 950) // Returns 10 (overage)
 *
 * @example
 * // Expected $950, counted $940
 * calculateCashDifference(940, 950) // Returns -10 (shortage)
 */
export const calculateCashDifference = (
  actualCashCounted: number,
  expectedCash: number
): number => {
  const actual = Number(actualCashCounted) || 0;
  const expected = Number(expectedCash) || 0;
  return actual - expected;
};

/**
 * Validate if a closing float amount is valid
 *
 * A closing float is valid if:
 * - It is non-negative
 * - It does not exceed the total cash count
 *
 * @param closingFloat - The closing float amount to validate
 * @param totalCashCounted - The total cash counted in the drawer
 * @returns Object with isValid boolean and optional error message
 *
 * @example
 * validateClosingFloat(300, 1000) // { isValid: true }
 *
 * @example
 * validateClosingFloat(-50, 1000) // { isValid: false, error: "Closing float cannot be negative" }
 *
 * @example
 * validateClosingFloat(1500, 1000) // { isValid: false, error: "Closing float cannot exceed total cash count" }
 */
export const validateClosingFloat = (
  closingFloat: number,
  totalCashCounted: number
): { isValid: boolean; error?: string } => {
  const float = Number(closingFloat) || 0;
  const counted = Number(totalCashCounted) || 0;

  if (float < 0) {
    return {
      isValid: false,
      error: "Closing float cannot be negative."
    };
  }

  if (float > counted) {
    return {
      isValid: false,
      error: "Closing float cannot exceed total cash count."
    };
  }

  return { isValid: true };
};
