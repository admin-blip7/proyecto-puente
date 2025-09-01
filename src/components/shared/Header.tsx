"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, Menu, StoreIcon, X, History } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Separator } from "../ui/separator";

export function Header() {
  const { userProfile, signOut } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const navLinks =
    userProfile?.role === "Admin" ? (
      <>
        <Link
            href="/admin"
            className={cn(
            "text-muted-foreground transition-colors hover:text-foreground",
            pathname === "/admin" && "text-foreground"
            )}
            onClick={() => setMobileMenuOpen(false)}
        >
            Inventario
        </Link>
        <Link
            href="/admin/sales"
            className={cn(
            "text-muted-foreground transition-colors hover:text-foreground",
            pathname.startsWith("/admin/sales") && "text-foreground"
            )}
            onClick={() => setMobileMenuOpen(false)}
        >
            Historial de Ventas
        </Link>
      </>
    ) : null;

  return (
    <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 z-10 shadow-sm">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <StoreIcon className="h-6 w-6 text-primary" />
        <span className="font-headline text-lg">Storefront Swift</span>
      </Link>
      
      {/* Desktop Navigation */}
      <nav className="ml-6 hidden md:flex items-center gap-6 text-sm font-medium">
        {navLinks}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Desktop User Menu */}
        <div className="hidden md:block">
          {userProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10">
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
                {userProfile.role === "Admin" && (
                  <>
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Inventario</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/sales">
                      <History className="mr-2 h-4 w-4" />
                      <span>Historial de Ventas</span>
                    </Link>
                  </DropdownMenuItem>
                  </>
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

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="flex items-center gap-2 font-semibold">
                  <StoreIcon className="h-6 w-6 text-primary" />
                  <span className="font-headline text-lg">Storefront Swift</span>
                </SheetTitle>
              </SheetHeader>
              {userProfile && (
                <div className="p-4 flex items-center gap-4">
                   <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={`https://i.pravatar.cc/150?u=${userProfile.uid}`}
                      alt={userProfile.name}
                    />
                    <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                     <p className="text-base font-medium leading-none">
                      {userProfile.name}
                    </p>
                    <p className="text-sm leading-none text-muted-foreground">
                      {userProfile.email}
                    </p>
                  </div>
                </div>
              )}
               <Separator />
              <nav className="flex flex-col gap-4 p-4 text-lg">
                {navLinks}
                 <button onClick={signOut} className="flex items-center text-muted-foreground transition-colors hover:text-foreground">
                    <LogOut className="mr-2 h-5 w-5" />
                    <span>Cerrar Sesión</span>
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
