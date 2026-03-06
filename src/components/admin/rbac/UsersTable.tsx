"use client";

import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, ShieldOff, KeyRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RoleBadge, UserStatusBadge } from './RoleBadges';
import { UserPermissionsDrawer } from './UserPermissionsDrawer';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    partnerName?: string;
    partnerId?: string;
    branchName?: string;
    isActive: boolean;
}

interface UsersTableProps {
    initialUsers: User[];
    context: 'master' | 'partner';
    availableBranches?: { id: string; name: string }[];
    onUpdatePermissions?: (userId: string, permissions: any[]) => Promise<void | unknown>;
    onToggleStatus?: (userId: string) => Promise<void | unknown>;
    onResetPassword?: (userId: string) => Promise<void | unknown>;
}

export function UsersTable({
    initialUsers,
    context,
    availableBranches = [],
    onUpdatePermissions,
    onToggleStatus,
    onResetPassword
}: UsersTableProps) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleOpenDrawer = (user: User) => {
        setSelectedUser(user);
        setDrawerOpen(true);
    };

    const handleSavePermissions = async (permissions: any[]) => {
        if (selectedUser && onUpdatePermissions) {
            await onUpdatePermissions(selectedUser.id, permissions);
            // In a real implementation we would reload the user's effective permissions
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Input
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">Todos los roles</option>
                        <option value="Master Admin">Master Admin</option>
                        <option value="Socio">Socio</option>
                        <option value="Admin de Tienda">Admin de Tienda</option>
                        <option value="Cajero">Cajero</option>
                    </select>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Usuario</th>
                                <th className="px-6 py-4 font-semibold">Rol</th>
                                {context === 'master' && <th className="px-6 py-4 font-semibold">Socio</th>}
                                <th className="px-6 py-4 font-semibold">Sucursal</th>
                                <th className="px-6 py-4 font-semibold">Estado</th>
                                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{user.name}</div>
                                        <div className="text-gray-500 text-xs">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <RoleBadge role={user.role} />
                                    </td>
                                    {context === 'master' && (
                                        <td className="px-6 py-4 text-gray-600">
                                            {user.partnerName || '—'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-gray-600">
                                        {user.branchName || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <UserStatusBadge isActive={user.isActive} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenDrawer(user)}>
                                                    Administrar Permisos
                                                </DropdownMenuItem>
                                                {onResetPassword && (
                                                    <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
                                                        <KeyRound className="w-4 h-4 mr-2" />
                                                        Resetear Password
                                                    </DropdownMenuItem>
                                                )}
                                                {onToggleStatus && (
                                                    <DropdownMenuItem onClick={() => onToggleStatus(user.id)} className="text-red-600">
                                                        <ShieldOff className="w-4 h-4 mr-2" />
                                                        {user.isActive ? 'Desactivar Usuario' : 'Activar Usuario'}
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron usuarios coincidiendo con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <UserPermissionsDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                user={selectedUser}
                userPermissions={{ userId: selectedUser?.id || '', customPermissions: [] }} // Aquí cargaríamos los reales
                availableBranches={availableBranches}
                onSave={handleSavePermissions}
            />
        </div>
    );
}
