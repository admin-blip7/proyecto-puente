/**
 * Validaciones de moneda para asegurar que todas las transacciones se procesen en MXN
 */

export const ALLOWED_CURRENCY = 'MXN';
export const CURRENCY_SYMBOL = '$';
export const CURRENCY_NAME = 'Peso Mexicano';

/**
 * Valida que un monto sea válido para transacciones en MXN
 */
export const validateMXNAmount = (amount: number): { isValid: boolean; error?: string } => {
  if (typeof amount !== 'number') {
    return { isValid: false, error: 'El monto debe ser un número válido' };
  }

  if (isNaN(amount)) {
    return { isValid: false, error: 'El monto no puede ser NaN' };
  }

  if (amount < 0) {
    return { isValid: false, error: 'El monto no puede ser negativo' };
  }

  if (!isFinite(amount)) {
    return { isValid: false, error: 'El monto debe ser un número finito' };
  }

  // Validar que el monto tenga máximo 2 decimales (centavos)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'El monto no puede tener más de 2 decimales (centavos)' };
  }

  // Validar límite máximo razonable para transacciones
  const MAX_TRANSACTION_AMOUNT = 999999999.99; // 999 millones de pesos
  if (amount > MAX_TRANSACTION_AMOUNT) {
    return { isValid: false, error: `El monto no puede exceder $${MAX_TRANSACTION_AMOUNT.toLocaleString('es-MX')} MXN` };
  }

  return { isValid: true };
};

/**
 * Valida que una transacción esté en la moneda correcta (MXN)
 */
export const validateTransactionCurrency = (currency?: string): { isValid: boolean; error?: string } => {
  if (!currency) {
    // Si no se especifica moneda, asumimos MXN por defecto
    return { isValid: true };
  }

  if (currency !== ALLOWED_CURRENCY) {
    return { 
      isValid: false, 
      error: `Solo se permiten transacciones en ${CURRENCY_NAME} (${ALLOWED_CURRENCY}). Moneda recibida: ${currency}` 
    };
  }

  return { isValid: true };
};

/**
 * Valida una transacción completa (monto y moneda)
 */
export const validateTransaction = (
  amount: number, 
  currency?: string
): { isValid: boolean; error?: string } => {
  // Validar moneda primero
  const currencyValidation = validateTransactionCurrency(currency);
  if (!currencyValidation.isValid) {
    return currencyValidation;
  }

  // Validar monto
  const amountValidation = validateMXNAmount(amount);
  if (!amountValidation.isValid) {
    return amountValidation;
  }

  return { isValid: true };
};

/**
 * Normaliza un monto para asegurar que tenga máximo 2 decimales
 */
export const normalizeMXNAmount = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

/**
 * Convierte cualquier entrada de monto a un formato válido para MXN
 */
export const sanitizeMXNAmount = (input: string | number): number => {
  let amount: number;

  if (typeof input === 'string') {
    // Remover símbolos de moneda y espacios
    const cleanInput = input.replace(/[$,\s]/g, '');
    amount = parseFloat(cleanInput);
  } else {
    amount = input;
  }

  if (isNaN(amount)) {
    return 0;
  }

  return normalizeMXNAmount(Math.abs(amount));
};

/**
 * Formatea un monto en MXN para mostrar al usuario
 */
export const formatMXNAmount = (amount: number): string => {
  const validation = validateMXNAmount(amount);
  if (!validation.isValid) {
    return '$0.00 MXN';
  }

  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: ALLOWED_CURRENCY 
  }).format(amount);
};