import { z } from "zod";

export type PermissionModule =
    | 'pos'           // Punto de Venta
    | 'inventory'     // Gestión de Inventario
    | 'sales'         // Ventas y Reportes
    | 'finance'       // Finanzas y Caja
    | 'crm'           // CRM y Clientes
    | 'repairs'       // Reparaciones
    | 'warranties'    // Garantías
    | 'products'      // Catálogo de Productos
    | 'partners'      // Gestión de Socios (solo Master)
    | 'users'         // Gestión de Usuarios
    | 'settings';     // Configuración

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export interface Permission {
    module: PermissionModule;
    action: PermissionAction;
    scope: 'global' | 'partner' | 'branch';
    branchIds?: string[]; // Para permisos específicos por sucursal
    partnerId?: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    isSystem: boolean; // Roles del sistema (no editables)
    permissions: Permission[];
    partnerId?: string; // NULL = rol global (Master), valor = rol personalizado de socio
}

export interface UserPermissions {
    id?: string;
    userId: string;
    roleId?: string;
    inheritedPermissions?: Permission[]; // Desde el rol
    customPermissions: Permission[];    // Asignados directamente
    branchId?: string;                   // Sucursal de asignación
    effectivePermissions?: Permission[];  // Heredados + Custom (resuelto)
}
