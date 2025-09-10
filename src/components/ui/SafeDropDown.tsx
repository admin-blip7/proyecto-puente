"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { Button } from "./button";


export function SafeDropDown() {
  const [isOpen, setIsOpen] = useState(false);

  // Lógica de Cierre Diferido para evitar el "race condition" en WebKit.
  const handleSelect = () => {
    queueMicrotask(() => {
      setIsOpen(false);
    });
  };

  return (
    // Usamos ClientOnly para evitar mismatches de SSR.
    <ClientOnly>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button>
            Abrir Menú Seguro
          </Button>
        </DropdownMenuTrigger>

        {/* shadcn/ui's DropdownMenuContent ya usa un Portal por defecto */}
        <DropdownMenuContent
          sideOffset={5}
          className="bg-white p-2 rounded-lg shadow-lg border"
        >
          <DropdownMenuItem
            onSelect={handleSelect}
            className="px-4 py-2 hover:bg-gray-100 rounded-md cursor-pointer"
          >
            Opción 1
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleSelect}
            className="px-4 py-2 hover:bg-gray-100 rounded-md cursor-pointer"
          >
            Opción 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleSelect}
            className="px-4 py-2 hover:bg-gray-100 rounded-md cursor-pointer"
          >
            Opción 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ClientOnly>
  );
}
