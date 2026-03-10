"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks";
import { useBranch } from "@/contexts/BranchContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, ArrowLeft } from "lucide-react";

export default function SeleccionarSucursalPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const { availableBranches, selectedBranch, setBranch, isLoading, reloadBranches } = useBranch();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!userProfile) {
      router.replace("/login");
    }
  }, [loading, userProfile, router]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando sucursales...</p>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  const handleSelectBranch = async (branchId: string) => {
    const branch = availableBranches.find((item) => item.id === branchId);
    if (!branch) return;

    setSelectingId(branchId);
    try {
      await setBranch(branch);
      router.push("/socio/dashboard");
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/socio/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="p-2 rounded-full bg-blue-100 text-blue-700">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seleccionar sucursal</h1>
          <p className="text-sm text-muted-foreground">Cambia la sucursal activa para esta sesión.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sucursal actual</CardTitle>
          <CardDescription>
            Cuenta: <span className="font-medium">{userProfile.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedBranch ? (
            <Badge className="bg-blue-600 text-white hover:bg-blue-700">{selectedBranch.name}</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">No hay sucursal seleccionada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sucursales disponibles</CardTitle>
          <CardDescription>Selecciona una para continuar operando en POS y módulos administrativos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {availableBranches.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No encontramos sucursales disponibles para tu usuario.
              </p>
              <Button variant="outline" onClick={() => void reloadBranches()}>
                Reintentar carga
              </Button>
            </div>
          ) : (
            availableBranches.map((branch) => {
              const isActive = selectedBranch?.id === branch.id;
              const isWorking = selectingId === branch.id;
              return (
                <div key={branch.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{branch.name}</span>
                    {isActive && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Activa
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isActive ? "secondary" : "default"}
                    disabled={isWorking}
                    onClick={() => void handleSelectBranch(branch.id)}
                  >
                    {isWorking ? "Aplicando..." : isActive ? "Seleccionada" : "Usar esta"}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
