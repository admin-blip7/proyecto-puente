import {
  DEFAULT_APP_PREFERENCES,
  formatCurrencyWithPreferences,
  getCurrencyLabel,
  getRuntimeAppPreferences,
} from "@/lib/appPreferences";

/**
 * Validaciones de moneda para asegurar consistencia con la configuración global.
 */

export const ALLOWED_CURRENCY = DEFAULT_APP_PREFERENCES.currency;
export const CURRENCY_SYMBOL = "$";
export const CURRENCY_NAME = getCurrencyLabel(ALLOWED_CURRENCY);

const getConfiguredCurrency = () => getRuntimeAppPreferences().currency;

/**
 * Valida que un monto sea válido para transacciones monetarias.
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

  // Normalizar primero para manejar problemas de precisión de punto flotante
  const normalizedAmount = normalizeMXNAmount(amount);

  // Validar que el monto normalizado tenga máximo 2 decimales (centavos)
  const decimalPlaces = (normalizedAmount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'El monto no puede tener más de 2 decimales (centavos)' };
  }

  // Validar límite máximo razonable para transacciones
  const MAX_TRANSACTION_AMOUNT = 999999999.99;
  if (normalizedAmount > MAX_TRANSACTION_AMOUNT) {
    const locale = getRuntimeAppPreferences().locale;
    const currency = getConfiguredCurrency();
    return {
      isValid: false,
      error: `El monto no puede exceder ${MAX_TRANSACTION_AMOUNT.toLocaleString(locale)} ${currency}`,
    };
  }

  return { isValid: true };
};

/**
 * Valida que una transacción esté en la moneda global configurada.
 */
export const validateTransactionCurrency = (currency?: string): { isValid: boolean; error?: string } => {
  const configuredCurrency = getConfiguredCurrency();
  const configuredCurrencyName = getCurrencyLabel(configuredCurrency);

  if (!currency) {
    // Si no se especifica moneda, asumimos la moneda global configurada.
    return { isValid: true };
  }

  if (currency !== configuredCurrency) {
    return {
      isValid: false,
      error: `Solo se permiten transacciones en ${configuredCurrencyName} (${configuredCurrency}). Moneda recibida: ${currency}`,
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
 * Usa una estrategia más robusta para manejar problemas de precisión de punto flotante
 */
export const normalizeMXNAmount = (amount: number): number => {
  // Convertir a string y luego a número con precisión fija para evitar errores de punto flotante
  return parseFloat(amount.toFixed(2));
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
    return formatCurrencyWithPreferences(0);
  }

  return formatCurrencyWithPreferences(amount);
};
