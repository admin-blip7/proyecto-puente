"use client";
import Link from 'next/link';
import { Home, Settings, PieChart, ShieldCheck, Wrench, PackagePlus, Users, Landmark, BrainCircuit, Banknote, Building, Scale, Package, ChevronRight, CreditCard, Palette, Printer, Contact, Zap, ShoppingCart, Truck } from 'lucide-react';
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
import Image from 'next/image';
  

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
]

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
    const isFinanceRoute = pathname.startsWith('/admin/finance');
    const isSettingsRoute = pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/labels');
    const isAdmin = userProfile?.role === 'Admin';

    return (
        <aside className="flex flex-col items-center justify-between w-full md:w-24 bg-card p-2 md:p-4 h-full md:shadow-2xl">
            <TooltipProvider>
                <div className="flex flex-col items-center gap-2 w-full">
                    <Link href="/">
                        <div className="bg-primary text-primary-foreground p-3 rounded-lg mb-4 relative h-14 w-14 flex items-center justify-center">
                            <Landmark className="h-6 w-6" />
                        </div>
                    </Link>
                    <nav className="flex flex-col items-center gap-2 w-full">
                        {mainNavItems.map((item) => (
                            <Tooltip key={item.label}>
                                <TooltipTrigger asChild>
                                    <Link href={item.href} className="w-full">
                                        <Button variant="ghost" size="lg" className={cn(
                                            "rounded-lg w-full h-14",
                                            pathname === item.href && 'bg-primary/10 text-primary',
                                        )}>
                                            <item.icon className="h-6 w-6" />
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={5}>
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                         <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="lg" className={cn(
                                            "rounded-lg w-full h-14 relative",
                                            isFinanceRoute && 'bg-primary/10 text-primary',
                                        )}>
                                            <Landmark className="h-6 w-6" />
                                            <ChevronRight className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={5}>
                                    <p>Finanzas</p>
                                </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent side="right" align="start" sideOffset={5} className="w-56">
                                <DropdownMenuLabel>Módulo de Finanzas</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {financeNavItems.map(item => (
                                    <Link href={item.href} key={item.href} passHref>
                                        <DropdownMenuItem className={cn(pathname === item.href && "bg-accent")}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span>{item.label}</span>
                                        </DropdownMenuItem>
                                    </Link>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="lg" className={cn(
                                            "rounded-lg w-full h-14 relative",
                                            isSettingsRoute && 'bg-primary/10 text-primary',
                                        )}>
                                            <Settings className="h-6 w-6" />
                                            <ChevronRight className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={5}>
                                    <p>Ajustes</p>
                                </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent side="right" align="start" sideOffset={5} className="w-60">
                                <DropdownMenuLabel>Ajustes y Herramientas</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {settingsNavItems.map(item => (
                                    <Link href={item.href} key={item.href} passHref>
                                        <DropdownMenuItem className={cn(pathname === item.href && "bg-accent")}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span>{item.label}</span>
                                        </DropdownMenuItem>
                                    </Link>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </nav>
                </div>
                <div className="flex flex-col items-center gap-4 mt-auto">
                    {userProfile && (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                            variant="ghost"
                            className="relative h-12 w-12 rounded-full"
                            >
                            <Avatar className="h-12 w-12">
                                <AvatarImage
                                src={`https://i.pravatar.cc/150?u=${userProfile.uid}`}
                                alt={userProfile.name}
                                />
                                <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
                            </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                {userProfile.name}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground">
                                {userProfile.email}
                                </p>
                            </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={signOut}>
                                Cerrar Sesión
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </TooltipProvider>
        </aside>
    )
}
