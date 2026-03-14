"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    House01,
    Archive,
    DownloadPackage,
    ShoppingBag01,
    EditPencil01,
    ShieldCheck as CoolShieldCheck,
    Tag as CoolTag,
    CreditCard01,
    Users as CoolUsers,
    CarAuto,
    UserCheck as CoolUserCheck,
    Mobile,
    Bulb,
    Settings as CoolSettings,
    LogOut,
    ChartLine,
    CreditCard02,
    FileDocument,
    Clock,
    ShieldWarning,
    ShoppingBag02,
    Printer,
    TicketVoucher,
    Folder,
    ChartBarVertical01,
    Bell
} from "react-coolicons";
import { Building2 as BuildingIcon, Globe, X as XIcon, Truck, Percent, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks";
import { useBranch } from "@/contexts/BranchContext";
import { getRoutesTodayCount } from "@/lib/services/deliveryRouteService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ModeToggle } from "@/components/mode-toggle";

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
    const isAdmin = userProfile?.role === "Admin";
    const canSwitchBranch = isSocio && availableBranches.length > 1;

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

    // ALL navigation items - same as desktop
    const mainItems = [
        { label: "🏠 POS", href: "/pos", icon: House01 },
    ];

    const operationsItems = [
        { label: "Dashboard Socio", href: "/socio/dashboard", icon: BuildingIcon },
        { label: "📦 Inventario", href: "/admin", icon: Archive },
        { label: "📋 Kardex", href: "/admin/kardex", icon: FileDocument },
        { label: "📥 Entrada Stock", href: "/admin/stock-entry", icon: DownloadPackage },
        { label: "🛒 Quick PO", href: "/admin/inventory/quick-po-intake", icon: ShoppingBag02 },
        { label: "💰 Ventas", href: "/admin/sales", icon: ShoppingBag01 },
        { label: "🔧 Reparaciones", href: "/admin/repairs", icon: EditPencil01 },
        { label: "📱 Diagnóstico", href: "/admin/diagnostico", icon: Mobile },
        { label: "🛡️ Garantías", href: "/admin/warranties", icon: CoolShieldCheck },
        { label: "🚚 Rutas", href: "/admin/delivery/routes", icon: Truck, badge: routesToday },
        { label: "🏷️ Etiquetas", href: "/admin/labels", icon: CoolTag },
    ];

    const managementItems = [
        { label: "👥 CRM", href: "/admin/crm", icon: CoolUsers },
        { label: "🚚 Proveedores", href: "/admin/suppliers", icon: CarAuto },
        { label: "🤝 Consignaciones", href: "/admin/consignors", icon: CoolUserCheck },
        { label: "📱 Compatibilidad", href: "/admin/compatibility", icon: Mobile },
        { label: "💡 Inteligencia", href: "/admin/intelligence", icon: Bulb },
    ];

    const masterAdminItems = [
        { label: "📊 Inventario Global", href: "/admin/inventario-global", icon: ChartBarVertical01 },
        { label: "👁️ Auditoría", href: "/admin/auditoria-productos", icon: Eye },
        { label: "% Mayoreo Config", href: "/pos/mayoreo-config", icon: Percent },
    ];

    const financeSubItems = [
        { label: "📊 Resumen", href: "/admin/finance", icon: ChartLine },
        { label: "💳 Cuentas", href: "/admin/finance/accounts", icon: CreditCard02 },
        { label: "📦 Activos", href: "/admin/finance/assets", icon: DownloadPackage },
        { label: "📄 Balance", href: "/admin/finance/balance-sheet", icon: FileDocument },
        { label: "⏰ Historial Caja", href: "/admin/finance/cash-history", icon: Clock },
        { label: "📁 Categorías", href: "/admin/finance/categories", icon: Folder },
        { label: "⚠️ Deudas", href: "/admin/finance/debts", icon: ShieldWarning },
        { label: "💸 Gastos", href: "/admin/finance/expenses", icon: ShoppingBag02 },
    ];

    const settingsSubItems = [
        { label: "⚙️ Configuración", href: "/admin/settings", icon: CoolSettings },
        { label: "👥 Usuarios", href: "/admin/usuarios", icon: CoolUsers },
        { label: "🖨️ Reimprimir", href: "/admin/labels", icon: Printer },
        { label: "🎫 Tickets", href: "/admin/settings?tab=tickets", icon: TicketVoucher },
        { label: "🏷️ Etiquetas", href: "/admin/settings?tab=labels", icon: CoolTag },
        { label: "🖨️ Impresoras", href: "/admin/settings?tab=printers", icon: Printer },
        { label: "📁 Categorías", href: "/admin/settings?tab=categories", icon: Folder },
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

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");
    const financeActive = financeSubItems.some((item) => pathname === item.href);
    const settingsActive = settingsSubItems.some((item) => pathname === item.href);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={onClose}>
            <div 
                className="fixed left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-background animate-in slide-in-from-left"
                onClick={(e) => e.stopPropagation()}
            >
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
                    {/* POS / Main */}
                    <div className="p-3">
                        <div className="space-y-1">
                            {mainItems.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => handleNavigation(item.href)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-left transition-colors",
                                        "min-h-[52px] touch-manipulation",
                                        isActive(item.href) 
                                            ? "bg-primary text-primary-foreground" 
                                            : "hover:bg-muted"
                                    )}
                                >
                                    {typeof item.icon === "string" ? (
                                        <span className="text-lg">{item.icon}</span>
                                    ) : (
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                    )}
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
                            {operationsItems.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => handleNavigation(item.href)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left transition-colors",
                                        "min-h-[52px] touch-manipulation",
                                        isActive(item.href) 
                                            ? "bg-primary text-primary-foreground" 
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {typeof item.icon === "string" ? (
                                            <span className="text-lg">{item.icon}</span>
                                        ) : (
                                            <item.icon className="h-5 w-5 flex-shrink-0" />
                                        )}
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    {item.badge && item.badge > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Management */}
                    <div className="p-3">
                        <p className="text-xs font-medium text-muted-foreground px-3 mb-2">GESTIÓN</p>
                        <div className="space-y-1">
                            {managementItems.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => handleNavigation(item.href)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-left transition-colors",
                                        "min-h-[52px] touch-manipulation",
                                        isActive(item.href) 
                                            ? "bg-primary text-primary-foreground" 
                                            : "hover:bg-muted"
                                    )}
                                >
                                    {typeof item.icon === "string" ? (
                                        <span className="text-lg">{item.icon}</span>
                                    ) : (
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                    )}
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Master Admin Only */}
                    {isAdmin && masterAdminItems.length > 0 && (
                        <>
                            <Separator className="my-2" />
                            <div className="p-3">
                                <p className="text-xs font-medium text-muted-foreground px-3 mb-2">ADMIN MASTER</p>
                                <div className="space-y-1">
                                    {masterAdminItems.map((item) => (
                                        <button
                                            key={item.href}
                                            onClick={() => handleNavigation(item.href)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-left transition-colors",
                                                "min-h-[52px] touch-manipulation",
                                                isActive(item.href) 
                                                    ? "bg-primary text-primary-foreground" 
                                                    : "hover:bg-muted"
                                            )}
                                        >
                                            {typeof item.icon === "string" ? (
                                                <span className="text-lg">{item.icon}</span>
                                            ) : (
                                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                            )}
                                            <span className="font-medium">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <Separator className="my-2" />

                    {/* Finanzas - Collapsible */}
                    <div className="p-3">
                        <Collapsible defaultOpen={financeActive}>
                            <div
                                className={cn(
                                    "flex min-h-[52px] overflow-hidden rounded-lg",
                                    isActive("/admin/finance")
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleNavigation("/admin/finance")}
                                    className="flex flex-1 items-center gap-3 px-4 py-3.5 text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <CreditCard01 className="h-5 w-5" />
                                        <span className="font-medium">💰 Finanzas</span>
                                    </div>
                                </button>
                                <CollapsibleTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Mostrar submenú de Finanzas"
                                        className="flex w-12 items-center justify-center border-l border-border/50"
                                    >
                                        <span className="text-sm transition-transform data-[state=open]:rotate-90">›</span>
                                    </button>
                                </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent className="space-y-1 mt-1">
                                {financeSubItems.map((item) => (
                                    <button
                                        key={item.href}
                                        onClick={() => handleNavigation(item.href)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                                            "min-h-[48px] touch-manipulation ml-4",
                                            isActive(item.href) 
                                                ? "bg-primary/10 text-primary" 
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-sm">{item.label}</span>
                                    </button>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                    {/* Configuración - Collapsible */}
                    <div className="p-3">
                        <Collapsible defaultOpen={settingsActive}>
                            <div
                                className={cn(
                                    "flex min-h-[52px] overflow-hidden rounded-lg",
                                    isActive("/admin/settings")
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleNavigation("/admin/settings")}
                                    className="flex flex-1 items-center gap-3 px-4 py-3.5 text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <CoolSettings className="h-5 w-5" />
                                        <span className="font-medium">⚙️ Configuración</span>
                                    </div>
                                </button>
                                <CollapsibleTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Mostrar submenú de Configuración"
                                        className="flex w-12 items-center justify-center border-l border-border/50"
                                    >
                                        <span className="text-sm transition-transform data-[state=open]:rotate-90">›</span>
                                    </button>
                                </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent className="space-y-1 mt-1">
                                {settingsSubItems.map((item) => (
                                    <button
                                        key={item.href}
                                        onClick={() => handleNavigation(item.href)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                                            "min-h-[48px] touch-manipulation ml-4",
                                            isActive(item.href) 
                                                ? "bg-primary/10 text-primary" 
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-sm">{item.label}</span>
                                    </button>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                    <Separator className="my-2" />

                    {/* Theme Toggle */}
                    <div className="p-3">
                        <div className="flex items-center justify-between px-4 py-3.5 rounded-lg hover:bg-muted min-h-[52px]">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 flex items-center justify-center">
                                    <ModeToggle />
                                </div>
                                <span className="font-medium">🎨 Tema Visual</span>
                            </div>
                        </div>
                    </div>

                    {/* Branch Switch */}
                    {canSwitchBranch && (
                        <div className="p-3">
                            <button
                                onClick={() => handleNavigation("/socio/seleccionar-sucursal")}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-left hover:bg-muted min-h-[52px]"
                            >
                                <BuildingIcon className="h-5 w-5" />
                                <span className="font-medium">Cambiar Sucursal</span>
                            </button>
                        </div>
                    )}

                    {/* Logout */}
                    <div className="p-3 pb-8">
                        <button
                            onClick={() => {
                                signOut();
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-950 min-h-[52px]"
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
