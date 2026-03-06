import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Permission, PermissionModule, PermissionAction } from '@/types/rbac';
import { Checkbox } from '@/components/ui/checkbox';

interface PermissionModulePanelProps {
    module: PermissionModule;
    title: string;
    permissions: Permission[];
    onChange: (permissions: Permission[]) => void;
    availableBranches?: { id: string; name: string }[];
}

const actions: { id: PermissionAction; label: string }[] = [
    { id: 'view', label: 'Ver' },
    { id: 'create', label: 'Crear' },
    { id: 'edit', label: 'Editar' },
    { id: 'delete', label: 'Eliminar' },
    { id: 'approve', label: 'Aprobar' },
];

export function PermissionModulePanel({
    module,
    title,
    permissions,
    onChange,
    availableBranches = [],
}: PermissionModulePanelProps) {
    const currentModulePerms = permissions.filter((p) => p.module === module);

    const hasAction = (action: PermissionAction) => currentModulePerms.some((p) => p.action === action);

    const toggleAction = (action: PermissionAction, checked: boolean) => {
        if (checked) {
            if (!hasAction(action)) {
                onChange([...permissions, { module, action, scope: 'global' }]);
            }
        } else {
            onChange(permissions.filter((p) => !(p.module === module && p.action === action)));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{title}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {actions.map((action) => (
                    <div key={action.id} className="flex items-center space-x-2">
                        <Switch
                            id={`perm-${module}-${action.id}`}
                            checked={hasAction(action.id)}
                            onCheckedChange={(c) => toggleAction(action.id, c)}
                        />
                        <Label htmlFor={`perm-${module}-${action.id}`}>{action.label}</Label>
                    </div>
                ))}
            </div>

            {availableBranches.length > 0 && currentModulePerms.length > 0 && (
                <div className="mt-6 space-y-3">
                    <Label className="text-sm text-gray-500">Aplicar a sucursales (Opcional, vacío = Todas)</Label>
                    <div className="flex flex-wrap gap-4">
                        {availableBranches.map((b) => {
                            // Si un permiso tiene scope = branch y contiene este branchId, está checkeado.
                            // Asumimos para simplificar UI que aplicamos branches a TODOS los permisos del módulo
                            const isChecked = currentModulePerms.some(p => p.scope === 'branch' && p.branchIds?.includes(b.id));

                            return (
                                <div key={b.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`branch-${module}-${b.id}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                            const newPerms = permissions.map(p => {
                                                if (p.module === module) {
                                                    let newBranchIds = p.branchIds || [];
                                                    if (checked) {
                                                        newBranchIds = [...newBranchIds, b.id];
                                                        return { ...p, scope: 'branch' as const, branchIds: newBranchIds };
                                                    } else {
                                                        newBranchIds = newBranchIds.filter(id => id !== b.id);
                                                        const scope = newBranchIds.length > 0 ? 'branch' as const : 'global' as const;
                                                        return { ...p, scope, branchIds: newBranchIds.length > 0 ? newBranchIds : undefined };
                                                    }
                                                }
                                                return p;
                                            });
                                            onChange(newPerms);
                                        }}
                                    />
                                    <Label htmlFor={`branch-${module}-${b.id}`}>{b.name}</Label>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
