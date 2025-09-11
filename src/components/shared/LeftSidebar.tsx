"use client";
import Link from 'next/link';
import { Home, Settings, PieChart, ShieldCheck, Wrench, PackagePlus, Users, Landmark, BrainCircuit, Banknote, Building, Scale } from 'lucide-react';
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
    { href: '/admin', icon: PackagePlus, label: 'Inventario'},
    { href: '/admin/sales', icon: PieChart, label: 'Ventas' },
    { href: '/admin/repairs', icon: Wrench, label: 'Reparaciones' },
    { href: '/admin/warranties', icon: ShieldCheck, label: 'Garantías' },
    { href: '/admin/stock-entry', icon: PackagePlus, label: 'Ingresar Stock'},
    { href: '/admin/consignors', icon: Users, label: 'Consignadores'},
    { href: '/admin/intelligence', icon: BrainCircuit, label: 'Inteligencia'},
    { href: '/admin/settings', icon: Settings, label: 'Ajustes'},
];

const financeNavItems = [
    { href: '/admin/finance/accounts', icon: Banknote, label: 'Cuentas' },
    { href: '/admin/finance/balance-sheet', icon: Scale, label: 'Balance General' },
    { href: '/admin/finance/assets', icon: Building, label: 'Activos Fijos' },
    { href: '/admin/finance/categories', icon: PieChart, label: 'Categorías Gastos' },
    { href: '/admin/finance/cash-history', icon: Landmark, label: 'Cortes de Caja' },
]

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
        <aside className="flex flex-col items-center justify-between w-full md:w-20 bg-card p-4 h-full md:shadow-2xl">
            <TooltipProvider>
                <div className="flex flex-col items-center gap-8">
                    <Link href="/">
                        <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                            <Landmark className="h-6 w-6" />
                        </div>
                    </Link>
                    <nav className="flex flex-col items-center gap-4">
                        {mainNavItems.map((item) => (
                            <Tooltip key={item.label}>
                                <TooltipTrigger asChild>
                                    <Link href={item.href}>
                                        <Button variant="ghost" size="icon" className={cn(
                                            "rounded-lg w-12 h-12",
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
                         <Collapsible>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="icon" className={cn(
                                            "rounded-lg w-12 h-12",
                                            isFinanceRoute && 'bg-primary/10 text-primary',
                                        )}>
                                            <Landmark className="h-6 w-6" />
                                        </Button>
                                    </CollapsibleTrigger>
                                </TooltipTrigger>
                                 <TooltipContent side="right" sideOffset={5}>
                                    <p>Finanzas</p>
                                </TooltipContent>
                            </Tooltip>
                            <CollapsibleContent>
                               <div className="flex flex-col items-center gap-2 mt-2">
                                {financeNavItems.map(item => (
                                     <Tooltip key={item.label}>
                                        <TooltipTrigger asChild>
                                            <Link href={item.href}>
                                                <Button variant="ghost" size="icon" className={cn(
                                                    "rounded-lg w-10 h-10",
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
                    </nav>
                </div>
                <div className="flex flex-col items-center gap-4">
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
