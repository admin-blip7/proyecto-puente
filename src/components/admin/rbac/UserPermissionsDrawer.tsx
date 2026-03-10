import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { Permission, PermissionModule, UserPermissions } from '@/types/rbac';
import { PermissionModulePanel } from './PermissionModulePanel';
import { RoleBadge } from './RoleBadges';

interface UserPermissionsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        partnerName?: string;
    } | null;
    userPermissions: UserPermissions | null;
    availableBranches?: { id: string; name: string }[];
    onSave: (permissions: Permission[]) => Promise<void>;
}

const MODULES: { id: PermissionModule; label: string; icon: string }[] = [
    { id: 'pos', label: 'POS', icon: '📱' },
    { id: 'inventory', label: 'Inventario', icon: '📦' },
    { id: 'finance', label: 'Finanzas', icon: '💰' },
    { id: 'crm', label: 'CRM', icon: '👥' },
    { id: 'sales', label: 'Ventas', icon: '📊' },
    { id: 'repairs', label: 'Reparaciones', icon: '🔧' },
    { id: 'settings', label: 'Ajustes', icon: '⚙️' },
];

export function UserPermissionsDrawer({
    isOpen,
    onClose,
    user,
    userPermissions,
    availableBranches = [],
    onSave,
}: UserPermissionsDrawerProps) {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userPermissions?.customPermissions) {
            setPermissions(userPermissions.customPermissions);
        } else {
            setPermissions([]);
        }
    }, [userPermissions]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(permissions);
            onClose();
        } catch (error) {
            console.error('Error saving permissions:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex justify-between items-center">
                        <SheetTitle>Permisos de Usuario</SheetTitle>
                    </div>
                </SheetHeader>

                <div className="space-y-6">
                    {/* User Info */}
                    <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                        <span className="font-semibold text-lg">{user.name}</span>
                        <span className="text-sm text-gray-500">{user.email}</span>
                        <div className="flex gap-2 mt-2">
                            <RoleBadge role={user.role} />
                            {user.partnerName && (
                                <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                                    {user.partnerName}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Permisos */}
                    <div className="border border-gray-200 rounded-lg p-1">
                        <Tabs defaultValue="pos" className="w-full">
                            <TabsList className="w-full flex flex-wrap h-auto bg-transparent justify-start gap-1 p-1">
                                {MODULES.map((m) => (
                                    <TabsTrigger
                                        key={m.id}
                                        value={m.id}
                                        className="data-[state=active]:bg-gray-100 flex items-center gap-1"
                                    >
                                        {m.icon} {m.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <div className="p-4 mt-2">
                                {MODULES.map((m) => (
                                    <TabsContent key={m.id} value={m.id}>
                                        <PermissionModulePanel
                                            module={m.id}
                                            title={`${m.icon} Permisos de ${m.label}`}
                                            permissions={permissions}
                                            onChange={setPermissions}
                                            availableBranches={availableBranches}
                                        />
                                    </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    </div>

                    <div className="my-6">
                        <h4 className="font-semibold mb-2">Resumen de Permisos</h4>
                        <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                            {MODULES.map(m => {
                                const count = permissions.filter(p => p.module === m.id).length;
                                if (count === 0) return null;
                                return (
                                    <div key={m.id} className="flex justify-between border-b border-gray-200 pb-1">
                                        <span>{m.icon} {m.label}</span>
                                        <span className="font-medium text-blue-600">{count} permitidos</span>
                                    </div>
                                );
                            })}
                            {permissions.length === 0 && (
                                <span className="text-gray-500 text-xs">No hay permisos personalizados asignados.</span>
                            )}
                        </div>
                    </div>

                </div>

                <div className="mt-8 flex justify-end space-x-2">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
