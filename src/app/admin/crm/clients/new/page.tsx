"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, User } from "lucide-react";
import CRMClientForm from "@/components/admin/crm/CRMClientForm";
import { CRMClient } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function NewCRMClientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(true);

    const handleClientSaved = (client: CRMClient) => {
        // Verificar que el cliente exista y tenga ID
        if (!client || !client.id) {
            console.error('Client saved but missing ID:', client);
            toast({
                title: "Error",
                description: "El cliente se guardó pero falta el ID. Por favor, recarga la página.",
                variant: "destructive"
            });
            return;
        }

        toast({
            title: "Cliente creado",
            description: "El cliente ha sido creado correctamente."
        });
        router.push(`/admin/crm/clients/${client.id}`);
    };

    const handleBack = () => {
        router.push("/admin/crm");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al CRM
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
                    <p className="text-muted-foreground">
                        Registra un nuevo cliente en el sistema CRM
                    </p>
                </div>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Información del Cliente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CRMClientForm
                        isOpen={isFormOpen}
                        onOpenChange={setIsFormOpen}
                        onClientSaved={handleClientSaved}
                    />
                </CardContent>
            </Card>
        </div>
    );
}