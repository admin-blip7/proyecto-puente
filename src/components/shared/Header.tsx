"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, StoreIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const { userProfile, signOut } = useAuth();
  const pathname = usePathname();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 z-10 shadow-sm">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <StoreIcon className="h-6 w-6 text-primary" />
        <span className="font-headline text-lg">Storefront Swift</span>
      </Link>
      <nav className="ml-6 flex items-center gap-4 text-sm font-medium">
        {userProfile?.role === 'Admin' && (
          <Link href="/admin" className={cn("text-muted-foreground transition-colors hover:text-foreground", pathname.startsWith('/admin') && "text-foreground")}>
            Admin Panel
          </Link>
        )}
      </nav>
      <div className="ml-auto flex items-center gap-4">
        {userProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://i.pravatar.cc/150?u=${userProfile.uid}`} alt={userProfile.name} />
                  <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userProfile.role === 'Admin' && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
