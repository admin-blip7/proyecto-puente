"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    Folder
} from "react-coolicons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Removed signOut import as it's not being used in the simplified view or needs to be handled differently.
// If specific auth logic is needed, import useAuth.
import { ModeToggle } from "@/components/mode-toggle"; // Adjusted path to match original

export default function LeftSidebar() {
    const pathname = usePathname();
    // const { signOut } = useAuth(); // Removed as per instruction comment

    const mainNavItems = [
        { label: "POS", href: "/pos", icon: House01 },
    ];

    const operationsItems = [
        { label: "Inventario", href: "/admin", icon: Archive },
        { label: "Kardex", href: "/admin/kardex", icon: FileDocument },
        { label: "Entrada Stock", href: "/admin/stock-entry", icon: DownloadPackage },
        { label: "Quick PO", href: "/admin/inventory/quick-po-intake", icon: ShoppingBag02 },
        { label: "Ventas", href: "/admin/sales", icon: ShoppingBag01 },
        { label: "Reparaciones", href: "/admin/repairs", icon: EditPencil01 },
        { label: "Garantías", href: "/admin/warranties", icon: CoolShieldCheck },
        { label: "Etiquetas", href: "/admin/labels", icon: CoolTag },
    ];

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
        { label: "Reimprimir Etiquetas", href: "/admin/labels", icon: Printer },
        { label: "Diseño de Tickets", href: "/admin/settings?tab=tickets", icon: TicketVoucher },
        { label: "Diseño de Etiquetas", href: "/admin/settings?tab=labels", icon: CoolTag },
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
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
                    isActive(item.href)
                        ? "bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30"
                        : "text-gray-400 hover:text-white hover:bg-sidebar-hover"
                )}
            >
                <item.icon className={cn("w-6 h-6", isActive(item.href) && "fill-current")} />
            </Link>
        );

        if (item.subItems) {
            return (
                <DropdownMenu key={item.label}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
                                        isActive(item.href)
                                            ? "bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30"
                                            : "text-gray-400 hover:text-white hover:bg-sidebar-hover"
                                    )}
                                >
                                    <item.icon className={cn("w-6 h-6", isActive(item.href) && "fill-current")} />
                                </button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={15}>
                            {item.label}
                        </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" sideOffset={20} className="w-56 bg-sidebar-bg border-gray-800 text-gray-400">
                        {item.subItems.map((sub: any) => (
                            <DropdownMenuItem key={sub.href} asChild>
                                <Link
                                    href={sub.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-sidebar-hover hover:text-white transition-colors",
                                        (pathname === sub.href) && "text-white bg-primary/20"
                                    )}
                                >
                                    <sub.icon className="w-4 h-4" />
                                    <span>{sub.label}</span>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        return (
            <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                    {Content}
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={15}>
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    };

    return (
        <TooltipProvider delayDuration={0}>
            <aside className="w-20 lg:w-24 flex-shrink-0 flex flex-col bg-sidebar-bg text-white z-30 shadow-xl items-center py-6 transition-all duration-300 h-screen overflow-hidden">
                <div className="mb-8 flex-shrink-0">
                    <Link href="/pos">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-glow hover:shadow-lg hover:scale-105 transition-all duration-300">
                            <House01 className="w-6 h-6 fill-white" />
                        </div>
                    </Link>
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
                    <div className="w-full flex flex-col items-center gap-3 pt-2">
                        <div className="w-8 h-[1px] bg-gray-700/50 rounded-full mb-1 opacity-50"></div>
                        {managementItems.map(renderNavItem)}
                    </div>

                    <div className="mt-auto mb-4 flex flex-col gap-4 items-center w-full pt-4">
                        <div className="w-8 h-[1px] bg-gray-700/50 rounded-full mb-1 opacity-50"></div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-sidebar-hover transition-all group relative">
                                    <ModeToggle />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">Tema</TooltipContent>
                        </Tooltip>

                        {renderNavItem(settingsItem)}

                        {/* Sign Out Button - Re-added as it was in the original structure and not explicitly removed from the final JSX */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    // onClick={() => signOut()} // Re-enable if useAuth is re-imported
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-sidebar-hover transition-all group relative"
                                >
                                    <CoolLogOut className="w-6 h-6" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={15}>Salir</TooltipContent>
                        </Tooltip>
                    </div>
                </nav>
            </aside>
        </TooltipProvider>
    );
}
