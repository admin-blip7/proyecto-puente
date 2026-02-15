import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RepairStatus, Warranty, CreditAccountStatus } from "@/types";
import { formatMXNAmount, validateMXNAmount, normalizeMXNAmount } from "@/lib/validation/currencyValidation";
import { getLogger } from "@/lib/logger";
import { formatCurrencyWithPreferences } from "@/lib/appPreferences";

const log = getLogger("utils");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  // Manejar valores negativos convirtiéndolos a positivos y agregando prefijo
  const isNegative = value < 0;
  const absoluteValue = Math.abs(value);

  // Normalizar primero para manejar problemas de precisión de punto flotante
  const normalizedValue = normalizeMXNAmount(absoluteValue);
  const validation = validateMXNAmount(normalizedValue);

  if (!validation.isValid) {
    log.warn(`Intento de formatear monto inválido: ${value} (normalizado: ${normalizedValue}). Error: ${validation.error}`);
    return formatCurrencyWithPreferences(0);
  }

  const formattedAmount = formatMXNAmount(normalizedValue);
  return isNegative ? `-${formattedAmount}` : formattedAmount;
};

export const getWarrantyStatusVariant = (status: Warranty["status"]) => {
  switch (status) {
    case "Pendiente":
      return "default";
    case "En Revisión":
      return "secondary";
    case "Resuelta":
      return "outline";
    case "Rechazada":
      return "destructive";
    default:
      return "default";
  }
};

export const getStatusVariant = (
  status: RepairStatus
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Recibido":
      return "default";
    case "En Diagnóstico":
    case "En Reparación":
    case "Esperando Refacción":
      return "secondary";
    case "Listo para Entrega":
      return "outline";
    case "Completado":
      return "default";
    case "Cancelado":
      return "destructive";
    default:
      return "default";
  }
};

export const getCreditStatusVariant = (
  status: CreditAccountStatus
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Al Corriente":
      return "default";
    case "Atrasado":
      return "destructive";
    case "Pagado":
      return "secondary";
    default:
      return "outline";
  }
};

/**
 * Formats a category slug-like string into a Title Case string with spaces.
 * Example: "equipos-de-sonido" -> "Equipos De Sonido"
 */
export function formatCategoryLabel(text: string): string {
  if (!text) return "";

  return text
    .split(/[-_ ]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
