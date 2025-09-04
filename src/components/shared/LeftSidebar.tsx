"use client";
import Link from 'next/link';
import { Home, Settings, PieChart, ShieldCheck, Wrench, PackagePlus, Users, Landmark, BrainCircuit } from 'lucide-react';
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
  

const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/admin', icon: PieChart, label: 'Admin Panel'},
    { href: '/admin/sales', icon: PieChart, label: 'History' },
    { href: '/admin/warranties', icon: ShieldCheck, label: 'Warranties' },
    { href: '/admin/repairs', icon: Wrench, label: 'Repairs' },
    { href: '/admin/stock-entry', icon: PackagePlus, label: 'Stock Entry'},
    { href: '/admin/consignors', icon: Users, label: 'Consignors'},
    { href: '/admin/finance', icon: Landmark, label: 'Finance'},
    { href: '/admin/intelligence', icon: BrainCircuit, label: 'Intelligence'},
    { href: '/admin/settings', icon: Settings, label: 'Settings'},
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

    return (
        <aside className="flex flex-col items-center justify-between w-full md:w-20 bg-card p-4 h-full md:shadow-2xl">
            <div className="flex flex-col items-center gap-8">
                <Link href="/">
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                        <Users className="h-6 w-6" />
                    </div>
                </Link>
                <nav className="flex flex-col items-center gap-4">
                    {navItems.map((item) => (
                        <Link href={item.href} key={item.label}>
                            <Button variant="ghost" size="icon" className={cn(
                                "rounded-lg w-12 h-12",
                                pathname === item.href && 'bg-primary/10 text-primary',
                            )}>
                                <item.icon className="h-6 w-6" />
                            </Button>
                        </Link>
                    ))}
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
        </aside>
    )
}
