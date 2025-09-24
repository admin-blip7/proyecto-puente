import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RepairStatus, Warranty, CreditAccountStatus } from "@/types";
import { formatMXNAmount, validateMXNAmount } from "@/lib/validation/currencyValidation";
import { getLogger } from "@/lib/logger";

const log = getLogger("utils");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  const validation = validateMXNAmount(value);
  if (!validation.isValid) {
    log.warn(`Intento de formatear monto inválido: ${value}. Error: ${validation.error}`);
    return "$0.00 MXN";
  }
  return formatMXNAmount(value);
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
