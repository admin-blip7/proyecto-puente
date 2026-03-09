"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { saveWhatsAppSettings } from "@/app/admin/settings/actions/saveWhatsAppSettings";
import { Info, Loader2 } from "lucide-react";

const WhatsAppSettingsSchema = z.object({
    whatsappNumber: z
        .string()
        .regex(/^\+[1-9]\d{7,14}$/, "Formato internacional requerido, ej: +5215512345678")
        .or(z.literal("")),
    whatsappApikey: z.string().optional(),
});

interface BranchWhatsApp {
    id: string;
    name: string;
    whatsapp_number: string | null;
    whatsapp_apikey: string | null;
}

interface Props {
    initialBranches: BranchWhatsApp[];
}

interface BranchFormState {
    number: string;
    apikey: string;
    numberError: string;
    saving: boolean;
}

export default function NotificacionesSettingsClient({ initialBranches }: Props) {
    const { toast } = useToast();

    const [formStates, setFormStates] = useState<Record<string, BranchFormState>>(() => {
        const initial: Record<string, BranchFormState> = {};
        for (const branch of initialBranches) {
            initial[branch.id] = {
                number: branch.whatsapp_number ?? "",
                apikey: branch.whatsapp_apikey ?? "",
                numberError: "",
                saving: false,
            };
        }
        return initial;
    });

    const updateField = (branchId: string, field: keyof BranchFormState, value: string) => {
        setFormStates((prev) => ({
            ...prev,
            [branchId]: { ...prev[branchId], [field]: value },
        }));
    };

    const handleSave = async (branch: BranchWhatsApp) => {
        const state = formStates[branch.id];

        // Validate
        const parsed = WhatsAppSettingsSchema.safeParse({
            whatsappNumber: state.number,
            whatsappApikey: state.apikey,
        });

        if (!parsed.success) {
            const numberIssue = parsed.error.issues.find((i) =>
                i.path.includes("whatsappNumber")
            );
            setFormStates((prev) => ({
                ...prev,
                [branch.id]: {
                    ...prev[branch.id],
                    numberError: numberIssue?.message ?? "Número inválido",
                },
            }));
            return;
        }

        setFormStates((prev) => ({
            ...prev,
            [branch.id]: { ...prev[branch.id], numberError: "", saving: true },
        }));

        try {
            const result = await saveWhatsAppSettings(
                branch.id,
                state.number,
                state.apikey
            );

            if (result.ok) {
                toast({
                    title: "Guardado",
                    description: `Configuración de ${branch.name} actualizada.`,
                });
            } else {
                toast({
                    title: "Error al guardar",
                    description: result.error ?? "Error desconocido",
                    variant: "destructive",
                });
            }
        } finally {
            setFormStates((prev) => ({
                ...prev,
                [branch.id]: { ...prev[branch.id], saving: false },
            }));
        }
    };

    if (initialBranches.length === 0) {
        return (
            <div className="text-sm text-muted-foreground">
                No hay sucursales configuradas.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {initialBranches.map((branch) => {
                const state = formStates[branch.id];
                return (
                    <Card key={branch.id}>
                        <CardHeader>
                            <CardTitle>{branch.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    <p className="font-medium mb-2">
                                        Instrucciones para activar Callmebot:
                                    </p>
                                    <ol className="list-decimal list-inside space-y-1 text-sm">
                                        <li>
                                            En WhatsApp, agrega{" "}
                                            <span className="font-mono">+34 644 65 21 69</span> como
                                            contacto &quot;CallMeBot&quot;
                                        </li>
                                        <li>
                                            Envía el mensaje:{" "}
                                            <span className="font-mono italic">
                                                I allow callmebot to send me messages
                                            </span>
                                        </li>
                                        <li>Recibirás tu API Key en respuesta</li>
                                        <li>
                                            Pega tu número y API Key en el formulario de abajo
                                        </li>
                                    </ol>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label htmlFor={`number-${branch.id}`}>
                                    Número WhatsApp (formato internacional)
                                </Label>
                                <Input
                                    id={`number-${branch.id}`}
                                    placeholder="+521XXXXXXXXXX"
                                    value={state.number}
                                    onChange={(e) =>
                                        updateField(branch.id, "number", e.target.value)
                                    }
                                />
                                {state.numberError && (
                                    <p className="text-sm text-destructive">{state.numberError}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor={`apikey-${branch.id}`}>
                                    API Key de Callmebot
                                </Label>
                                <Input
                                    id={`apikey-${branch.id}`}
                                    placeholder="ej: 1234567"
                                    value={state.apikey}
                                    onChange={(e) =>
                                        updateField(branch.id, "apikey", e.target.value)
                                    }
                                />
                            </div>

                            <Button
                                onClick={() => handleSave(branch)}
                                disabled={state.saving}
                            >
                                {state.saving && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Guardar
                            </Button>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
