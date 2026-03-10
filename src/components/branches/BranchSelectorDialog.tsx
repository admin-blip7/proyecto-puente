"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Branch } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BranchCard } from "@/components/branches/BranchCard";

interface BranchSelectorDialogProps {
  open: boolean;
  partnerId: string;
  branches: Branch[];
  selectedBranchId?: string | null;
  onOpenChange: (open: boolean) => void;
  onBranchSelect: (branch: Branch) => void;
}

export function BranchSelectorDialog({
  open,
  partnerId,
  branches,
  selectedBranchId,
  onOpenChange,
  onBranchSelect,
}: BranchSelectorDialogProps) {
  const [query, setQuery] = useState("");

  const filteredBranches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return branches;

    return branches.filter((branch) => {
      const haystack = `${branch.name} ${branch.city ?? ""} ${branch.state ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [branches, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seleccionar sucursal</DialogTitle>
          <DialogDescription>
            Partner activo: {partnerId}. Elige la sucursal que usarás para esta sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            placeholder="Buscar por nombre o ciudad"
          />
        </div>

        <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
          {filteredBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              isSelected={branch.id === selectedBranchId}
              onSelect={onBranchSelect}
            />
          ))}

          {filteredBranches.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay sucursales que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
