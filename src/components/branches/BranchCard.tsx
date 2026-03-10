"use client";

import { Building2, Star } from "lucide-react";
import type { Branch } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BranchCardProps {
  branch: Branch;
  isSelected?: boolean;
  onSelect: (branch: Branch) => void;
}

export function BranchCard({ branch, isSelected = false, onSelect }: BranchCardProps) {
  return (
    <Card
      className={cn(
        "border transition-colors",
        isSelected ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30" : "hover:border-blue-300"
      )}
    >
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-semibold">{branch.name}</p>
            {branch.isMain && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3" />
                Principal
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {[branch.city, branch.state].filter(Boolean).join(", ") || "Sin ubicación"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Stock total: {branch.stockCount ?? 0}
          </p>
        </div>

        <Button size="sm" onClick={() => onSelect(branch)} className="shrink-0" variant={isSelected ? "default" : "outline"}>
          {isSelected ? "Activa" : "Usar sucursal"}
        </Button>
      </CardContent>
    </Card>
  );
}
