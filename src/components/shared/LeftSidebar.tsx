"use client";
import Link from 'next/link';
import { Home, Settings, PieChart, ShieldCheck, Wrench, PackagePlus, Users, Landmark, BrainCircuit, Banknote, Building, Scale, Package, ChevronRight, CreditCard, Palette, Printer, Contact, Zap, ShoppingCart, Truck, Search, Menu, LogOut, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

const mainNavItems = [
    { href: '/', icon: Home, label: 'Punto de Venta' },
    { href: '/admin', icon: Package, label: 'Inventario'},
    { href: '/admin/stock-entry', icon: PackagePlus, label: 'Ingresar Stock'},
    { href: '/admin/inventory/quick-po-intake', icon: Zap, label: 'Quick PO Intake'},
    { href: '/admin/purchases', icon: ShoppingCart, label: 'Órdenes de Compra'},
    { href: '/admin/suppliers', icon: Truck, label: 'Proveedores'},
    { href: '/admin/sales', icon: PieChart, label: 'Ventas' },
    { href: '/admin/repairs', icon: Wrench, label: 'Reparaciones' },
    { href: '/admin/warranties', icon: ShieldCheck, label: 'Garantías' },
    { href: '/admin/consignors', icon: Users, label: 'Consignadores'},
    { href: '/admin/credit', icon: Contact, label: 'Crédito y Cobranza'},
    { href: '/admin/crm', icon: UserCheck, label: 'CRM Clientes'},
    { href: '/admin/intelligence', icon: BrainCircuit, label: 'Inteligencia'},
];

const financeNavItems = [
    { href: '/admin/finance', icon: Landmark, label: 'Dashboard Financiero' },
    { href: '/admin/finance/accounts', icon: Banknote, label: 'Cuentas' },
    { href: '/admin/finance/debts', icon: CreditCard, label: 'Gestión de Deudas'},
    { href: '/admin/finance/balance-sheet', icon: Scale, label: 'Balance General' },
    { href: '/admin/finance/assets', icon: Building, label: 'Activos Fijos' },
    { href: '/admin/finance/categories', icon: PieChart, label: 'Categorías Gastos' },
    { href: '/admin/finance/cash-history', icon: Landmark, label: 'Cortes de Caja' },
];

const settingsNavItems = [
    { href: '/admin/settings', icon: Settings, label: 'Diseño de Tickets y Etiquetas' },
    { href: '/admin/labels', icon: Printer, label: 'Imprimir Etiquetas' },
];

const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
};

export default function LeftSidebar() {
    const pathname = usePathname();
    const { userProfile, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [openSection, setOpenSection] = useState<string | null>(null);
    const isFinanceRoute = pathname.startsWith('/admin/finance');
    const isSettingsRoute = pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/labels');

    return (
        <TooltipProvider delayDuration={0}>
            <aside className={cn(
                "flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-in-out z-50",
                sidebarOpen ? "w-64" : "w-20"
            )}>
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                <div className={cn("flex items-center gap-2", !sidebarOpen && "justify-center w-full")}>
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                        <Landmark className="h-6 w-6" />
                    </div>
                    {sidebarOpen && (
                        <span className="font-bold text-xl text-foreground">Swift</span>
                    )}
                </div>
                {sidebarOpen && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg hover:bg-muted"
                    >
                        <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", !sidebarOpen && "rotate-180")} />
                    </Button>
                )}
            </div>

            {/* Search Bar - Only show when sidebar is open */}
            {sidebarOpen && (
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-10 pr-4 py-2 bg-muted border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground"
                        />
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex-1 px-2 overflow-y-auto">
                <nav className="space-y-2">
                    {/* Operations Section */}
                    <div>
                        {sidebarOpen ? (
                            <div className="px-3 py-2">
                                <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                    Operaciones
                                </span>
                            </div>
                        ) : (
                            <div className="h-8"></div>
                        )}

                        <div className="space-y-1">
                            {mainNavItems.map((item) => (
                                <Tooltip key={item.label} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Link href={item.href} className="w-full">
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-start gap-3 h-12 rounded-lg transition-all duration-200",
                                                    pathname === item.href
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                                    !sidebarOpen && "justify-center px-3"
                                                )}
                                            >
                                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                                {sidebarOpen && <span>{item.label}</span>}
                                            </Button>
                                        </Link>
                                    </TooltipTrigger>
                                    {!sidebarOpen && (
                                        <TooltipContent side="right" sideOffset={10}>
                                            <p>{item.label}</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            ))}
                        </div>
                    </div>

                    {/* Finance Section */}
                    <div>
                        <DropdownMenu>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-between h-12 rounded-lg transition-all duration-200 group",
                                                isFinanceRoute
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                                !sidebarOpen && "justify-center px-3"
                                            )}
                                            onClick={() => setOpenSection(openSection === 'finance' ? null : 'finance')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Landmark className="h-5 w-5 flex-shrink-0" />
                                                {sidebarOpen && <span>Finanzas</span>}
                                            </div>
                                            {sidebarOpen && (
                                                <ChevronRight className={cn(
                                                    "h-4 w-4 transition-transform duration-200",
                                                    openSection === 'finance' && "rotate-90"
                                                )} />
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                {!sidebarOpen && (
                                    <TooltipContent side="right" sideOffset={10}>
                                        <p>Finanzas</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>

                            {sidebarOpen && (
                                <DropdownMenuContent
                                    side="right"
                                    align="start"
                                    sideOffset={5}
                                    className="w-64 bg-popover border-border"
                                >
                                    <DropdownMenuLabel className="text-foreground">Módulo de Finanzas</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-border" />
                                    {financeNavItems.map((item) => (
                                        <Link href={item.href} key={item.href}>
                                            <DropdownMenuItem
                                                className={cn(
                                                    "cursor-pointer transition-colors",
                                                    pathname === item.href
                                                        ? "bg-accent text-accent-foreground"
                                                        : "text-muted-foreground hover:text-foreground focus:text-foreground focus:bg-accent/50"
                                                )}
                                            >
                                                <item.icon className="mr-3 h-4 w-4" />
                                                <span>{item.label}</span>
                                            </DropdownMenuItem>
                                        </Link>
                                    ))}
                                </DropdownMenuContent>
                            )}
                        </DropdownMenu>
                    </div>

                    {/* Settings Section */}
                    <div>
                        <DropdownMenu>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-between h-12 rounded-lg transition-all duration-200 group",
                                                isSettingsRoute
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                                !sidebarOpen && "justify-center px-3"
                                            )}
                                            onClick={() => setOpenSection(openSection === 'settings' ? null : 'settings')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Settings className="h-5 w-5 flex-shrink-0" />
                                                {sidebarOpen && <span>Ajustes</span>}
                                            </div>
                                            {sidebarOpen && (
                                                <ChevronRight className={cn(
                                                    "h-4 w-4 transition-transform duration-200",
                                                    openSection === 'settings' && "rotate-90"
                                                )} />
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                {!sidebarOpen && (
                                    <TooltipContent side="right" sideOffset={10}>
                                        <p>Ajustes</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>

                            {sidebarOpen && (
                                <DropdownMenuContent
                                    side="right"
                                    align="start"
                                    sideOffset={5}
                                    className="w-64 bg-popover border-border"
                                >
                                    <DropdownMenuLabel className="text-foreground">Ajustes y Herramientas</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-border" />
                                    {settingsNavItems.map((item) => (
                                        <Link href={item.href} key={item.href}>
                                            <DropdownMenuItem
                                                className={cn(
                                                    "cursor-pointer transition-colors",
                                                    pathname === item.href
                                                        ? "bg-accent text-accent-foreground"
                                                        : "text-muted-foreground hover:text-foreground focus:text-foreground focus:bg-accent/50"
                                                )}
                                            >
                                                <item.icon className="mr-3 h-4 w-4" />
                                                <span>{item.label}</span>
                                            </DropdownMenuItem>
                                        </Link>
                                    ))}
                                </DropdownMenuContent>
                            )}
                        </DropdownMenu>
                    </div>
                </nav>
            </div>

            {/* User Profile Section */}
            <div className="p-4 border-t border-border">
                {userProfile && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full items-center gap-3 p-2 rounded-lg transition-colors",
                                    sidebarOpen ? "justify-start" : "justify-center",
                                    "hover:bg-muted/50"
                                )}
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage
                                        src={`https://i.pravatar.cc/150?u=${userProfile.uid}`}
                                        alt={userProfile.name}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                        {getInitials(userProfile.name)}
                                    </AvatarFallback>
                                </Avatar>
                                {sidebarOpen && (
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-foreground">{userProfile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {userProfile.role === 'Admin' ? 'Administrador' : userProfile.role}
                                        </p>
                                    </div>
                                )}
                                {sidebarOpen && (
                                    <LogOut className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-64 bg-popover border-border"
                            align={sidebarOpen ? "end" : "center"}
                            side={sidebarOpen ? "top" : "right"}
                            sideOffset={10}
                        >
                            <DropdownMenuLabel className="text-foreground">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{userProfile.name}</p>
                                    <p className="text-xs text-muted-foreground">{userProfile.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                                onClick={signOut}
                                className="text-muted-foreground hover:text-foreground focus:text-foreground cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Cerrar Sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Collapse/Expand Button for Mobile */}
                {!sidebarOpen && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(true)}
                        className="w-full mt-2 p-2 rounded-lg hover:bg-muted/50"
                    >
                        <Menu className="h-5 w-5 text-muted-foreground" />
                    </Button>
                )}
            </div>
            </aside>
        </TooltipProvider>
    );
}