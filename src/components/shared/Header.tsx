"use client";

import { useAuth } from "@/lib/hooks";
import { format } from "date-fns";
import { Input } from "../ui/input";
import { Search } from "lucide-react";

export function Header() {
  const { userProfile } = useAuth();

  return (
    <header className="flex h-16 items-start md:items-center justify-between z-10 md:pl-0 pl-10">
      <div>
        <p className="text-muted-foreground">{format(new Date(), 'MMMM dd, yyyy')}</p>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Storefront Swift</h1>
      </div>
       <div className="relative w-full max-w-xs sm:max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search Here"
              className="pl-10 text-base bg-card rounded-full"
            />
        </div>
    </header>
  );
}
