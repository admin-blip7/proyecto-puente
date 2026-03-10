"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { saveNotificacionesSettings } from "@/app/admin/settings/actions/saveNotificacionesSettings";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANCH_TIME_ZONE_OPTIONS, sanitizeBranchTimeZone } from "@/lib/branchTimeZone";

const EmailSchema = z.object({
  email: z
    .string()
    .email("Ingresa un correo válido")
    .or(z.literal("")),
});

interface BranchNotificacion {
  id: string;
  name: string;
  notification_email: string | null;
  timezone: string;
}

interface Props {
  initialBranches: BranchNotificacion[];
}

interface BranchFormState {
  email: string;
  emailError: string;
  timezone: string;
  saving: boolean;
}

export default function NotificacionesSettingsClient({ initialBranches }: Props) {
  const { toast } = useToast();

  const [formStates, setFormStates] = useState<Record<string, BranchFormState>>(() => {
    const initial: Record<string, BranchFormState> = {};
    for (const branch of initialBranches) {
      initial[branch.id] = {
        email: branch.notification_email ?? "",
        emailError: "",
        timezone: sanitizeBranchTimeZone(branch.timezone),
        saving: false,
      };
    }
    return initial;
  });

  const handleSave = async (branch: BranchNotificacion) => {
    const state = formStates[branch.id];

    const parsed = EmailSchema.safeParse({ email: state.email });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setFormStates((prev) => ({
        ...prev,
        [branch.id]: { ...prev[branch.id], emailError: issue.message },
      }));
      return;
    }

    setFormStates((prev) => ({
      ...prev,
      [branch.id]: { ...prev[branch.id], emailError: "", saving: true },
    }));

    try {
      const result = await saveNotificacionesSettings(branch.id, state.email, state.timezone);
      if (result.ok) {
        toast({ title: "Guardado", description: `Configuración de ${branch.name} actualizada.` });
      } else {
        toast({ title: "Error al guardar", description: result.error ?? "Error desconocido", variant: "destructive" });
      }
    } finally {
      setFormStates((prev) => ({
        ...prev,
        [branch.id]: { ...prev[branch.id], saving: false },
      }));
    }
  };

  if (initialBranches.length === 0) {
    return <div className="text-sm text-muted-foreground">No hay sucursales configuradas.</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configura el correo que recibirá el resumen automático cada vez que se realice un corte de caja.
        Deja el campo vacío para desactivar las notificaciones de esa sucursal.
      </p>

      {initialBranches.map((branch) => {
        const state = formStates[branch.id];
        return (
          <Card key={branch.id}>
            <CardHeader>
              <CardTitle>{branch.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`email-${branch.id}`}>Correo de notificaciones</Label>
                <Input
                  id={`email-${branch.id}`}
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={state.email}
                  onChange={(e) =>
                    setFormStates((prev) => ({
                      ...prev,
                      [branch.id]: { ...prev[branch.id], email: e.target.value, emailError: "" },
                    }))
                  }
                />
                {state.emailError && (
                  <p className="text-sm text-destructive">{state.emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Zona horaria de la sucursal</Label>
                <Select
                  value={state.timezone}
                  onValueChange={(value) =>
                    setFormStates((prev) => ({
                      ...prev,
                      [branch.id]: { ...prev[branch.id], timezone: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCH_TIME_ZONE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  El historial y cortes de caja de esta sucursal usarán esta zona horaria.
                </p>
              </div>

              <Button onClick={() => handleSave(branch)} disabled={state.saving}>
                {state.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
