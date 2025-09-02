import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { RepairStatus, Warranty } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getWarrantyStatusVariant = (status: Warranty['status']) => {
    switch (status) {
      case 'Pendiente':
        return 'default';
      case 'En Revisión':
        return 'secondary';
      case 'Resuelta':
        return 'outline';
      case 'Rechazada':
        return 'destructive';
      default:
        return 'default';
    }
};

export const getStatusVariant = (status: RepairStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Recibido':
        return 'default';
      case 'En Diagnóstico':
      case 'En Reparación':
      case 'Esperando Refacción':
        return 'secondary';
      case 'Listo para Entrega':
        return 'outline';
      case 'Completado':
        return 'default'; // Or a success variant if you add one
      case 'Cancelado':
        return 'destructive';
      default:
        return 'default';
    }
};
