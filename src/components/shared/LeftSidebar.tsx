"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    LogOut as CoolLogOut,
    ChartLine,
    CreditCard02,
    FileDocument,
    Clock,
    ShieldWarning,
    ShoppingBag02,
    Printer,
    TicketVoucher,
    Folder,
    ChartBarVertical01
} from "react-coolicons";
import { Building2, Globe, Eye, Truck, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/lib/hooks";
import { ModeToggle } from "@/components/mode-toggle";
import { useBranch } from "@/contexts/BranchContext";
import { getRoutesTodayCount } from "@/lib/services/deliveryRouteService";

export default function LeftSidebar() {
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
        return name
            .split(" ")
            .map(n => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    const branchName = useMemo(() => {
        if (!isSocio) return "Global / Matriz";
        if (selectedBranch?.name) return selectedBranch.name;
        if (availableBranches.length > 1) return "Seleccionar sucursal";
        if (availableBranches.length === 1) return availableBranches[0].name;
        return "Sin sucursal";
    }, [isSocio, selectedBranch?.name, availableBranches]);

    const mainNavItems = [
        { label: "POS", href: "/pos", icon: House01 },
    ];

    const operationsItems = [
        { label: "Dashboard Socio", href: "/socio/dashboard", icon: Building2 },
        { label: "Inventario", href: "/admin", icon: Archive },
        { label: "Kardex", href: "/admin/kardex", icon: FileDocument },
        { label: "Entrada Stock", href: "/admin/stock-entry", icon: DownloadPackage },
        { label: "Quick PO", href: "/admin/inventory/quick-po-intake", icon: ShoppingBag02 },
        { label: "Ventas", href: "/admin/sales", icon: ShoppingBag01 },
        { label: "Reparaciones", href: "/admin/repairs", icon: EditPencil01 },
        { label: "Diagnóstico", href: "/admin/diagnostico", icon: Mobile },
        { label: "Garantías", href: "/admin/warranties", icon: CoolShieldCheck },
        { label: "Rutas", href: "/admin/delivery/routes", icon: Truck, badge: routesToday },
        { label: "Etiquetas", href: "/admin/labels", icon: CoolTag },
    ];

    useEffect(() => {
        let mounted = true;
        void getRoutesTodayCount()
            .then((count) => {
                if (mounted) setRoutesToday(count);
            })
            .catch(() => {
                if (mounted) setRoutesToday(0);
            });
        return () => {
            mounted = false;
        };
    }, [pathname]);

    const financeSubItems = [
        { label: "Resumen", href: "/admin/finance", icon: ChartLine },
        { label: "Cuentas", href: "/admin/finance/accounts", icon: CreditCard02 },
        { label: "Activos", href: "/admin/finance/assets", icon: DownloadPackage },
        { label: "Balance", href: "/admin/finance/balance-sheet", icon: FileDocument },
        { label: "Historial de Caja", href: "/admin/finance/cash-history", icon: Clock },
        { label: "Categorías", href: "/admin/finance/categories", icon: CoolTag },
        { label: "Deudas", href: "/admin/finance/debts", icon: ShieldWarning },
        { label: "Gastos", href: "/admin/finance/expenses", icon: ShoppingBag02 },
    ];

    const settingsSubItems = [
        { label: "Configuración General", href: "/admin/settings", icon: CoolSettings },
        { label: "Usuarios y Roles", href: "/admin/usuarios", icon: CoolUsers },
        { label: "Reimprimir Etiquetas", href: "/admin/labels", icon: Printer },
        { label: "Diseño de Tickets", href: "/admin/settings?tab=tickets", icon: TicketVoucher },
        { label: "Diseño de Etiquetas", href: "/admin/settings?tab=labels", icon: CoolTag },
        { label: "Impresoras", href: "/admin/settings?tab=printers", icon: Printer },
        { label: "Gestión de Categorías", href: "/admin/settings?tab=categories", icon: Folder },
    ];

    const managementItems = [
        {
            label: "Finanzas",
            href: "/admin/finance",
            icon: CreditCard01,
            subItems: financeSubItems
        },
        { label: "CRM", href: "/admin/crm", icon: CoolUsers },
        { label: "Proveedores", href: "/admin/suppliers", icon: CarAuto },
        { label: "Consignaciones", href: "/admin/consignors", icon: CoolUserCheck },
        { label: "Compatibilidad", href: "/admin/compatibility", icon: Mobile },
        { label: "Inteligencia", href: "/admin/intelligence", icon: Bulb },
    ];

    // Master Admin exclusive items
    const masterAdminItems = [
        { label: "Inventario Global", href: "/admin/inventario-global", icon: ChartBarVertical01 },
        { label: "Auditoría", href: "/admin/auditoria-productos", icon: Eye },
        { label: "Mayoreo Config", href: "/pos/mayoreo-config", icon: Percent },
    ];

    const settingsItem = {
        label: "Configuración",
        href: "/admin/settings",
        icon: CoolSettings,
        subItems: settingsSubItems
    };

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

    const renderNavItem = (item: any) => {
        const Content = (
            <Link
                href={item.href}
                className={cn(
                    "w-[90%] mx-auto h-12 rounded-xl flex items-center justify-start px-4 transition-all group relative",
                    isActive(item.href)
                        ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/30 font-medium"
                        : "text-gray-400 hover:text-white hover:bg-sidebar-hover font-medium"
                )}
            >
                <item.icon className={cn("w-6 h-6 flex-shrink-0", isActive(item.href) && "fill-current")} />
                <span className="ml-3 text-sm">{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 ? (
                    <span className="absolute right-3 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-black text-[10px] leading-5 font-bold text-center flex items-center justify-center">
                        {item.badge > 99 ? "99+" : item.badge}
                    </span>
                ) : null}
            </Link>
        );

        if (item.subItems) {
            return (
                <Collapsible key={item.label} className="w-full relative">
                    <CollapsibleTrigger asChild>
                        <div
                            className={cn(
                                "w-[90%] mx-auto h-12 rounded-xl flex items-center justify-between px-4 transition-all group relative cursor-pointer",
                                isActive(item.href)
                                    ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/30 font-medium"
                                    : "text-gray-400 hover:text-white hover:bg-sidebar-hover font-medium"
                            )}
                        >
                            <div className="flex items-center">
                                <item.icon className={cn("w-6 h-6 flex-shrink-0", isActive(item.href) && "fill-current")} />
                                <span className="ml-3 text-sm">{item.label}</span>
                            </div>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                        {item.subItems.map((sub: any) => (
                            <Link
                                key={sub.href}
                                href={sub.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-sidebar-hover hover:text-white transition-all rounded-md mx-6",
                                    (pathname === sub.href) ? "text-blue-400 bg-blue-500/10 font-medium" : "text-gray-400"
                                )}
                            >
                                <sub.icon className="w-4 h-4" />
                                <span className="text-sm">{sub.label}</span>
                            </Link>
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            );
        }

        return (
            <div key={item.href || item.label} className="w-full">
                {Content}
            </div>
        );
    };

    return (
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col bg-sidebar-bg/95 md:bg-sidebar-bg backdrop-blur-xl text-white z-30 shadow-2xl items-center py-6 md:py-6 transition-all duration-300 h-screen overflow-hidden">
            <div className="mb-8 flex-shrink-0 w-full px-4 flex justify-center">
                <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none w-full max-w-[90%] mx-auto flex items-center justify-start gap-3 p-2 rounded-xl ring-1 ring-blue-500/20 hover:ring-blue-500/50 bg-white/5 hover:bg-white/10 transition-all cursor-pointer shadow-lg hover:shadow-blue-500/20">
                        <Avatar className="w-10 h-10 rounded-lg flex-shrink-0">
                            <AvatarImage src="" alt={userProfile?.name || "User"} />
                            <AvatarFallback className="bg-gradient-to-b from-blue-500 to-blue-700 text-white rounded-lg text-sm font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/30">
                                {getInitials(userProfile?.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start overflow-hidden flex-1 truncate pr-2">
                            <span className="font-semibold text-white text-sm truncate w-full text-left">{userProfile?.name || "Usuario"}</span>
                            <span className="text-xs text-blue-400 truncate w-full text-left">{isSocio ? "Socio" : (userProfile?.role || "Admin")}</span>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" sideOffset={20} className="w-64 p-4 bg-sidebar-bg border-gray-800">
                        <div className="flex flex-col gap-1 mb-4">
                            <span className="font-semibold text-white">{userProfile?.name || "Usuario"}</span>
                            <span className="text-sm text-gray-400 truncate">{userProfile?.email}</span>
                        </div>
                        <div className="flex flex-col gap-1 py-3 border-y border-gray-800">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal / Rol</span>
                            <span className="text-sm text-white">
                                {branchName && <span className="text-blue-400">{branchName}</span>}
                                {branchName && <span className="text-gray-500 mx-1">•</span>}
                                {isSocio ? "Socio" : (userProfile?.role || "Administrador")}
                            </span>
                        </div>
                        {canSwitchBranch && (
                            <DropdownMenuItem
                                className="mt-2 cursor-pointer"
                                onClick={() => router.push("/socio/seleccionar-sucursal")}
                            >
                                <Building2 className="mr-2 h-4 w-4" />
                                Cambiar sucursal
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="mt-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 cursor-pointer" onClick={() => signOut()}>
                            <CoolLogOut className="w-4 h-4 mr-2" />
                            Cerrar Sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <nav className="flex-1 w-full flex flex-col items-center gap-4 overflow-y-auto no-scrollbar pb-4">
                {/* Main POS/Dashboard */}
                {mainNavItems.map(renderNavItem)}

                {/* Operations Group */}
                <div className="w-full flex flex-col items-center gap-3 pt-2">
                    {/* <div className="w-8 h-[1px] bg-gray-700/50 rounded-full mb-1"></div> */}
                    {operationsItems.map(renderNavItem)}
                </div>

                {/* Management Group */}
                {managementItems.length > 0 && (
                    <div className="w-full flex flex-col items-center gap-3 pt-2">
                        <div className="w-8 h-[1px] bg-gray-700/50 rounded-full mb-1 opacity-50"></div>
                        {managementItems.map(renderNavItem)}
                    </div>
                )}

                {/* Master Admin Exclusive Group */}
                {isAdmin && masterAdminItems.length > 0 && (
                    <div className="w-full flex flex-col items-center gap-3 pt-2">
                        <div className="w-8 h-[1px] bg-gray-700/50 rounded-full mb-1 opacity-50"></div>
                        {masterAdminItems.map(renderNavItem)}
                    </div>
                )}

                <div className="mt-auto mb-4 flex flex-col gap-4 items-center w-full pt-4">
                    <div className="w-[80%] md:w-8 h-[1px] bg-gray-700/50 rounded-full mb-1 opacity-50"></div>

                    <div className="w-[90%] mx-auto h-12 rounded-xl flex items-center justify-start px-4 text-gray-400 hover:text-white hover:bg-sidebar-hover transition-all group relative cursor-pointer font-medium">
                        <div className="flex-shrink-0 w-6 h-6">
                            <ModeToggle />
                        </div>
                        <span className="ml-3 text-sm">Tema Visual</span>
                    </div>

                    {settingsItem && renderNavItem(settingsItem)}

                    {canSwitchBranch && (
                        <button
                            onClick={() => router.push("/socio/seleccionar-sucursal")}
                            className="w-[90%] mx-auto h-12 rounded-xl flex items-center justify-start px-4 text-gray-400 hover:text-white hover:bg-sidebar-hover transition-all group relative font-medium"
                        >
                            <Building2 className="w-6 h-6 flex-shrink-0" />
                            <span className="ml-3 text-sm">Cambiar Sucursal</span>
                        </button>
                    )}

                    {/* Sign Out Button */}
                    <button
                        onClick={() => signOut()}
                        className="w-[90%] mx-auto h-12 rounded-xl flex items-center justify-start px-4 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all group relative font-medium"
                    >
                        <CoolLogOut className="w-6 h-6 flex-shrink-0" />
                        <span className="ml-3 text-sm">Cerrar Sesión</span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}
