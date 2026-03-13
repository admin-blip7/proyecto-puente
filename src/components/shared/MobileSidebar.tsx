"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    House01,
    Archive,
    ShoppingBag01,
    EditPencil01,
    ShieldCheck as CoolShieldCheck,
    Tag as CoolTag,
    Users as CoolUsers,
    CarAuto,
    Mobile,
    Settings as CoolSettings,
    ChartLine,
    CreditCard02,
    FileDocument,
    Clock,
    ShoppingBag02,
    Printer,
    TicketVoucher,
    UserCheck,
    Bulb,
    LogOut,
    ChevronRight,
    Bell
} from "react-coolicons";
import { Building2 as BuildingIcon, Globe, X as XIcon, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks";
import { useBranch } from "@/contexts/BranchContext";
import { getRoutesTodayCount } from "@/lib/services/deliveryRouteService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut, userProfile } = useAuth();
    const { selectedBranch, availableBranches } = useBranch();
    const [routesToday, setRoutesToday] = useState(0);

    const isSocio = userProfile?.role === "Socio";

    // Get user initials for avatar
    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
    };

    const branchName = useMemo(() => {
        if (!isSocio) return "Global / Matriz";
        if (selectedBranch?.name) return selectedBranch.name;
        return "Seleccionar sucursal";
    }, [isSocio, selectedBranch?.name]);

    // Mobile-optimized navigation - essential items only
    const mainItems = [
        { label: "🏠 POS", href: "/pos", icon: House01, active: pathname === "/pos" },
    ];

    const quickActions = [
        { label: "📦 Inventario", href: "/admin", icon: Archive },
        { label: "💰 Ventas", href: "/admin/sales", icon: ShoppingBag01 },
        { label: "🔧 Reparaciones", href: "/admin/repairs", icon: EditPencil01 },
        { label: "📱 Diagnóstico", href: "/admin/diagnostico", icon: Mobile },
        { label: "🚚 Rutas", href: "/admin/delivery/routes", icon: Truck, badge: routesToday },
    ];

    const settingsItems = [
        { label: "⚙️ Configuración", href: "/admin/settings", icon: CoolSettings },
        { label: "👥 Usuarios", href: "/admin/usuarios", icon: CoolUsers },
        { label: "🖨️ Impresión", href: "/admin/settings?tab=printers", icon: Printer },
        { label: "🎫 Tickets", href: "/admin/settings?tab=tickets", icon: TicketVoucher },
        { label: "🏷️ Etiquetas", href: "/admin/settings?tab=labels", icon: CoolTag },
    ];

    useEffect(() => {
        let mounted = true;
        getRoutesTodayCount()
            .then((count) => {
                if (mounted) setRoutesToday(count);
            })
            .catch(() => {});
        return () => { mounted = false; };
    }, [pathname]);

    const handleNavigation = (href: string) => {
        router.push(href);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
            <div className="fixed left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-background animate-in slide-in-from-left">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-primary/5">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={userProfile?.avatar_url || ""} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(userProfile?.full_name || userProfile?.email)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm truncate max-w-[150px]">
                                {userProfile?.full_name || "Usuario"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <BuildingIcon className="h-3 w-3" />
                                {branchName}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <XIcon className="h-5 w-5" />
                    </Button>
                </div>

                <ScrollArea className="h-[calc(100vh-80px)]">
                    {/* Quick Access */}
                    <div className="p-3">
                        <p className="text-xs font-medium text-muted-foreground px-3 mb-2">ACCESO RÁPIDO</p>
                        <div className="space-y-1">
                            {mainItems.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => handleNavigation(item.href)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-left transition-colors",
                                        "min-h-[52px] touch-manipulation",
                                        pathname === item.href 
                                            ? "bg-primary text-primary-foreground" 
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Operations */}
                    <div className="p-3">
                        <p className="text-xs font-medium text-muted-foreground px-3 mb-2">OPERACIONES</p>
                        <div className="space-y-1">
                            {quickActions.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => handleNavigation(item.href)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left transition-colors",
                                        "min-h-[52px] touch-manipulation",
                                        pathname === item.href || pathname.startsWith(item.href + "/")
                                            ? "bg-primary text-primary-foreground" 
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    {item.badge && item.badge > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Settings */}
                    <div className="p-3 pb-8">
                        <p className="text-xs font-medium text-muted-foreground px-3 mb-2">CONFIGURACIÓN</p>
                        <div className="space-y-1">
                            {settingsItems.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => handleNavigation(item.href)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left transition-colors",
                                        "min-h-[52px] touch-manipulation",
                                        pathname === item.href || pathname.includes(item.href.split('?')[0])
                                            ? "bg-primary text-primary-foreground" 
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </button>
                            ))}
                        </div>

                        {/* Logout */}
                        <button
                            onClick={() => {
                                signOut();
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-left text-red-500 hover:bg-red-50 mt-4 min-h-[52px]"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
