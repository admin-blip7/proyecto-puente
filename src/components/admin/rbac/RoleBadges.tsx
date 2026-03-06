import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown, ShoppingCart, User } from 'lucide-react';

export const getRoleBadgeVariant = (role: string) => {
    switch (role) {
        case 'Master Admin':
        case 'Admin': return { variant: 'default' as const, icon: Shield, color: 'bg-blue-500' };
        case 'Socio': return { variant: 'secondary' as const, icon: Crown, color: 'bg-yellow-500' };
        case 'Admin de Tienda': return { variant: 'default' as const, icon: Shield, color: 'bg-indigo-500' };
        case 'Cajero': return { variant: 'outline' as const, icon: ShoppingCart, color: 'bg-green-500 text-green-700 border-green-500' };
        case 'Cliente': return { variant: 'outline' as const, icon: User, color: 'bg-gray-500 text-gray-700 border-gray-500' };
        default: return { variant: 'outline' as const, icon: User, color: 'bg-gray-400 text-gray-600 border-gray-400' };
    }
};

interface RoleBadgeProps {
    role: string;
    className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
    const { variant, icon: Icon, color } = getRoleBadgeVariant(role);
    return (
        <Badge variant={variant} className={`flex items-center gap-1 w-fit ${color} ${className}`}>
            <Icon className="w-3 h-3" />
            {role}
        </Badge>
    );
}

interface PermissionIndicatorProps {
    granted: boolean;
    inherited?: boolean;
}

export function PermissionIndicator({ granted, inherited }: PermissionIndicatorProps) {
    if (inherited) {
        return <span className="text-blue-500 text-xs font-medium">↳ Heredado</span>;
    }
    return (
        <span className={`font-bold ${granted ? 'text-green-500' : 'text-red-500'}`}>
            {granted ? '✓' : '✗'}
        </span>
    );
}

interface UserStatusBadgeProps {
    isActive?: boolean;
    isSuspended?: boolean;
    lastLoginDaysAgo?: number;
}

export function UserStatusBadge({ isActive = true, isSuspended = false, lastLoginDaysAgo = 0 }: UserStatusBadgeProps) {
    if (!isActive) return <Badge variant="destructive">Inactivo</Badge>;
    if (isSuspended) return <Badge variant="outline" className="border-orange-500 text-orange-500">Suspendido</Badge>;
    if (lastLoginDaysAgo > 30) return <Badge variant="secondary">Inactivo 30d</Badge>;
    return <Badge variant="default" className="bg-green-500">Activo</Badge>;
}
