"use client";
import Link from 'next/link';
import { Home, Settings, PieChart, ShieldCheck, Wrench, PackagePlus, Users, Landmark, BrainCircuit, Banknote, Building, Scale, Package, ChevronDown } from 'lucide-react';
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "@/components/ui/collapsible";
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
  

const mainNavItems = [
    { href: '/', icon: Home, label: 'Punto de Venta' },
    { href: '/admin', icon: Package, label: 'Inventario'},
    { href: '/admin/stock-entry', icon: PackagePlus, label: 'Ingresar Stock'},
    { href: '/admin/sales', icon: PieChart, label: 'Ventas' },
    { href: '/admin/repairs', icon: Wrench, label: 'Reparaciones' },
    { href: '/admin/warranties', icon: ShieldCheck, label: 'Garantías' },
    { href: '/admin/consignors', icon: Users, label: 'Consignadores'},
    { href: '/admin/intelligence', icon: BrainCircuit, label: 'Inteligencia'},
];

const financeNavItems = [
    { href: '/admin/finance', icon: Landmark, label: 'Dashboard Financiero' },
    { href: '/admin/finance/accounts', icon: Banknote, label: 'Cuentas' },
    { href: '/admin/finance/balance-sheet', icon: Scale, label: 'Balance General' },
    { href: '/admin/finance/assets', icon: Building, label: 'Activos Fijos' },
    { href: '/admin/finance/categories', icon: PieChart, label: 'Categorías Gastos' },
    { href: '/admin/finance/cash-history', icon: Landmark, label: 'Cortes de Caja' },
]

const settingsNavItem = { href: '/admin/settings', icon: Settings, label: 'Ajustes' };


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

    return (
        <aside className="flex flex-col items-center justify-between w-full md:w-24 bg-card p-2 md:p-4 h-full md:shadow-2xl">
            <TooltipProvider>
                <div className="flex flex-col items-center gap-2 w-full">
                    <Link href="/">
                        <div className="bg-primary text-primary-foreground p-3 rounded-lg mb-4">
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
                         <Collapsible className="w-full">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="lg" className={cn(
                                            "rounded-lg w-full h-14 group",
                                            isFinanceRoute && 'bg-primary/10 text-primary',
                                        )}>
                                            <Landmark className="h-6 w-6" />
                                            <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 transition-transform group-data-[state=open]:rotate-180"/>
                                        </Button>
                                    </CollapsibleTrigger>
                                </TooltipTrigger>
                                 <TooltipContent side="right" sideOffset={5}>
                                    <p>Finanzas</p>
                                </TooltipContent>
                            </Tooltip>
                            <CollapsibleContent>
                               <div className="flex flex-col items-center gap-1 mt-2 pl-4">
                                {financeNavItems.map(item => (
                                     <Tooltip key={item.label}>
                                        <TooltipTrigger asChild>
                                            <Link href={item.href} className="w-full">
                                                <Button variant="ghost" size="icon" className={cn(
                                                    "rounded-full w-10 h-10",
                                                    pathname === item.href && 'bg-primary/20 text-primary',
                                                )}>
                                                    <item.icon className="h-5 w-5" />
                                                </Button>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" sideOffset={5}>
                                            <p>{item.label}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                               </div>
                            </CollapsibleContent>
                        </Collapsible>
                          <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href={settingsNavItem.href} className="w-full">
                                        <Button variant="ghost" size="lg" className={cn(
                                            "rounded-lg w-full h-14",
                                            pathname === settingsNavItem.href && 'bg-primary/10 text-primary',
                                        )}>
                                            <settingsNavItem.icon className="h-6 w-6" />
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={5}>
                                    <p>{settingsNavItem.label}</p>
                                </TooltipContent>
                            </Tooltip>
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
