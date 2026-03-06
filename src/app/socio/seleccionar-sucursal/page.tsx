"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { useBranch } from "@/contexts/BranchContext";
import { BranchSelectorDialog } from "@/components/branches/BranchSelectorDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SeleccionarSucursalPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const { availableBranches, selectedBranch, setBranch, isLoading } = useBranch();
  const [dialogOpen, setDialogOpen] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!userProfile) {
      router.push("/tienda/login");
      return;
    }

    if (userProfile.role !== "Socio") {
      router.push("/pos");
      return;
    }

    if (availableBranches.length === 1) {
      void setBranch(availableBranches[0]).then(() => router.push("/socio/dashboard"));
      return;
    }

    // Permite cambiar de sucursal manualmente aunque ya exista una sucursal activa.
    // Solo forzamos redirect cuando la cuenta realmente no requiere selección.
    if (selectedBranch && availableBranches.length <= 1) {
      router.push("/socio/dashboard");
    }
  }, [loading, userProfile, availableBranches, selectedBranch, setBranch, router]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando sucursales...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Selección de sucursal
          </CardTitle>
          <CardDescription>
            Debes seleccionar una sucursal para continuar operando en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sucursales disponibles: {availableBranches.length}
          </p>
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            Elegir sucursal
          </Button>
        </CardContent>
      </Card>

      {userProfile?.partnerId && (
        <BranchSelectorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          partnerId={userProfile.partnerId}
          branches={availableBranches}
          selectedBranchId={selectedBranch?.id ?? null}
          onBranchSelect={(branch) => {
            void setBranch(branch).then(() => router.push("/socio/dashboard"));
          }}
        />
      )}
    </div>
  );
}
